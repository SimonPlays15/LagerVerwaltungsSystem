import { defineConfig } from "drizzle-kit";
import dontenv from "dotenv";

dontenv.config({
    path: "./.env",
    quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
