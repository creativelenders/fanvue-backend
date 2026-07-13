import { Client } from "pg";
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT * FROM approval_items");
    console.log("Approvals:", res.rows);
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

run();
