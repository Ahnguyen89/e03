import express from "express";

import {
  checkAvailabilityHandler,
  createReservationHandler,
  releaseReservationHandler
} from "./routes/schedules";
import { initializeDatabase } from "./db";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.disable("x-powered-by");
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/schedules/availability", checkAvailabilityHandler);
app.post("/schedules/reservations", createReservationHandler);
app.delete("/schedules/reservations/:reservationId", releaseReservationHandler);

app.use((_req, res) => {
  res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found"
  });
});

async function start(): Promise<void> {
  await initializeDatabase();

  app.listen(port, "0.0.0.0", () => {
    console.log(`schedule-service listening on port ${port}`);
  });
}

void start().catch((error) => {
  console.error("schedule-service failed to start", error);
  process.exit(1);
});
