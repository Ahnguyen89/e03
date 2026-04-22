import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.BOOKING_SERVICE_DB_URL
});

export async function initializeDatabase(): Promise<void> {
  await waitForDatabase();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      attendee_count INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose_detail TEXT,
      status TEXT NOT NULL,
      reviewed_by TEXT,
      review_note TEXT,
      rejection_reason TEXT,
      cancellation_reason TEXT,
      reservation_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_filters
    ON bookings (status, date, requester_id, requester_email, room_id)
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
