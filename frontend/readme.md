# Frontend

## Overview

Frontend duoc xay dung de demo end-to-end cho he thong dat phong hoc.
Tat ca API call deu di qua `gateway`, frontend khong goi truc tiep `room-service`,
`schedule-service` hay `booking-service`.

## Implemented Screens

- Dashboard tong quan va system status
- Tra cuu phong hoc voi bo loc
- Xem chi tiet phong va kiem tra availability
- Form gui booking
- Theo doi danh sach booking va chi tiet booking
- Khu vuc manager/admin de approve, reject, cancel

## Tech Stack

- Plain HTML
- Plain CSS
- Plain JavaScript
- Nginx

## Runtime Config

Frontend dung runtime variable:

- `FRONTEND_API_BASE_URL`

Mac dinh:

```text
http://localhost:8080
```

Frontend se goi:

- `${FRONTEND_API_BASE_URL}/health`
- `${FRONTEND_API_BASE_URL}/api/rooms`
- `${FRONTEND_API_BASE_URL}/api/schedules/...`
- `${FRONTEND_API_BASE_URL}/api/bookings`

## Run

```bash
docker compose up --build
```

Sau do mo:

```text
http://localhost:3000
```
