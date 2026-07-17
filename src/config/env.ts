import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  // ── Server ──
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // ── Database ──
  DATABASE_URL: z.string().default("postgresql://localhost:5432/fanvue"),

  // ── JWT ──
  JWT_ACCESS_SECRET: z.string().min(32).default("dev-access-secret-min-32-chars!!"),
  JWT_REFRESH_SECRET: z.string().min(32).default("dev-refresh-secret-min-32-chars!"),

  // ── AI Providers ──
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
