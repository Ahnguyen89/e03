export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type BookingDecision = "APPROVE" | "REJECT";
export type CancelledByRole = "STUDENT" | "ADMIN";

export interface Booking {
  bookingId: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  purpose: string;
  attendeeCount: number;
  date: string;
  startTime: string;
  endTime: string;
  purposeDetail: string | null;
  status: BookingStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  reservationId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateBookingPayload {
  roomId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  purpose: string;
  attendeeCount: number;
  date: string;
  startTime: string;
  endTime: string;
  purposeDetail: string | null;
}

export interface DecisionPayload {
  decision: BookingDecision;
  reviewedBy: string;
  reviewNote: string | null;
  rejectionReason: string | null;
}

export interface CancellationPayload {
  cancelledBy: string;
  cancelledByRole: CancelledByRole;
  cancellationReason: string | null;
}

export interface BookingFilters {
  status?: BookingStatus;
  date?: string;
  requesterId?: string;
  requesterEmail?: string;
  roomId?: string;
}
