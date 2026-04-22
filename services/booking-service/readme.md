# Booking Service

## Tổng quan

`booking-service` phụ trách miền nghiệp vụ vòng đời yêu cầu đặt phòng trong hệ thống.

- Miền nghiệp vụ: xử lý yêu cầu booking phòng học.
- Dữ liệu sở hữu: mã booking, thông tin người gửi, mã phòng tham chiếu, ngày giờ yêu cầu, mục đích sử dụng, trạng thái, thông tin duyệt/từ chối, thông tin hủy, mã reservation tham chiếu và thời gian tạo/cập nhật.
- Thao tác cung cấp: tạo booking, xem danh sách booking, xem chi tiết booking, duyệt/từ chối booking và hủy booking.

Service này điều phối lời gọi đến `room-service` và `schedule-service`, nhưng không sở hữu dữ liệu phòng gốc hoặc quy tắc chống trùng lịch.

## Công nghệ sử dụng

| Thành phần | Lựa chọn |
|------------|----------|
| Ngôn ngữ | Node.js 20 LTS, TypeScript |
| Framework | Express |
| Cơ sở dữ liệu | PostgreSQL (`booking-db`) |
| Driver cơ sở dữ liệu | pg |
| Container | Docker |

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra trạng thái service |
| POST | `/bookings` | Tạo booking mới ở trạng thái `PENDING` |
| GET | `/bookings` | Lấy danh sách booking, có hỗ trợ bộ lọc |
| GET | `/bookings/{bookingId}` | Lấy chi tiết một booking |
| POST | `/bookings/{bookingId}/decision` | Duyệt hoặc từ chối booking đang chờ xử lý |
| POST | `/bookings/{bookingId}/cancellation` | Hủy booking theo đúng quy tắc nghiệp vụ |

Đặc tả API đầy đủ: [`docs/api-specs/booking-service.yaml`](../../docs/api-specs/booking-service.yaml)

## Chạy cục bộ

```bash
# Chạy từ thư mục gốc project
docker compose up booking-service --build

# Gọi trực tiếp service qua host
curl http://localhost:5003/health
curl http://localhost:5003/bookings

# Gọi thông qua gateway
curl http://localhost:8080/api/bookings
```

## Cấu trúc thư mục

```text
booking-service/
├── Dockerfile
├── package.json
├── readme.md
├── tsconfig.json
└── src/
    ├── clients/
    ├── http/
    ├── models/
    ├── repositories/
    ├── routes/
    ├── db.ts
    └── index.ts
```

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `PORT` | Port của service bên trong container | `5000` |
| `NODE_ENV` | Môi trường chạy ứng dụng | `development` |
| `BOOKING_SERVICE_DB_URL` | Chuỗi kết nối PostgreSQL do booking-service sở hữu | `postgresql://booking_user:booking_pass@booking-db:5432/booking_db` |
| `BOOKING_DB_HOST` | Hostname của database booking trong Docker Compose | `booking-db` |
| `BOOKING_DB_PORT` | Port database booking trong Docker network | `5432` |
| `ROOM_SERVICE_URL` | URL nội bộ dùng để gọi room-service | `http://room-service:5000` |
| `SCHEDULE_SERVICE_URL` | URL nội bộ dùng để gọi schedule-service | `http://schedule-service:5000` |

## Quy tắc nghiệp vụ

- Booking mới luôn được tạo ở trạng thái `PENDING`.
- `APPROVE` chỉ hợp lệ với booking `PENDING` và phải giữ slot thành công ở `schedule-service`.
- `REJECT` chỉ hợp lệ với booking `PENDING`.
- Sinh viên chỉ được hủy booking của chính mình khi booking còn `PENDING`.
- Admin được hủy booking ở trạng thái `PENDING` hoặc `APPROVED`.
- Khi hủy booking `APPROVED`, hệ thống phải giải phóng reservation ở `schedule-service`.
