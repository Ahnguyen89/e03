export type RoomStatus = "active" | "inactive";

export interface Room {
  roomId: string;
  roomCode: string;
  roomName: string;
  building: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  equipment: string[];
  description: string | null;
}

export interface ListRoomsFilters {
  building?: string;
  floor?: number;
  minCapacity?: number;
  equipment?: string[];
  status?: RoomStatus;
}

export interface RoomPayload {
  roomCode: string;
  roomName: string;
  building: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  equipment: string[];
  description: string | null;
}
