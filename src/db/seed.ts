import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as relations from "./schema/relations";
import { users, workspaces, workspaceMembers, subscriptionPlans } from "./schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/fanvue" });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    const adminEmail = "creativelendersllc@gmail.com";
    const adminPassword = "Austinelisabeth77*";

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    console.log(`Seeding exact admin user: ${adminEmail}`);

    const [user] = await db.insert(users).values({
      email: adminEmail,
      displayName: "Admin",
      passwordHash: passwordHash,
      role: "admin",
      tier: "elite"
    }).returning();

    console.log("Creating default subscription plan...");
    const [plan] = await db.insert(subscriptionPlans).values({
      name: "Standard",
      slug: "standard",
      price: "0",
      aiGenerationsLimit: 100,
      seats: 1
    }).returning();

    console.log("Creating default workspace...");
    const [workspace] = await db.insert(workspaces).values({
      name: "My First Workspace",
      slug: "my-first-workspace-" + Date.now(),
    }).returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner"
    });

    await db.update(users).set({ defaultWorkspaceId: workspace.id }).where(eq(users.id, user.id));

    console.log("✅ Database seeded successfully with ONE admin user and default workspace!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
