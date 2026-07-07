import { db } from './src/db/client';
import { TokenService } from './src/utils/tokens';

async function test() {
  const user = await db.query.users.findFirst();
  const t = new TokenService();
  const tokens = await t.generateTokens({sub: user!.id, email: user!.email, role: 'admin', tier: 'elite'});
  
  const res = await fetch('http://localhost:3001/api/v1/workspaces', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + tokens.accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test WS', slug: 'test-ws-' + Date.now() })
  });
  console.log(res.status, await res.text());
  process.exit(0);
}
test();
