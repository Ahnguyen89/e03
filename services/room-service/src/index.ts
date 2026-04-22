import express from "express";

import {
  createRoomHandler,
  getRoomByIdHandler,
  listRoomsHandler,
  updateRoomHandler
} from "./routes/rooms";
import { initializeDatabase } from "./db";
import { roomRepository } from "./repositories/roomRepository";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.disable("x-powered-by");
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/rooms", listRoomsHandler);
app.get("/rooms/:roomId", getRoomByIdHandler);
app.post("/rooms", createRoomHandler);
app.put("/rooms/:roomId", updateRoomHandler);

app.use((_req, res) => {
  res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found"
  });
});

async function start(): Promise<void> {
  await initializeDatabase();
  await roomRepository.seedDefaults();

  app.listen(port, "0.0.0.0", () => {
    console.log(`room-service listening on port ${port}`);
  });
}

void start().catch((error) => {
  console.error("room-service failed to start", error);
  process.exit(1);
});
