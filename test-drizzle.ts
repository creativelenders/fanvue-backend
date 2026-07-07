import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './src/db/schema';
import * as relations from './src/db/schema/relations';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fanvue' });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

async function test() {
  try {
    // Triggers the schema build
    const q = await db.query.sessions.findFirst({
      with: { user: true }
    });
    console.log("Drizzle schema loaded successfully with relations!");
  } catch (e) {
    console.error("Drizzle schema error:", e);
  } finally {
    pool.end();
  }
}

test();
