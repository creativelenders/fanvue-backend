import { Pool } from "pg";

const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/fanvue" });

async function dropDb() {
  try {
    console.log("Dropping schema...");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("✅ Schema dropped successfully.");
  } catch (error) {
    console.error("❌ Failed to drop schema:", error);
  } finally {
    await pool.end();
  }
}

dropDb();
