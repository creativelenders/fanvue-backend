// ============================================================
// Auth context extraction from request headers
// ============================================================
// Expects your auth middleware to set x-workspace-id, x-user-id, x-user-role

export interface AuthContext {
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

export function extractAuthContext(headers: Headers): AuthContext {
  const workspaceId = headers.get("x-workspace-id");
  const userId = headers.get("x-user-id");
  const role = headers.get("x-user-role") as AuthContext["role"] ?? "viewer";
  if (!workspaceId || !userId) throw new Error("Missing auth context");
  return { workspaceId, userId, role };
}
