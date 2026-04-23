# API Gateway

## Overview

API Gateway là điểm vào duy nhất cho mọi request từ frontend. Gateway nhận request từ client, xử lý CORS, bỏ prefix `/api` khi cần và định tuyến request đến đúng backend microservice.

Gateway trong dự án này được triển khai bằng Nginx Reverse Proxy và không chứa business logic.

## Responsibilities

- **Request routing**: chuyển request đến đúng service nghiệp vụ.
- **CORS handling**: cho phép frontend gọi API qua gateway.
- **Path transformation**: bỏ prefix `/api` trước khi forward request vào backend service.
- **Reverse proxy headers**: thêm các header như `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- **Health check**: cung cấp `GET /health` để kiểm tra gateway đang hoạt động.

Các trách nhiệm chưa triển khai trong phạm vi bài này:

- **Load balancing**: chưa cần vì mỗi service chỉ có một container.
- **Authentication**: chưa triển khai xác thực token/credential.
- **Rate limiting**: chưa triển khai giới hạn số request.
- **Request/Response transformation nâng cao**: chưa thay đổi body response/request, chỉ xử lý path và header proxy cơ bản.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Approach | Nginx Reverse Proxy |

## Routing Table

| External Path | Target Service | Internal URL |
|---------------|----------------|--------------|
| `/health` | Gateway | Trả trực tiếp `{"status":"ok"}` |
| `/api/rooms/*` | `room-service` | `http://room-service:5000/rooms/*` |
| `/api/schedules/*` | `schedule-service` | `http://schedule-service:5000/schedules/*` |
| `/api/bookings/*` | `booking-service` | `http://booking-service:5000/bookings/*` |


## Running

```bash
# From project root
docker compose up gateway --build
```

Chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Kiểm tra gateway:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/rooms
```

## Configuration

Gateway sử dụng Docker Compose networking. Các backend service được truy cập bằng service names được định nghĩa trong `docker-compose.yml`:

- `room-service`
- `schedule-service`
- `booking-service`

Trong `gateway/nginx.conf`, gateway dùng Docker DNS resolver:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;
```

Cách này giúp Nginx resolve upstream service name trong Docker network và tránh phụ thuộc vào `localhost`.

## Notes

- Gateway expose port `8080` ra host và listen port `8000` bên trong container.
- Frontend chỉ gọi gateway, không gọi trực tiếp các backend service.
- Gateway gọi upstream bằng Docker Compose service names, không dùng `localhost`.
- Gateway không truy cập database.
- Gateway không được tính là service nghiệp vụ.
