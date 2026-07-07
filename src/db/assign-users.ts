import { db } from "./client";
import { users, workspaces, workspaceMembers } from "./schema";
import { eq, and } from "drizzle-orm";

async function run() {
  const allUsers = await db.query.users.findMany();
  const allWorkspaces = await db.query.workspaces.findMany();

  if (allWorkspaces.length === 0) {
    console.log("No workspaces found.");
    process.exit(0);
  }

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
      console.log(`Assigned user ${user.email} to workspace ${defaultWorkspace.name}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
