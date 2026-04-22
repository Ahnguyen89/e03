import { seedRooms } from "../data/seedRooms";
import { ListRoomsFilters, Room, RoomPayload } from "../models/room";

class RoomRepository {
  private readonly rooms = new Map<string, Room>();

  constructor() {
    seedRooms.forEach((room) => {
      this.rooms.set(room.roomId, room);
    });
  }

  list(filters: ListRoomsFilters): Room[] {
    return Array.from(this.rooms.values()).filter((room) => {
      if (filters.building && room.building.toLowerCase() !== filters.building.toLowerCase()) {
        return false;
      }

      if (filters.floor !== undefined && room.floor !== filters.floor) {
        return false;
      }

      if (filters.minCapacity !== undefined && room.capacity < filters.minCapacity) {
        return false;
      }

      if (filters.status && room.status !== filters.status) {
        return false;
      }

      if (filters.equipment && filters.equipment.length > 0) {
        const roomEquipment = room.equipment.map((item) => item.toLowerCase());
        return filters.equipment.every((item) => roomEquipment.includes(item.toLowerCase()));
      }

      return true;
    });
  }

  findById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  existsByRoomCode(roomCode: string, excludeRoomId?: string): boolean {
    const normalized = roomCode.toLowerCase();

    return Array.from(this.rooms.values()).some((room) => {
      if (excludeRoomId && room.roomId === excludeRoomId) {
        return false;
      }

      return room.roomCode.toLowerCase() === normalized;
    });
  }

  create(roomId: string, payload: RoomPayload): Room {
    const room: Room = {
      roomId,
      ...payload
    };

    this.rooms.set(room.roomId, room);
    return room;
  }

  update(roomId: string, payload: RoomPayload): Room {
    const room: Room = {
      roomId,
      ...payload
    };

    this.rooms.set(room.roomId, room);
    return room;
  }
}

export const roomRepository = new RoomRepository();
