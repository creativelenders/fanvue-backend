// @ts-nocheck
import type { FastifyRequest, FastifyReply } from "fastify";
import { TokenService } from "../utils/tokens";
import { UnauthorizedError } from "../utils/errors";

const tokenService = new TokenService();

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  try {
    const payload = tokenService.verifyAccessToken(token);

    // Attach user to request for downstream use
    request.user = {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
      workspaceId: request.headers["x-workspace-id"] as string | undefined,
    };
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}
