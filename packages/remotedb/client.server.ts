import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export const db = (env: { DATABASE_URL: string }) => {
  const client = postgres(env.DATABASE_URL, { prepare: false });
  return drizzle(client);
};
