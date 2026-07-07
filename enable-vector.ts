import { Pool } from "pg";

const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/fanvue" });

async function enableVector() {
  try {
    console.log("Enabling vector extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("✅ Vector extension enabled.");
  } catch (error) {
    console.error("❌ Failed to enable vector:", error);
  } finally {
    await pool.end();
  }
}

enableVector();
