import { Pool } from 'pg';
import 'dotenv/config';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const ws = await pool.query('SELECT id, name FROM workspaces');
  console.log('Workspaces:', ws.rows);
  const users = await pool.query('SELECT id, email, "defaultWorkspaceId" FROM users');
  console.log('Users:', users.rows);
  process.exit(0);
}
run();
