# Schedule Service

## Current Status

This service implements the schedule boundary of the project.

Implemented endpoints:

- `GET /health`
- `GET /schedules/availability`
- `POST /schedules/reservations`
- `DELETE /schedules/reservations/{reservationId}`

The current implementation uses an in-memory reservation repository so the
service is easy to run and demo inside Docker. The structure is ready to move
to `schedule-db` in a later step.

## Boundary

`schedule-service` owns:

- availability checks by `roomId + date + time range`
- reservation overlap prevention
- reserve slot
- release slot

It does **not** own:

- room metadata as the source of truth
- booking lifecycle decisions

## Tech Stack

- Node.js 20 LTS
- TypeScript
- Express

## Run

```bash
docker compose up schedule-service --build
```

## Host Access

- Health: `http://localhost:5002/health`
- Availability: `http://localhost:5002/schedules/availability`
- Reserve: `http://localhost:5002/schedules/reservations`

## Conflict Rule

Two reservations conflict when:

- they belong to the same `roomId`
- they are on the same `date`
- both are still in `RESERVED` state
- and their time ranges overlap using:
  - `existing.startTime < new.endTime`
  - `new.startTime < existing.endTime`

## Notes

- Container port: `5000`
- Host port: `5002`
- Future database ownership: `schedule-db`
