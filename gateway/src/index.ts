import express, { Request, Response } from "express";

const app = express();
const port = Number(process.env.PORT ?? 8000);

const roomServiceUrl = process.env.ROOM_SERVICE_URL ?? "http://room-service:5000";
const scheduleServiceUrl =
  process.env.SCHEDULE_SERVICE_URL ?? "http://schedule-service:5000";
const bookingServiceUrl =
  process.env.BOOKING_SERVICE_URL ?? "http://booking-service:5000";
const corsOrigin = process.env.GATEWAY_CORS_ORIGIN ?? "http://localhost:3000";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

app.disable("x-powered-by");
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

async function proxyRequest(req: Request, res: Response, upstreamBaseUrl: string) {
  try {
    const upstreamUrl = new URL(req.originalUrl.replace(/^\/api/, ""), upstreamBaseUrl);

    const headers: Record<string, string> = {};
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"];
    }

    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : JSON.stringify(req.body as JsonValue);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body
    });

    const responseContentType = upstreamResponse.headers.get("content-type");
    if (responseContentType) {
      res.setHeader("content-type", responseContentType);
    }

    res.status(upstreamResponse.status);

    if (upstreamResponse.status === 204) {
      res.end();
      return;
    }

    const responseText = await upstreamResponse.text();
    res.send(responseText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    res.status(502).json({
      code: "UPSTREAM_SERVICE_ERROR",
      message: "Gateway could not reach upstream service",
      details: {
        upstreamBaseUrl,
        error: message
      }
    });
  }
}

app.use("/api/rooms", (req, res) => {
  void proxyRequest(req, res, roomServiceUrl);
});

app.use("/api/schedules", (req, res) => {
  void proxyRequest(req, res, scheduleServiceUrl);
});

app.use("/api/bookings", (req, res) => {
  void proxyRequest(req, res, bookingServiceUrl);
});

app.use((_req, res) => {
  res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`gateway listening on port ${port}`);
});
