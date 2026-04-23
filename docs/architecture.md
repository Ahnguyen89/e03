# Kiến trúc Hệ thống

> Tài liệu này được hoàn thiện **sau Phase 1 - Analysis & Design** và dùng để chuyển kết quả phân tích nghiệp vụ sang một kiến trúc triển khai cụ thể.
> Mục tiêu của kiến trúc là: **đúng nghiệp vụ, đủ chặt chẽ để bảo vệ khi nộp bài, dễ triển khai bằng Docker Compose, và phù hợp với nhóm 3 người bằng cách tách thành 3 service nghiệp vụ**.

**Tài liệu tham khảo:**

1. _Service-Oriented Architecture: Analysis and Design for Services and Microservices_ - Thomas Erl (2nd Edition)
2. _Microservices Patterns: With Examples in Java_ - Chris Richardson
3. _Bài tập - Phát triển phần mềm hướng dịch vụ_ - Hung Dang

---



## 1. Lựa chọn Pattern

### 1.1 Tiêu chí lựa chọn

Pattern được chọn theo các tiêu chí:

- bám đúng business process trong Phase 1
- tách đúng 3 service nghiệp vụ để chia cho 3 người
- dễ triển khai trên Docker Compose
- tránh các thành phần phức tạp không cần thiết
- dễ đối chiếu giữa tài liệu phân tích, kiến trúc, API spec và code

### 1.2 Bảng lựa chọn pattern

| Pattern                           | Chọn? | Suy ra từ bước phân tích nào                                               | Giải thích nghiệp vụ / kỹ thuật                                                                                                                        |
| --------------------------------- | ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API Gateway                       | Có    | Phase 1 - luồng tương tác client, `AGENTS.md`, `student-guide.md`          | Frontend không gọi trực tiếp backend service. Gateway là điểm vào duy nhất, giúp route request rõ ràng, dễ quản lý, dễ bảo vệ kiến trúc microservices. |
| Database per Service              | Có    | Phase 1 - NFR về Scalability, Availability, Consistency; `AGENTS.md`       | Mỗi service sở hữu dữ liệu riêng để tránh coupling, tăng tính độc lập và đúng tinh thần microservices.                                                 |
| Shared Database                   | Không | Mâu thuẫn với service ownership trong Phase 1 và ràng buộc của `AGENTS.md` | Nếu dùng chung database thì ranh giới service bị phá vỡ, khó chứng minh tính độc lập của từng service nghiệp vụ.                                       |
| Saga                              | Không | Phase 1 - luồng nghiệp vụ ngắn, ít bước, đồng bộ                           | Quy trình booking hiện tại đủ nhỏ để xử lý bằng REST đồng bộ. Dùng Saga sẽ làm giải pháp phức tạp quá mức cần thiết.                                   |
| Event-driven / Message Queue      | Không | Phase 1 - service composition chủ yếu theo request/response                | Chưa cần Kafka/RabbitMQ cho phạm vi bài tập. Bổ sung broker sẽ làm Docker Compose khó triển khai và khó demo hơn.                                      |
| CQRS                              | Không | Phase 1 - tải đọc/ghi thấp trong phạm vi đồ án                             | Chưa cần tách riêng read model / write model. Dùng REST đồng bộ sẽ dễ triển khai và dễ chấm hơn.                                                       |
| Circuit Breaker                   | Không | Phase 1 - hệ thống nhỏ, chạy nội bộ Docker Compose                         | Có thể hữu ích trong production lớn, nhưng không cần thiết cho bài tập triển khai cục bộ.                                                              |
| Service Registry / Discovery      | Không | Docker Compose đã cung cấp DNS nội bộ                                      | Các service gọi nhau trực tiếp bằng service names nên không cần Consul/Eureka.                                                                         |
| Synchronous REST giữa các service | Có    | Phase 1 - resource contracts, service composition, `docs/api-specs/*.yaml` | Đây là kiểu giao tiếp đơn giản nhất, dễ test nhất, dễ bám theo OpenAPI, và phù hợp với bài tập.                                                        |

### 1.3 Kết luận pattern

Kiến trúc được chọn là:

- `Frontend -> Gateway -> Backend Services`
- 3 backend service nghiệp vụ giao tiếp bằng **REST đồng bộ**
- mỗi service có **database riêng**
- không dùng broker, không dùng gRPC, không dùng registry

Đây là lựa chọn chặt chẽ nhất cho đồ án vì:

- đúng với phân tích nghiệp vụ
- đủ rõ để chia việc cho 3 người
- dễ code và dễ chạy bằng Docker
- ít rủi ro hơn các kiến trúc phức tạp

---

## 2. Thành phần Hệ thống

### 2.1 Danh sách thành phần triển khai

| Thành phần            | Trách nhiệm                                                                                                            | Công nghệ sử dụng                             | Port                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| **Frontend**          | Giao diện cho sinh viên và admin: tra cứu phòng, gửi booking, xem trạng thái, phê duyệt / từ chối / hủy                | HTML, CSS, JavaScript thuần, Bootstrap        | 3000                                 |
| **Gateway**           | Điểm vào duy nhất của hệ thống; route request từ frontend đến các backend service                                      | Nginx Reverse Proxy                           | 8080 bên ngoài, 8000 trong container |
| **Room Service**      | Quản lý thông tin phòng học: mã phòng, tên phòng, sức chứa, trạng thái hoạt động, thông tin mô tả phòng                | Node.js 20 LTS, TypeScript, Express, pg       | 5001 bên ngoài, 5000 trong container |
| **Schedule Service**  | Quản lý availability, reserve slot, release slot, chống trùng lịch ở mức tài nguyên thời gian                          | Node.js 20 LTS, TypeScript, Express, pg       | 5002 bên ngoài, 5000 trong container |
| **Booking Service**   | Quản lý yêu cầu booking, trạng thái booking, phê duyệt / từ chối / hủy, điều phối với room-service và schedule-service | Node.js 20 LTS, TypeScript, Express, pg       | 5003 bên ngoài, 5000 trong container |
| **Room Database**     | Lưu dữ liệu phòng do room-service sở hữu                                                                               | PostgreSQL 16 Alpine                          | 5432 nội bộ, 5433 bên ngoài          |
| **Schedule Database** | Lưu reservation / slot / availability do schedule-service sở hữu                                                       | PostgreSQL 16 Alpine                          | 5432 nội bộ, 5434 bên ngoài          |
| **Booking Database**  | Lưu booking request, trạng thái, quyết định xử lý do booking-service sở hữu                                            | PostgreSQL 16 Alpine                          | 5432 nội bộ, 5435 bên ngoài          |



## 3. Giao tiếp giữa các thành phần


###  Ma trận giao tiếp

| Từ \ Đến             | Frontend | Gateway | Room Service | Schedule Service | Booking Service | Room DB | Schedule DB | Booking DB |
| -------------------- | -------- | ------- | ------------ | ---------------- | --------------- | ------- | ----------- | ---------- |
| **Frontend**         | —        | REST    | —            | —                | —               | —       | —           | —          |
| **Gateway**          | —        | —       | REST         | REST             | REST            | —       | —           | —          |
| **Room Service**     | —        | —       | —            | —                | —               | TCP     | —           | —          |
| **Schedule Service** | —        | —       | —            | —                | —               | —       | TCP         | —          |
| **Booking Service**  | —        | —       | REST         | REST             | —               | —       | —           | TCP        |
| **Room DB**          | —        | —       | —            | —                | —               | —       | —           | —          |
| **Schedule DB**      | —        | —       | —            | —                | —               | —       | —           | —          |
| **Booking DB**       | —        | —       | —            | —                | —               | —       | —           | —          |

---

## 4. Sơ đồ Kiến trúc

### 4.1 Sơ đồ ngữ cảnh hệ thống

```mermaid
C4Context
    title System Context - Hệ thống Cho thuê Phòng học

    Person(student, "Sinh viên", "Gửi yêu cầu đặt phòng và theo dõi trạng thái booking")
    Person(admin, "Quản trị viên", "Phê duyệt, từ chối hoặc hủy booking")

    System(system, "Hệ thống Cho thuê Phòng học", "Hỗ trợ tra cứu phòng, đặt phòng, quản lý trạng thái booking và điều phối tài nguyên thời gian")

    Rel(student, system, "Sử dụng", "HTTPS")
    Rel(admin, system, "Sử dụng", "HTTPS")
```

### 4.2 Sơ đồ container triển khai

```mermaid
C4Container
    title Container Diagram - Hệ thống Cho thuê Phòng học

    Person(student, "Sinh viên")
    Person(admin, "Quản trị viên")

    Container_Boundary(sys, "Hệ thống Cho thuê Phòng học") {
        Container(fe, "Frontend", "HTML/CSS/JavaScript, Bootstrap, BusyBox httpd", "Hiển thị giao diện tra cứu phòng, tạo booking, xem trạng thái và thao tác admin. Port 3000")
        Container(gw, "Gateway", "Nginx Reverse Proxy", "Điểm vào duy nhất của hệ thống. Route request đến các backend service. Port 8080 bên ngoài, 8000 trong container")
        Container(room, "Room Service", "Node.js, TypeScript, Express, pg", "Quản lý dữ liệu phòng và GET /health. Port 5001 bên ngoài, 5000 trong container")
        Container(schedule, "Schedule Service", "Node.js, TypeScript, Express, pg", "Quản lý availability, reserve, release và GET /health. Port 5002 bên ngoài, 5000 trong container")
        Container(booking, "Booking Service", "Node.js, TypeScript, Express, pg", "Quản lý vòng đời booking và GET /health. Port 5003 bên ngoài, 5000 trong container")
        ContainerDb(roomdb, "Room Database", "PostgreSQL", "Lưu dữ liệu phòng do Room Service sở hữu")
        ContainerDb(scheduledb, "Schedule Database", "PostgreSQL", "Lưu reservation/slot do Schedule Service sở hữu")
        ContainerDb(bookingdb, "Booking Database", "PostgreSQL", "Lưu booking request và trạng thái do Booking Service sở hữu")
    }

    Rel(student, fe, "Sử dụng", "HTTP")
    Rel(admin, fe, "Sử dụng", "HTTP")
    Rel(fe, gw, "Gọi API", "HTTP/REST")
    Rel(gw, room, "Route request liên quan đến phòng", "HTTP/REST")
    Rel(gw, schedule, "Route request liên quan đến availability/reservation", "HTTP/REST")
    Rel(gw, booking, "Route request liên quan đến booking", "HTTP/REST")
    Rel(booking, room, "Kiểm tra phòng tồn tại và active", "HTTP/REST")
    Rel(booking, schedule, "Kiểm tra availability / reserve / release", "HTTP/REST")
    Rel(room, roomdb, "Đọc/Ghi", "TCP")
    Rel(schedule, scheduledb, "Đọc/Ghi", "TCP")
    Rel(booking, bookingdb, "Đọc/Ghi", "TCP")
```

### 4.3 Sơ đồ luồng nghiệp vụ qua các service

```mermaid
sequenceDiagram
    participant U as Sinh viên/Admin
    participant FE as Frontend
    participant GW as Gateway
    participant BS as Booking Service
    participant RS as Room Service
    participant SS as Schedule Service

    U->>FE: Thao tác trên giao diện
    FE->>GW: HTTP request

    alt Tra cứu phòng
        GW->>RS: GET /rooms hoặc GET /rooms/{roomId}
        RS-->>GW: Dữ liệu phòng
        GW-->>FE: Response
    else Tạo booking
        GW->>BS: POST /bookings
        BS->>RS: Kiểm tra room tồn tại và active
        RS-->>BS: Hợp lệ / không hợp lệ
        BS->>SS: Tiền kiểm availability
        SS-->>BS: Available / unavailable
        BS-->>GW: Tạo PENDING hoặc trả lỗi
        GW-->>FE: Response
    else Phê duyệt booking
        GW->>BS: POST /bookings/{bookingId}/decision
        BS->>SS: Reserve slot
        SS-->>BS: reservationId hoặc conflict
        BS-->>GW: APPROVED / REJECTED / lỗi
        GW-->>FE: Response
    else Hủy booking
        GW->>BS: POST /bookings/{bookingId}/cancellation
        BS->>SS: Release slot nếu booking đang APPROVED
        SS-->>BS: Kết quả release
        BS-->>GW: CANCELLED hoặc lỗi
        GW-->>FE: Response
    end
```

---

## 5. Triển khai

Toàn bộ hệ thống được triển khai bằng Docker Compose:

- mỗi thành phần chạy trong container riêng
- các container giao tiếp qua Docker network nội bộ
- toàn hệ thống khởi động bằng:

```bash
docker compose up --build
```

