import express from "express";

import {
  createRoomHandler,
  getRoomByIdHandler,
  listRoomsHandler,
  updateRoomHandler
} from "./routes/rooms";

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

app.listen(port, "0.0.0.0", () => {
  console.log(`room-service listening on port ${port}`);
});
