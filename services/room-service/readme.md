# Room Service

## Tổng quan

`room-service` phụ trách miền nghiệp vụ quản lý thông tin phòng học trong hệ thống đặt phòng.

- Miền nghiệp vụ: quản lý thông tin phòng học.
- Dữ liệu sở hữu: mã định danh phòng, mã phòng, tên phòng, tòa nhà, tầng, sức chứa, trạng thái, thiết bị và mô tả.
- Thao tác cung cấp: xem danh sách phòng, xem chi tiết phòng, tạo phòng, cập nhật phòng và xác nhận phòng có tồn tại/đang hoạt động hay không.

Service này không quản lý vòng đời booking, kiểm tra lịch trống, giữ chỗ hoặc giải phóng slot. Các trách nhiệm đó thuộc về `booking-service` và `schedule-service`.

## Công nghệ sử dụng

| Thành phần | Lựa chọn |
|------------|----------|
| Ngôn ngữ | Node.js 20 LTS, TypeScript |
| Framework | Express |
| Cơ sở dữ liệu | PostgreSQL (`room-db`) |
| Driver cơ sở dữ liệu | pg |
| Container | Docker |

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra trạng thái service |
| GET | `/rooms` | Lấy danh sách phòng, có hỗ trợ bộ lọc |
| GET | `/rooms/{roomId}` | Lấy chi tiết một phòng |
| POST | `/rooms` | Tạo phòng mới |
| PUT | `/rooms/{roomId}` | Cập nhật thông tin phòng |

Đặc tả API đầy đủ: [`docs/api-specs/room-service.yaml`](../../docs/api-specs/room-service.yaml)

## Chạy cục bộ

```bash
# Chạy từ thư mục gốc project
docker compose up room-service --build

# Gọi trực tiếp service qua host
curl http://localhost:5001/health
curl http://localhost:5001/rooms

# Gọi thông qua gateway
curl http://localhost:8080/api/rooms
```

## Cấu trúc thư mục

```text
room-service/
├── Dockerfile
├── package.json
├── readme.md
├── tsconfig.json
└── src/
    ├── data/
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
| `ROOM_SERVICE_DB_URL` | Chuỗi kết nối PostgreSQL do room-service sở hữu | `postgresql://room_user:room_pass@room-db:5432/room_db` |
| `ROOM_DB_HOST` | Hostname của database phòng trong Docker Compose | `room-db` |
| `ROOM_DB_PORT` | Port database phòng trong Docker network | `5432` |

## Cơ sở dữ liệu

Khi khởi động, service tự tạo bảng `rooms` nếu chưa tồn tại và thêm dữ liệu phòng mẫu nếu các `roomId` mẫu chưa có trong database.
