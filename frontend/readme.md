# Frontend

## Overview

Frontend là module giao diện của hệ thống microservices đặt phòng học. Module này cung cấp giao diện cho người dùng tra cứu phòng, kiểm tra lịch trống, gửi yêu cầu booking, theo dõi booking và xử lý approve/reject/cancel ở khu vực quản lý.

Frontend giao tiếp với backend thông qua **API Gateway**. Frontend không gọi trực tiếp `room-service`, `schedule-service` hoặc `booking-service`.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | Plain HTML/JavaScript |
| Styling | CSS, Bootstrap |
| Package Manager | Không sử dụng |
| Build Tool | Không sử dụng |
| Static Runtime | BusyBox httpd |

## Getting Started

```bash
# From project root
docker compose up frontend --build
```

Chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Sau khi chạy, mở giao diện tại:

```text
http://localhost:3000
```

## Project Structure

```text
frontend/
├── Dockerfile
├── readme.md
└── src/
    ├── index.html
    ├── app.js
    ├── styles.css
    └── config.js
```

## Environment Variables

Frontend hiện không sử dụng biến môi trường riêng. URL của API Gateway được cấu hình tĩnh trong `src/config.js`.

| Variable | Description | Default |
|----------|-------------|---------|
| Không sử dụng | Không có biến môi trường frontend | Không áp dụng |

## Gateway Configuration

File `src/config.js` khai báo URL gateway:

```js
window.__APP_CONFIG__ = {
  gatewayBaseUrl: "http://localhost:8080"
};
```

## Build for Production

Frontend hiện không dùng npm, Vite, Webpack hoặc bước build riêng. Khi chạy Docker, các file tĩnh trong `src/` được copy vào image và phục vụ bằng BusyBox httpd.

```bash
docker compose build frontend
```

## Notes

- Tất cả API call đều đi qua **API Gateway** tại `http://localhost:8080`.
- Frontend không gọi trực tiếp các backend service như `room-service`, `schedule-service`, `booking-service`.
- Các route API chính frontend đang gọi:
  - `http://localhost:8080/health`
  - `http://localhost:8080/api/rooms`
  - `http://localhost:8080/api/schedules/...`
  - `http://localhost:8080/api/bookings`
- Frontend được expose ra host tại port `3000`.
