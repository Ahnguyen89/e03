import express from "express";

import {
  cancelBookingHandler,
  createBookingHandler,
  decideBookingHandler,
  getBookingByIdHandler,
  listBookingsHandler
} from "./routes/bookings";
import { initializeDatabase } from "./db";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.disable("x-powered-by");
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/bookings", createBookingHandler);
app.get("/bookings", listBookingsHandler);
app.get("/bookings/:bookingId", getBookingByIdHandler);
app.post("/bookings/:bookingId/decision", decideBookingHandler);
app.post("/bookings/:bookingId/cancellation", cancelBookingHandler);

app.use((_req, res) => {
  res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found"
  });
});

async function start(): Promise<void> {
  await initializeDatabase();

  app.listen(port, "0.0.0.0", () => {
    console.log(`booking-service listening on port ${port}`);
  });
}

void start().catch((error) => {
  console.error("booking-service failed to start", error);
  process.exit(1);
});
