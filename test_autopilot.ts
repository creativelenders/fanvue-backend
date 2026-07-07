import { db } from './src/db/client';
import { users, workspaces } from './src/db/schema';
import { TokenService } from './src/utils/tokens';

async function test() {
  const user = await db.query.users.findFirst();
  const ws = await db.query.workspaces.findFirst();
  const t = new TokenService();
  const tokens = await t.generateTokens({sub: user!.id, email: user!.email, role: 'admin', tier: 'elite'});
  
  const res = await fetch('http://localhost:3001/api/v1/workspaces/'+ws!.id+'/autopilot', {
    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
  });
  console.log(res.status, await res.text());
  process.exit(0);
}
test();
