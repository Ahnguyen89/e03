import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.ROOM_SERVICE_DB_URL
});

export async function initializeDatabase(): Promise<void> {
  await waitForDatabase();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL UNIQUE,
      room_name TEXT NOT NULL,
      building TEXT NOT NULL,
      floor INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL,
      equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT
    )
  `);
}

async function waitForDatabase(): Promise<void> {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
