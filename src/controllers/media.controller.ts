import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { mediaItems } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import util from "util";
import { pipeline } from "stream";

const pump = util.promisify(pipeline);

export class MediaController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = (request as any).workspaceId;
    
    const media = await db.query.mediaItems.findMany({
      where: eq(mediaItems.workspaceId, workspaceId),
      orderBy: [desc(mediaItems.createdAt)]
    });

    return reply.status(200).send({ success: true, data: media });
  }

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = (request as any).workspaceId;
    const userId = request.user!.sub;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: "No file uploaded" });
    }

    const filename = `${Date.now()}-${data.filename}`;
    const uploadPath = path.join(process.cwd(), "public", "uploads", filename);
    const fileUrl = `/uploads/${filename}`;

    await pump(data.file, fs.createWriteStream(uploadPath));

    let fileType = "document";
    if (data.mimetype.startsWith("image/")) fileType = "image";
    else if (data.mimetype.startsWith("video/")) fileType = "video";
    else if (data.mimetype.startsWith("audio/")) fileType = "audio";

    const [media] = await db.insert(mediaItems).values({
      workspaceId,
      userId,
      url: fileUrl,
      type: fileType,
      title: data.filename,
      mimeType: data.mimetype,
    }).returning();

    return reply.status(200).send({ success: true, data: media });
  }
}
