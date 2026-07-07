import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import { chatterShifts, shiftSchedules, users } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";

export class TeamController {
  // ── Shifts ──
  async startShift(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const chatterId = (req as any).user?.id; // Assumes auth middleware sets user
    
    if (!chatterId) return reply.status(401).send({ success: false, error: "Unauthorized" });

    const [shift] = await db.insert(chatterShifts).values({
      workspaceId,
      chatterId,
      startedAt: new Date()
    }).returning();
    
    return reply.status(201).send({ success: true, data: shift });
  }

  async endShift(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    
    const [updated] = await db.update(chatterShifts)
      .set({ endedAt: new Date() })
      .where(and(eq(chatterShifts.id, id), eq(chatterShifts.workspaceId, workspaceId)))
      .returning();

    return reply.send({ success: true, data: updated });
  }

  async listShifts(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const shifts = await db.query.chatterShifts.findMany({
      where: eq(chatterShifts.workspaceId, workspaceId),
      orderBy: [desc(chatterShifts.startedAt)],
      with: {
        chatter: true // Needs relation in schema, but for now we'll send raw data
      }
    }).catch(async () => {
      // Fallback if 'chatter' relation isn't explicitly defined in Drizzle schema
      return await db.select({
        id: chatterShifts.id,
        startedAt: chatterShifts.startedAt,
        endedAt: chatterShifts.endedAt,
        totalMessages: chatterShifts.totalMessages,
        totalPpvSent: chatterShifts.totalPpvSent,
        revenue: chatterShifts.revenue,
        chatterName: users.displayName,
      })
      .from(chatterShifts)
      .leftJoin(users, eq(chatterShifts.chatterId, users.id))
      .where(eq(chatterShifts.workspaceId, workspaceId))
      .orderBy(desc(chatterShifts.startedAt));
    });

    return reply.send({ success: true, data: shifts });
  }
  
  async getLeaderboard(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    
    // Simplistic leaderboard based on shifts
    const shifts = await db.select({
      chatterId: chatterShifts.chatterId,
      name: users.displayName,
      totalRevenue: chatterShifts.revenue,
      totalMessages: chatterShifts.totalMessages
    })
    .from(chatterShifts)
    .leftJoin(users, eq(chatterShifts.chatterId, users.id))
    .where(eq(chatterShifts.workspaceId, workspaceId));

    // Aggregate manually
    const aggregated: Record<string, any> = {};
    for (const s of shifts) {
      if (!s.chatterId) continue;
      if (!aggregated[s.chatterId]) {
        aggregated[s.chatterId] = { 
          chatterId: s.chatterId, 
          chatterName: s.name || "Unknown", 
          revenue: 0, 
          messages: 0,
          ppvSent: 0,
          conversionRate: 0,
          avgResponseTime: 0,
          shifts: 0
        };
      }
      aggregated[s.chatterId].revenue += Number(s.totalRevenue || 0);
      aggregated[s.chatterId].messages += Number(s.totalMessages || 0);
      aggregated[s.chatterId].shifts += 1;
    }

    const leaderboard = Object.values(aggregated).sort((a: any, b: any) => b.revenue - a.revenue);

    return reply.send({ success: true, data: leaderboard });
  }

  // ── Schedules ──
  async createSchedule(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const { userId, dayOfWeek, startTime, endTime } = req.body as any;

    const [schedule] = await db.insert(shiftSchedules).values({
      workspaceId,
      userId: userId || (req as any).user?.id,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime
    }).returning();

    return reply.status(201).send({ success: true, data: schedule });
  }

  async listSchedules(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const schedules = await db.select({
      id: shiftSchedules.id,
      dayOfWeek: shiftSchedules.dayOfWeek,
      startTime: shiftSchedules.startTime,
      endTime: shiftSchedules.endTime,
      user: {
        id: users.id,
        name: users.displayName,
        email: users.email
      }
    })
    .from(shiftSchedules)
    .leftJoin(users, eq(shiftSchedules.userId, users.id))
    .where(eq(shiftSchedules.workspaceId, workspaceId));

    return reply.send({ success: true, data: schedules });
  }

  async getCoverage(req: FastifyRequest, reply: FastifyReply) {
    // Return empty for now to satisfy the API
    return reply.send({ success: true, data: [] });
  }
}
