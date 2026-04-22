# API Gateway

## Current Status

Gateway da duoc hoan thien o muc toi thieu de lam single entry point cho frontend.
Gateway khong chua business logic, chi dinh tuyen va proxy request den 3 backend
services:

- `room-service`
- `schedule-service`
- `booking-service`

## Implemented Endpoints

- `GET /health`
- `/api/rooms...` -> `room-service`
- `/api/schedules...` -> `schedule-service`
- `/api/bookings...` -> `booking-service`

## Routing Rules

- Public routes luon di qua gateway voi prefix `/api`
- Gateway se bo prefix `/api` truoc khi forward vao backend
- Upstream duoc cau hinh bang environment variables:
  - `ROOM_SERVICE_URL`
  - `SCHEDULE_SERVICE_URL`
  - `BOOKING_SERVICE_URL`

Vi du:

- `GET /api/rooms` -> `GET /rooms`
- `GET /api/schedules/availability` -> `GET /schedules/availability`
- `POST /api/bookings` -> `POST /bookings`

## Tech Stack

- Node.js 20 LTS
- TypeScript
- Express

## Run

```bash
docker compose up gateway --build
```

## Notes

- Gateway nghe tren container port `8000`
- Docker Compose map ra host port `8080`
- Frontend ve sau chi duoc goi gateway, khong goi truc tiep backend services
- Gateway goi upstream bang Docker Compose service names, khong dung `localhost`
