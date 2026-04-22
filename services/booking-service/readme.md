# Booking Service

## Current Status

This service now implements the booking lifecycle boundary of the project.

Implemented endpoints:

- `GET /health`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{bookingId}`
- `POST /bookings/{bookingId}/decision`
- `POST /bookings/{bookingId}/cancellation`

The current implementation uses an in-memory repository for booking data and
coordinates with `room-service` and `schedule-service` through Docker Compose
service names from environment variables.

## Boundary

`booking-service` owns:

- create booking request
- store booking status
- enforce booking state transitions
- approve or reject booking
- cancel booking
- orchestrate calls to `room-service` and `schedule-service`

It does **not** own:

- room metadata as the source of truth
- availability as the source of truth
- reservation overlap logic as the source of truth

## Tech Stack

- Node.js 20 LTS
- TypeScript
- Express

## Run

```bash
docker compose up booking-service --build
```

## Host Access

- Health: `http://localhost:5003/health`
- Create booking: `http://localhost:5003/bookings`
- List bookings: `http://localhost:5003/bookings`

## Notes

- Container port: `5000`
- Host port: `5003`
- Future database ownership: `booking-db`
