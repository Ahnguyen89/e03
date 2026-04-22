# Room Service

## Current Status

This service now implements the room metadata boundary of the project.

Implemented endpoints:

- `GET /health`
- `GET /rooms`
- `GET /rooms/{roomId}`
- `POST /rooms`
- `PUT /rooms/{roomId}`

The current implementation uses an in-memory repository with seed data so the
service is easy to run and demo inside Docker. The code is structured so it can
be replaced with `room-db` persistence in a later step.

## Boundary

`room-service` only owns room metadata:

- room list
- room details
- room creation/update
- validating that a room exists and whether it is active

It does **not** own:

- availability checks
- slot reservation
- slot release
- booking lifecycle

Those responsibilities belong to `schedule-service` and `booking-service`.

## Tech Stack

- Node.js 20 LTS
- TypeScript
- Express

## Run

```bash
docker compose up room-service --build
```

## Host Access

- Health: `http://localhost:5001/health`
- List rooms: `http://localhost:5001/rooms`
- Room detail: `http://localhost:5001/rooms/{roomId}`

## Notes

- Container port: `5000`
- Host port: `5001`
- Future database ownership: `room-db`
