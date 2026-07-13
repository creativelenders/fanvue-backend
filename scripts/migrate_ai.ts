import { Client } from "pg";
import fs from "fs";
import path from "path";
import "dotenv/config";

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found in environment");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Database...");
    await client.connect();

    const sqlFiles = [
      "001_initial_platform.sql",
      "002_content_rating_mab_elo.sql",
      "003_ppv_price_bandits.sql",
      "004_content_curator_staking.sql",
      "005_perpetual_referrals.sql",
      "006_webhook_events.sql"
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, "../../ai-platform/infra/migrations", file);
      if (fs.existsSync(filePath)) {
        console.log(`Applying ${file}...`);
        const sql = fs.readFileSync(filePath, "utf-8");
        await client.query(sql);
        console.log(`✅ ${file} applied successfully.`);
      }
    }

    console.log("All AI platform migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
