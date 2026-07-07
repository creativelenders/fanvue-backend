import "dotenv/config";
import { buildApp } from "./app";

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`
┌──────────────────────────────────────────┐
│ 🚀 FanVue Growth Platform API            │
│ 📡 http://${host}:${port}                    │
│ 📊 Environment: ${process.env.NODE_ENV || "development"}  │
│ 📚 API Docs: http://${host}:${port}/docs      │
└──────────────────────────────────────────┘`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
