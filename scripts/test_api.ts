import crypto from "crypto";

const AI_API_URL = "http://localhost:8000";
const AI_AUTH_SECRET = "fanvue_super_secret_auth_key_123";

function generateAuthHeaders(method: string, path: string, workspaceId: string, userId: string, role: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const canonical = `${timestamp}.${method}.${path}.${workspaceId}.${userId}.${role}`;
  const signature = crypto.createHmac("sha256", AI_AUTH_SECRET).update(canonical).digest("hex");
  return {
    "x-workspace-id": workspaceId,
    "x-user-id": userId,
    "x-user-role": role,
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
    "Content-Type": "application/json"
  };
}

async function testApi() {
  const workspaceId = "3af39644-6d79-4384-842d-3f141bd63919";
  const userId = "demo_operator";
  const role = "owner";

  const paths = ["/platform/campaigns", "/platform/media/jobs", "/platform/approvals", "/platform/dashboard"];

  for (const path of paths) {
    const headers = generateAuthHeaders("GET", path, workspaceId, userId, role);
    const res = await fetch(`${AI_API_URL}${path}`, { headers });
    const text = await res.text();
    console.log(`\nGET ${path} -> ${res.status}`);
    console.log(text);
  }
}

testApi();
