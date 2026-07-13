const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await client.connect();
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log("Database wiped and vector extension created successfully!");
  } catch (e) {
    console.error("Failed to wipe database:", e.message);
  } finally {
    await client.end();
  }
}
run();
