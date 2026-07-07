import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as relations from "./schema/relations";
import { users, workspaces, workspaceMembers, subscriptionPlans } from "./schema";
import { eq, and } from "drizzle-orm";

const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/fanvue" });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

async function run() {
  console.log("Fixing database state...");
  
  const plans = await db.query.subscriptionPlans.findMany();
  if (plans.length === 0) {
    console.log("Seeding default subscription plan...");
    await db.insert(subscriptionPlans).values({
      slug: "standard",
      name: "Standard",
      price: "0.00",
      aiGenerationsLimit: 1000,
    });
  }

  const allUsers = await db.query.users.findMany();
  const allWorkspaces = await db.query.workspaces.findMany();

  if (allWorkspaces.length > 0) {
    const defaultWorkspace = allWorkspaces[0];
    for (const user of allUsers) {
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.userId, user.id),
          eq(workspaceMembers.workspaceId, defaultWorkspace.id)
        )
      });

      if (!isMember) {
        await db.insert(workspaceMembers).values({
          workspaceId: defaultWorkspace.id,
          userId: user.id,
          role: "owner"
        });
        console.log(`Assigned ${user.email} to workspace ${defaultWorkspace.name}`);
      }
    }
  }

  console.log("Database state fixed!");
  await pool.end();
  process.exit(0);
}

run().catch(console.error);
