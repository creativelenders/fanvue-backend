const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:PCZbrTClbCzhMLhJcCgwECGtzuIKlnmw@hayabusa.proxy.rlwy.net:29359/railway" });

async function run() {
  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log("Vector extension created successfully!");
  } catch (e) {
    console.error("Failed to create vector extension:", e.message);
  } finally {
    await client.end();
  }
}
run();
