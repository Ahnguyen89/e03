(function () {
  const config = window.__APP_CONFIG__ || {};
  const gatewayBaseUrl = String(config.gatewayBaseUrl || "http://localhost:8080").replace(
    /\/$/,
    ""
  );

  const state = {
    roomCatalog: [],
    visibleRooms: [],
    bookingCatalog: [],
    visibleBookings: [],
    selectedRoomId: null,
    selectedBookingId: null,
    roomFilters: {},
    bookingFilters: {},
    gatewayHealthy: false
  };

  const elements = {
    gatewayStatusDot: document.getElementById("gateway-status-dot"),
    gatewayStatusText: document.getElementById("gateway-status-text"),
    gatewayStatusDetail: document.getElementById("gateway-status-detail"),
    roomsCount: document.getElementById("rooms-count"),
    roomsActiveSummary: document.getElementById("rooms-active-summary"),
    pendingCount: document.getElementById("pending-count"),
    approvedCount: document.getElementById("approved-count"),
    lastSync: document.getElementById("last-sync"),
    roomFilterForm: document.getElementById("room-filter-form"),
    roomFeedback: document.getElementById("room-feedback"),
    roomList: document.getElementById("room-list"),
    roomDetail: document.getElementById("room-detail"),
    availabilityForm: document.getElementById("availability-form"),
    availabilityResult: document.getElementById("availability-result"),
    refreshRoomsButton: document.getElementById("refresh-rooms-button"),
    bookingRoomSelect: document.getElementById("booking-room-select"),
    bookingForm: document.getElementById("booking-form"),
    bookingFormFeedback: document.getElementById("booking-form-feedback"),
    bookingFilterForm: document.getElementById("booking-filter-form"),
    bookingListFeedback: document.getElementById("booking-list-feedback"),
    bookingList: document.getElementById("booking-list"),
    bookingDetail: document.getElementById("booking-detail"),
    refreshBookingsButton: document.getElementById("refresh-bookings-button"),
    managerQueue: document.getElementById("manager-queue"),
    managerSelectedSummary: document.getElementById("manager-selected-summary"),
    decisionForm: document.getElementById("decision-form"),
    rejectButton: document.getElementById("reject-button"),
    cancelForm: document.getElementById("cancel-form"),
    managerFeedback: document.getElementById("manager-feedback"),
    toast: document.getElementById("toast")
  };

  let toastTimer = null;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function statusClass(status) {
    const normalized = String(status || "").toUpperCase();

    switch (normalized) {
      case "PENDING":
        return "pending";
      case "ACTIVE":
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
        case "CANCELLED":
        case "INACTIVE":
          return "cancelled";
        default:
          return "";
      }
  }

  function renderStatusBadge(status) {
    return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`;
  }

  function formatDateTime(dateString) {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short"
      });
    } catch (_error) {
      return dateString;
    }
  }

  function formatTimeRange(booking) {
    return `${booking.date} · ${booking.startTime} - ${booking.endTime}`;
  }

  function buildQuery(params) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, rawValue]) => {
      if (rawValue === undefined || rawValue === null || rawValue === "") {
        return;
      }

      if (Array.isArray(rawValue)) {
        rawValue.forEach((value) => query.append(key, String(value)));
        return;
      }

      query.set(key, String(rawValue));
    });

    return query.toString();
  }

  async function apiRequest(path, options = {}) {
    const { query, ...fetchOptions } = options;
    const url = `${gatewayBaseUrl}${path}${query ? `?${buildQuery(query)}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {})
      },
      ...fetchOptions
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  function setGatewayStatus(healthy, detail) {
    state.gatewayHealthy = healthy;
    elements.gatewayStatusDot.className = `status-dot ${healthy ? "success" : "danger"}`;
    elements.gatewayStatusText.textContent = healthy
      ? "Gateway đang hoạt động ổn định"
      : "Gateway hoặc backend đang lỗi kết nối";
    elements.gatewayStatusDetail.textContent = detail;
  }

  function updateMetrics() {
    const totalRooms = state.roomCatalog.length;
    const activeRooms = state.roomCatalog.filter((room) => room.status === "active").length;
    const pendingCount = state.bookingCatalog.filter((booking) => booking.status === "PENDING").length;
    const approvedCount = state.bookingCatalog.filter(
      (booking) => booking.status === "APPROVED"
    ).length;

    elements.roomsCount.textContent = String(totalRooms);
    elements.roomsActiveSummary.textContent =
      totalRooms > 0
        ? `${activeRooms} phòng active / ${totalRooms} phòng tổng`
        : "Chưa có dữ liệu phòng";
    elements.pendingCount.textContent = String(pendingCount);
    elements.approvedCount.textContent = String(approvedCount);
    elements.lastSync.textContent = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function findSelectedRoom() {
    return state.roomCatalog.find((room) => room.roomId === state.selectedRoomId) || null;
  }

  function findSelectedBooking() {
    return state.bookingCatalog.find((booking) => booking.bookingId === state.selectedBookingId) || null;
  }

  function setFeedback(element, message, tone = "info") {
    element.textContent = message;
    element.className = `feedback ${tone}`;
  }

  function showToast(message, tone = "success") {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${tone}`;

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      elements.toast.className = "toast hidden";
    }, 2800);
  }

  function populateRoomSelect() {
    const currentValue = elements.bookingRoomSelect.value;
    const activeRooms = state.roomCatalog.filter((room) => room.status === "active");

    elements.bookingRoomSelect.innerHTML = activeRooms
      .map(
        (room) =>
          `<option value="${escapeHtml(room.roomId)}">${escapeHtml(room.roomName)} · ${escapeHtml(
            room.building
          )} · ${room.capacity} chỗ</option>`
      )
      .join("");

    if (state.selectedRoomId && activeRooms.some((room) => room.roomId === state.selectedRoomId)) {
      elements.bookingRoomSelect.value = state.selectedRoomId;
      return;
    }

    if (currentValue && activeRooms.some((room) => room.roomId === currentValue)) {
      elements.bookingRoomSelect.value = currentValue;
      return;
    }
  }

  function renderRoomDetail() {
    const room = findSelectedRoom();

    if (!room) {
      elements.roomDetail.innerHTML = `<div class="detail-empty">Chưa chọn phòng nào để xem chi tiết.</div>`;
      return;
    }

    elements.roomDetail.innerHTML = `
      <article class="detail-card">
        <div class="room-card-header">
          <div>
            <span class="label">${escapeHtml(room.roomCode)}</span>
            <h5>${escapeHtml(room.roomName)}</h5>
          </div>
          ${renderStatusBadge(room.status.toUpperCase())}
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span>Tòa nhà</span>
            <strong>${escapeHtml(room.building)}</strong>
          </div>
          <div class="detail-item">
            <span>Tầng</span>
            <strong>${room.floor}</strong>
          </div>
          <div class="detail-item">
            <span>Sức chứa</span>
            <strong>${room.capacity} người</strong>
          </div>
          <div class="detail-item">
            <span>Mã phòng</span>
            <strong>${escapeHtml(room.roomId)}</strong>
          </div>
        </div>
        <p class="muted">${escapeHtml(room.description || "Chưa có mô tả chi tiết.")}</p>
        <div class="equipment-list">
          ${(room.equipment || [])
            .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
            .join("")}
        </div>
      </article>
    `;
  }

  function renderRooms() {
    if (!state.visibleRooms.length) {
      elements.roomList.innerHTML = `<div class="empty-state">Không có phòng nào phù hợp với bộ lọc hiện tại.</div>`;
      return;
    }

    elements.roomList.innerHTML = state.visibleRooms
      .map((room) => {
        const selected = room.roomId === state.selectedRoomId ? "selected" : "";
        return `
          <article class="room-card ${selected}" data-room-id="${escapeHtml(room.roomId)}">
            <div class="room-card-header">
              <div>
                <span class="label">${escapeHtml(room.roomCode)}</span>
                <h5>${escapeHtml(room.roomName)}</h5>
              </div>
              ${renderStatusBadge(room.status.toUpperCase())}
            </div>
            <div class="room-meta">
              <div class="meta-line"><span>Tòa nhà</span><strong>${escapeHtml(room.building)}</strong></div>
              <div class="meta-line"><span>Tầng</span><strong>${room.floor}</strong></div>
              <div class="meta-line"><span>Sức chứa</span><strong>${room.capacity} người</strong></div>
            </div>
            <div class="equipment-list">
              ${(room.equipment || [])
                .slice(0, 4)
                .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
                .join("")}
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(elements.roomList.querySelectorAll("[data-room-id]")).forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedRoomId = card.getAttribute("data-room-id");
        renderRooms();
        renderRoomDetail();
        populateRoomSelect();
      });
    });
  }

  function renderBookingDetail() {
    const booking = findSelectedBooking();

    if (!booking) {
      elements.bookingDetail.innerHTML = `<div class="detail-empty">Chưa có booking nào được chọn.</div>`;
      return;
    }

    elements.bookingDetail.innerHTML = `
      <article class="detail-card">
        <div class="booking-card-header">
          <div>
            <span class="label">${escapeHtml(booking.bookingId)}</span>
            <h5>${escapeHtml(booking.requesterName)} · ${escapeHtml(booking.roomId)}</h5>
          </div>
          ${renderStatusBadge(booking.status)}
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span>Người gửi</span><strong>${escapeHtml(
            booking.requesterId
          )}</strong></div>
          <div class="detail-item"><span>Email</span><strong>${escapeHtml(
            booking.requesterEmail
          )}</strong></div>
          <div class="detail-item"><span>Khung giờ</span><strong>${escapeHtml(
            formatTimeRange(booking)
          )}</strong></div>
          <div class="detail-item"><span>Số người</span><strong>${booking.attendeeCount}</strong></div>
          <div class="detail-item"><span>Người duyệt</span><strong>${escapeHtml(
            booking.reviewedBy || "Chưa có"
          )}</strong></div>
          <div class="detail-item"><span>Reservation</span><strong>${escapeHtml(
            booking.reservationId || "Chưa có"
          )}</strong></div>
          <div class="detail-item"><span>Tạo lúc</span><strong>${escapeHtml(
            formatDateTime(booking.createdAt)
          )}</strong></div>
          <div class="detail-item"><span>Cập nhật</span><strong>${escapeHtml(
            booking.updatedAt ? formatDateTime(booking.updatedAt) : "Chưa cập nhật"
          )}</strong></div>
        </div>
        <p><strong>Mục đích:</strong> ${escapeHtml(booking.purpose)}</p>
        ${
          booking.purposeDetail
            ? `<p><strong>Ghi chú:</strong> ${escapeHtml(booking.purposeDetail)}</p>`
            : ""
        }
        ${
          booking.reviewNote
            ? `<p><strong>Review note:</strong> ${escapeHtml(booking.reviewNote)}</p>`
            : ""
        }
        ${
          booking.rejectionReason
            ? `<p><strong>Lý do từ chối:</strong> ${escapeHtml(booking.rejectionReason)}</p>`
            : ""
        }
        ${
          booking.cancellationReason
            ? `<p><strong>Lý do hủy:</strong> ${escapeHtml(booking.cancellationReason)}</p>`
            : ""
        }
      </article>
    `;
  }

  function renderBookings() {
    if (!state.visibleBookings.length) {
      elements.bookingList.innerHTML = `<div class="empty-state">Không có booking nào khớp với điều kiện lọc hiện tại.</div>`;
      return;
    }

    elements.bookingList.innerHTML = state.visibleBookings
      .map((booking) => {
        const selected = booking.bookingId === state.selectedBookingId ? "selected" : "";
        return `
          <article class="booking-card ${selected}" data-booking-id="${escapeHtml(
            booking.bookingId
          )}">
            <div class="booking-card-header">
              <div>
                <span class="label">${escapeHtml(booking.roomId)}</span>
                <h5>${escapeHtml(booking.requesterName)}</h5>
              </div>
              ${renderStatusBadge(booking.status)}
            </div>
            <div class="booking-meta">
              <div class="meta-line"><span>Booking ID</span><strong>${escapeHtml(
                booking.bookingId
              )}</strong></div>
              <div class="meta-line"><span>Khung giờ</span><strong>${escapeHtml(
                formatTimeRange(booking)
              )}</strong></div>
              <div class="meta-line"><span>Email</span><strong>${escapeHtml(
                booking.requesterEmail
              )}</strong></div>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(elements.bookingList.querySelectorAll("[data-booking-id]")).forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedBookingId = card.getAttribute("data-booking-id");
        renderBookings();
        renderBookingDetail();
        renderManagerDesk();
      });
    });
  }

  function renderManagerDesk() {
    const pendingBookings = state.bookingCatalog.filter((booking) => booking.status === "PENDING");

    if (
      pendingBookings.length > 0 &&
      (!state.selectedBookingId ||
        !pendingBookings.some((booking) => booking.bookingId === state.selectedBookingId))
    ) {
      state.selectedBookingId = pendingBookings[0].bookingId;
    }

    if (!pendingBookings.length) {
      elements.managerQueue.innerHTML = `<div class="empty-state">Hiện chưa có booking nào đang chờ xử lý.</div>`;
    } else {
      elements.managerQueue.innerHTML = pendingBookings
        .map(
          (booking) => `
            <article class="queue-item ${
              booking.bookingId === state.selectedBookingId ? "selected" : ""
            }" data-booking-id="${escapeHtml(booking.bookingId)}">
              <div class="booking-card-header">
                <div>
                  <span class="label">${escapeHtml(booking.roomId)}</span>
                  <h5>${escapeHtml(booking.requesterName)}</h5>
                </div>
                ${renderStatusBadge(booking.status)}
              </div>
              <div class="booking-meta">
                <div class="meta-line"><span>Khung giờ</span><strong>${escapeHtml(
                  formatTimeRange(booking)
                )}</strong></div>
                <div class="meta-line"><span>Mục đích</span><strong>${escapeHtml(
                  booking.purpose
                )}</strong></div>
              </div>
            </article>
          `
        )
        .join("");

      Array.from(elements.managerQueue.querySelectorAll("[data-booking-id]")).forEach((card) => {
        card.addEventListener("click", () => {
          state.selectedBookingId = card.getAttribute("data-booking-id");
          renderBookings();
          renderBookingDetail();
          renderManagerDesk();
        });
      });
    }

    const selectedBooking = findSelectedBooking();
    const actionable = selectedBooking && ["PENDING", "APPROVED"].includes(selectedBooking.status);
    const decisionAllowed = selectedBooking && selectedBooking.status === "PENDING";

    if (!selectedBooking) {
      elements.managerSelectedSummary.innerHTML = "Chưa chọn booking nào trong hàng chờ.";
      elements.decisionForm.querySelector("button[type='submit']").disabled = true;
      elements.rejectButton.disabled = true;
      elements.cancelForm.querySelector("button[type='submit']").disabled = true;
      setFeedback(
        elements.managerFeedback,
        pendingBookings.length
          ? "Chọn một booking PENDING trong hàng chờ để approve hoặc reject."
          : "Hiện không có booking PENDING để reject.",
        "info"
      );
      return;
    }

    elements.managerSelectedSummary.innerHTML = `
      <strong>${escapeHtml(selectedBooking.requesterName)} · ${escapeHtml(
        selectedBooking.roomId
      )}</strong>
      <span class="muted">Booking ${escapeHtml(selectedBooking.bookingId)} · ${escapeHtml(
        formatTimeRange(selectedBooking)
      )}</span>
    `;

    elements.decisionForm.querySelector("button[type='submit']").disabled = !decisionAllowed;
    elements.rejectButton.disabled = !decisionAllowed;
    elements.cancelForm.querySelector("button[type='submit']").disabled = !actionable;

    if (decisionAllowed) {
      setFeedback(
        elements.managerFeedback,
        "Booking đang ở trạng thái PENDING. Bạn có thể approve hoặc reject ngay tại đây.",
        "info"
      );
      return;
    }

    setFeedback(
      elements.managerFeedback,
      `Booking hiện ở trạng thái ${selectedBooking.status}. Chỉ booking PENDING mới có thể reject.`,
      "error"
    );
  }

  async function refreshGatewayHealth() {
    try {
      await apiRequest("/health");
      setGatewayStatus(true, "Gateway phản hồi bình thường. Frontend đang gọi API qua cổng 8080.");
    } catch (error) {
      setGatewayStatus(false, error.message || "Không thể kết nối gateway.");
    }
  }

  async function refreshRooms() {
    setFeedback(elements.roomFeedback, "Đang tải danh sách phòng...", "info");

    const roomCatalogData = await apiRequest("/api/rooms");
    state.roomCatalog = roomCatalogData.items || [];

    const roomListData =
      Object.keys(state.roomFilters).length > 0
        ? await apiRequest("/api/rooms", { query: state.roomFilters })
        : roomCatalogData;

    state.visibleRooms = roomListData.items || [];

    if (!state.selectedRoomId && state.visibleRooms.length) {
      state.selectedRoomId = state.visibleRooms[0].roomId;
    }

    if (
      state.selectedRoomId &&
      !state.roomCatalog.some((room) => room.roomId === state.selectedRoomId) &&
      state.roomCatalog.length
    ) {
      state.selectedRoomId = state.roomCatalog[0].roomId;
    }

    renderRooms();
    renderRoomDetail();
    populateRoomSelect();
    updateMetrics();
    setFeedback(
      elements.roomFeedback,
      `Đã tải ${state.visibleRooms.length} phòng phù hợp với bộ lọc hiện tại.`,
      "success"
    );
  }

  async function refreshBookings() {
    setFeedback(elements.bookingListFeedback, "Đang tải danh sách booking...", "info");

    const bookingCatalogData = await apiRequest("/api/bookings");
    state.bookingCatalog = bookingCatalogData.items || [];

    const bookingListData =
      Object.keys(state.bookingFilters).length > 0
        ? await apiRequest("/api/bookings", { query: state.bookingFilters })
        : bookingCatalogData;

    state.visibleBookings = bookingListData.items || [];

    if (
      state.selectedBookingId &&
      !state.bookingCatalog.some((booking) => booking.bookingId === state.selectedBookingId)
    ) {
      state.selectedBookingId = null;
    }

    renderBookings();
    renderBookingDetail();
    renderManagerDesk();
    updateMetrics();
    setFeedback(
      elements.bookingListFeedback,
      `Đã tải ${state.visibleBookings.length} booking cho khu vực theo dõi.`,
      "success"
    );
  }

  async function refreshAll() {
    await Promise.all([refreshGatewayHealth(), refreshRooms(), refreshBookings()]);
  }

  function getRoomFiltersFromForm() {
    const formData = new FormData(elements.roomFilterForm);
    const equipment = String(formData.get("equipment") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      building: String(formData.get("building") || "").trim(),
      minCapacity: String(formData.get("minCapacity") || "").trim(),
      status: String(formData.get("status") || "").trim(),
      equipment
    };
  }

  function getBookingFiltersFromForm() {
    const formData = new FormData(elements.bookingFilterForm);
    return {
      status: String(formData.get("status") || "").trim(),
      requesterEmail: String(formData.get("requesterEmail") || "").trim(),
      roomId: String(formData.get("roomId") || "").trim()
    };
  }

  function setDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    elements.availabilityForm.elements.date.value = today;
    elements.bookingForm.elements.date.value = today;
    elements.availabilityForm.elements.startTime.value = "09:00";
    elements.availabilityForm.elements.endTime.value = "11:00";
    elements.bookingForm.elements.startTime.value = "09:00";
    elements.bookingForm.elements.endTime.value = "11:00";
  }

  function validateBookingForm(data) {
    if (!data.roomId || !data.requesterId || !data.requesterName || !data.requesterEmail) {
      return "Vui lòng điền đủ thông tin người gửi và phòng học.";
    }

    if (!data.purpose || !data.date || !data.startTime || !data.endTime) {
      return "Vui lòng điền đầy đủ mục đích và khung giờ.";
    }

    if (Number(data.attendeeCount) <= 0) {
      return "Số người tham gia phải lớn hơn 0.";
    }

    if (data.startTime >= data.endTime) {
      return "Giờ bắt đầu phải sớm hơn giờ kết thúc.";
    }

    return null;
  }

  function bindEvents() {
    elements.roomFilterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.roomFilters = getRoomFiltersFromForm();
      try {
        await refreshRooms();
      } catch (error) {
        setFeedback(elements.roomFeedback, error.message || "Không thể tải danh sách phòng.", "error");
      }
    });

    document.getElementById("reset-room-filters").addEventListener("click", async () => {
      elements.roomFilterForm.reset();
      state.roomFilters = {};
      try {
        await refreshRooms();
      } catch (error) {
        setFeedback(elements.roomFeedback, error.message || "Không thể tải danh sách phòng.", "error");
      }
    });

    elements.refreshRoomsButton.addEventListener("click", async () => {
      try {
        await refreshRooms();
        showToast("Đã làm mới dữ liệu phòng.", "success");
      } catch (error) {
        setFeedback(elements.roomFeedback, error.message || "Không thể làm mới dữ liệu phòng.", "error");
      }
    });

    elements.availabilityForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const room = findSelectedRoom() || state.roomCatalog[0];

      if (!room) {
        showToast("Chưa có phòng nào để kiểm tra.", "error");
        return;
      }

      const formData = new FormData(elements.availabilityForm);
      const payload = {
        roomId: room.roomId,
        date: String(formData.get("date") || ""),
        startTime: String(formData.get("startTime") || ""),
        endTime: String(formData.get("endTime") || "")
      };

      if (!payload.date || !payload.startTime || !payload.endTime) {
        showToast("Vui lòng nhập đủ ngày và giờ để kiểm tra.", "error");
        return;
      }

      try {
        const data = await apiRequest("/api/schedules/availability", { query: payload });
        elements.availabilityResult.className = `availability-card ${
          data.available ? "available" : "unavailable"
        }`;
        elements.availabilityResult.innerHTML = data.available
          ? `<strong>Khung giờ đang trống.</strong><p class="muted">Phòng ${escapeHtml(
              data.roomId
            )} hiện có thể dùng vào ${escapeHtml(data.date)} từ ${escapeHtml(
              data.startTime
            )} đến ${escapeHtml(data.endTime)}.</p>`
          : `<strong>Khung giờ đã bị chiếm.</strong><p>${escapeHtml(
              data.reason || "Requested time slot overlaps with an existing reservation"
            )}</p>`;
      } catch (error) {
        elements.availabilityResult.className = "availability-card unavailable";
        elements.availabilityResult.textContent =
          error.message || "Không thể kiểm tra availability ở thời điểm hiện tại.";
      }
    });

    elements.bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(elements.bookingForm);
      const payload = {
        roomId: String(formData.get("roomId") || "").trim(),
        requesterId: String(formData.get("requesterId") || "").trim(),
        requesterName: String(formData.get("requesterName") || "").trim(),
        requesterEmail: String(formData.get("requesterEmail") || "").trim(),
        purpose: String(formData.get("purpose") || "").trim(),
        attendeeCount: Number(formData.get("attendeeCount") || 0),
        date: String(formData.get("date") || "").trim(),
        startTime: String(formData.get("startTime") || "").trim(),
        endTime: String(formData.get("endTime") || "").trim(),
        purposeDetail: String(formData.get("purposeDetail") || "").trim()
      };

      const validationMessage = validateBookingForm(payload);
      if (validationMessage) {
        setFeedback(elements.bookingFormFeedback, validationMessage, "error");
        return;
      }

      setFeedback(elements.bookingFormFeedback, "Đang gửi booking...", "info");

      try {
        const booking = await apiRequest("/api/bookings", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        state.selectedBookingId = booking.bookingId;
        setFeedback(
          elements.bookingFormFeedback,
          `Đã tạo booking thành công với mã ${booking.bookingId}.`,
          "success"
        );
        showToast("Booking đã được tạo ở trạng thái PENDING.", "success");
        await refreshBookings();
      } catch (error) {
        setFeedback(
          elements.bookingFormFeedback,
          error.message || "Không thể tạo booking ở thời điểm hiện tại.",
          "error"
        );
      }
    });

    document.getElementById("booking-form-reset").addEventListener("click", () => {
      elements.bookingForm.reset();
      populateRoomSelect();
      setDefaultDates();
      setFeedback(elements.bookingFormFeedback, "Form đã được làm mới.", "info");
    });

    elements.bookingFilterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.bookingFilters = getBookingFiltersFromForm();
      try {
        await refreshBookings();
      } catch (error) {
        setFeedback(
          elements.bookingListFeedback,
          error.message || "Không thể tải danh sách booking.",
          "error"
        );
      }
    });

    document.getElementById("reset-booking-filters").addEventListener("click", async () => {
      elements.bookingFilterForm.reset();
      state.bookingFilters = {};
      try {
        await refreshBookings();
      } catch (error) {
        setFeedback(
          elements.bookingListFeedback,
          error.message || "Không thể tải danh sách booking.",
          "error"
        );
      }
    });

    elements.refreshBookingsButton.addEventListener("click", async () => {
      try {
        await refreshBookings();
        showToast("Danh sách booking đã được làm mới.", "success");
      } catch (error) {
        setFeedback(
          elements.bookingListFeedback,
          error.message || "Không thể làm mới danh sách booking.",
          "error"
        );
      }
    });

    elements.decisionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const booking = findSelectedBooking();

      if (!booking) {
        setFeedback(elements.managerFeedback, "Hãy chọn booking cần approve trước.", "error");
        return;
      }

      const formData = new FormData(elements.decisionForm);
      const payload = {
        decision: "APPROVE",
        reviewedBy: String(formData.get("reviewedBy") || "").trim(),
        reviewNote: String(formData.get("reviewNote") || "").trim(),
        rejectionReason: null
      };

      if (!payload.reviewedBy) {
        setFeedback(elements.managerFeedback, "Vui lòng nhập người duyệt.", "error");
        return;
      }

      setFeedback(elements.managerFeedback, "Đang approve booking...", "info");

      try {
        await apiRequest(`/api/bookings/${booking.bookingId}/decision`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Booking đã được approve thành công.", "success");
        await refreshBookings();
        renderManagerDesk();
        setFeedback(elements.managerFeedback, "Đã approve booking và reserve slot.", "success");
      } catch (error) {
        setFeedback(elements.managerFeedback, error.message || "Approve booking thất bại.", "error");
      }
    });

    elements.rejectButton.addEventListener("click", async () => {
      const booking = findSelectedBooking();

      if (!booking) {
        setFeedback(elements.managerFeedback, "Hãy chọn booking cần reject trước.", "error");
        return;
      }

      const formData = new FormData(elements.decisionForm);
      const reviewedBy = String(formData.get("reviewedBy") || "").trim();
      const reviewNote = String(formData.get("reviewNote") || "").trim();
      const rejectionReason = String(formData.get("rejectionReason") || "").trim();

      if (!reviewedBy) {
        setFeedback(elements.managerFeedback, "Vui lòng nhập người duyệt.", "error");
        return;
      }

      if (!rejectionReason) {
        setFeedback(elements.managerFeedback, "Vui lòng nhập lý do từ chối.", "error");
        return;
      }

      setFeedback(elements.managerFeedback, "Đang reject booking...", "info");

      try {
        await apiRequest(`/api/bookings/${booking.bookingId}/decision`, {
          method: "POST",
          body: JSON.stringify({
            decision: "REJECT",
            reviewedBy,
            reviewNote,
            rejectionReason
          })
        });
        showToast("Booking đã được reject.", "success");
        await refreshBookings();
        setFeedback(elements.managerFeedback, "Đã reject booking thành công.", "success");
      } catch (error) {
        setFeedback(elements.managerFeedback, error.message || "Reject booking thất bại.", "error");
      }
    });

    elements.cancelForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const booking = findSelectedBooking();

      if (!booking) {
        setFeedback(elements.managerFeedback, "Hãy chọn booking cần hủy trước.", "error");
        return;
      }

      const formData = new FormData(elements.cancelForm);
      const payload = {
        cancelledBy: String(formData.get("cancelledBy") || "").trim(),
        cancelledByRole: String(formData.get("cancelledByRole") || "").trim(),
        cancellationReason: String(formData.get("cancellationReason") || "").trim()
      };

      if (!payload.cancelledBy) {
        setFeedback(elements.managerFeedback, "Vui lòng nhập người hủy.", "error");
        return;
      }

      setFeedback(elements.managerFeedback, "Đang hủy booking...", "info");

      try {
        await apiRequest(`/api/bookings/${booking.bookingId}/cancellation`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Booking đã được hủy.", "success");
        await refreshBookings();
        setFeedback(elements.managerFeedback, "Đã hủy booking thành công.", "success");
      } catch (error) {
        setFeedback(elements.managerFeedback, error.message || "Hủy booking thất bại.", "error");
      }
    });
  }

  async function initialize() {
    setDefaultDates();
    bindEvents();

    try {
      await refreshAll();
      showToast("Frontend đã sẵn sàng để demo với giảng viên.", "success");
    } catch (error) {
      setGatewayStatus(false, error.message || "Không thể tải dữ liệu ban đầu.");
      setFeedback(
        elements.roomFeedback,
        error.message || "Có lỗi khi khởi tạo dữ liệu frontend.",
        "error"
      );
      setFeedback(
        elements.bookingListFeedback,
        error.message || "Có lỗi khi khởi tạo dữ liệu frontend.",
        "error"
      );
      showToast("Không thể tải dữ liệu ban đầu từ gateway.", "error");
    }
  }

  initialize();
})();
