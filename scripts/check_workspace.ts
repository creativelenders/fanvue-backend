import { Client } from "pg";
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT * FROM workspaces WHERE id = '45b70463-3493-464c-a655-6b66f92e21af'");
    console.log("Workspace found:", res.rowCount > 0);
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

run();
