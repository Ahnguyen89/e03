# Schedule Service

## Tổng quan

`schedule-service` phụ trách miền nghiệp vụ lịch sử dụng phòng và reservation.

- Miền nghiệp vụ: quản lý khả dụng của phòng và giữ chỗ theo khung thời gian.
- Dữ liệu sở hữu: mã reservation, mã booking, mã phòng, ngày, giờ bắt đầu, giờ kết thúc, trạng thái reservation và thời điểm tạo.
- Thao tác cung cấp: kiểm tra phòng còn trống hay không, giữ slot cho booking đã duyệt và giải phóng slot đã giữ.

Service này không sở hữu dữ liệu phòng gốc và không quyết định vòng đời booking. Service này chỉ là nguồn sự thật cho dữ liệu slot đã giữ hoặc đã giải phóng.

## Công nghệ sử dụng

| Thành phần | Lựa chọn |
|------------|----------|
| Ngôn ngữ | Node.js 20 LTS, TypeScript |
| Framework | Express |
| Cơ sở dữ liệu | PostgreSQL (`schedule-db`) |
| Driver cơ sở dữ liệu | pg |
| Container | Docker |

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra trạng thái service |
| GET | `/schedules/availability` | Kiểm tra phòng còn trống theo ngày và khung giờ |
| POST | `/schedules/reservations` | Giữ slot phòng cho booking đã được duyệt |
| DELETE | `/schedules/reservations/{reservationId}` | Giải phóng slot đã giữ |

Đặc tả API đầy đủ: [`docs/api-specs/schedule-service.yaml`](../../docs/api-specs/schedule-service.yaml)

## Chạy cục bộ

```bash
# Chạy từ thư mục gốc project
docker compose up schedule-service --build

# Gọi trực tiếp service qua host
curl http://localhost:5002/health
curl "http://localhost:5002/schedules/availability?roomId=ROOM-A101&date=2026-05-01&startTime=09:00&endTime=10:00"

# Gọi thông qua gateway
curl "http://localhost:8080/api/schedules/availability?roomId=ROOM-A101&date=2026-05-01&startTime=09:00&endTime=10:00"
```

## Cấu trúc thư mục

```text
schedule-service/
├── Dockerfile
├── package.json
├── readme.md
├── tsconfig.json
└── src/
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
| `SCHEDULE_SERVICE_DB_URL` | Chuỗi kết nối PostgreSQL do schedule-service sở hữu | `postgresql://schedule_user:schedule_pass@schedule-db:5432/schedule_db` |
| `SCHEDULE_DB_HOST` | Hostname của database lịch trong Docker Compose | `schedule-db` |
| `SCHEDULE_DB_PORT` | Port database lịch trong Docker network | `5432` |

## Quy tắc chống trùng lịch

Hai reservation bị xem là trùng lịch khi cùng `roomId`, cùng `date`, đều đang ở trạng thái `RESERVED` và khoảng thời gian giao nhau:

```text
existing.startTime < new.endTime
new.startTime < existing.endTime
```
