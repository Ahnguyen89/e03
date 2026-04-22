import { seedRooms } from "../data/seedRooms";
import { pool } from "../db";
import { ListRoomsFilters, Room, RoomPayload } from "../models/room";

class RoomRepository {
  async seedDefaults(): Promise<void> {
    for (const room of seedRooms) {
      await pool.query(
        `
          INSERT INTO rooms (
            room_id, room_code, room_name, building, floor, capacity, status, equipment, description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
          ON CONFLICT (room_id) DO NOTHING
        `,
        [
          room.roomId,
          room.roomCode,
          room.roomName,
          room.building,
          room.floor,
          room.capacity,
          room.status,
          JSON.stringify(room.equipment),
          room.description
        ]
      );
    }
  }

  async list(filters: ListRoomsFilters): Promise<Room[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (filters.building) {
      values.push(filters.building);
      clauses.push(`LOWER(building) = LOWER($${values.length})`);
    }

    if (filters.floor !== undefined) {
      values.push(filters.floor);
      clauses.push(`floor = $${values.length}`);
    }

    if (filters.minCapacity !== undefined) {
      values.push(filters.minCapacity);
      clauses.push(`capacity >= $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.equipment && filters.equipment.length > 0) {
      values.push(filters.equipment.map((item) => item.toLowerCase()));
      clauses.push(`equipment ?& $${values.length}::text[]`);
    }

    const result = await pool.query(
      `
        SELECT * FROM rooms
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY room_id
      `,
      values
    );

    return result.rows.map(mapRoom);
  }

  async findById(roomId: string): Promise<Room | undefined> {
    const result = await pool.query("SELECT * FROM rooms WHERE room_id = $1", [roomId]);
    return result.rows[0] ? mapRoom(result.rows[0]) : undefined;
  }

  async existsByRoomCode(roomCode: string, excludeRoomId?: string): Promise<boolean> {
    const result = await pool.query(
      `
        SELECT 1 FROM rooms
        WHERE LOWER(room_code) = LOWER($1)
          AND ($2::text IS NULL OR room_id <> $2)
        LIMIT 1
      `,
      [roomCode, excludeRoomId ?? null]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async create(roomId: string, payload: RoomPayload): Promise<Room> {
    const result = await pool.query(
      `
        INSERT INTO rooms (
          room_id, room_code, room_name, building, floor, capacity, status, equipment, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *
      `,
      [
        roomId,
        payload.roomCode,
        payload.roomName,
        payload.building,
        payload.floor,
        payload.capacity,
        payload.status,
        JSON.stringify(payload.equipment),
        payload.description
      ]
    );

    return mapRoom(result.rows[0]);
  }

  async update(roomId: string, payload: RoomPayload): Promise<Room> {
    const result = await pool.query(
      `
        UPDATE rooms
        SET room_code = $2,
            room_name = $3,
            building = $4,
            floor = $5,
            capacity = $6,
            status = $7,
            equipment = $8::jsonb,
            description = $9
        WHERE room_id = $1
        RETURNING *
      `,
      [
        roomId,
        payload.roomCode,
        payload.roomName,
        payload.building,
        payload.floor,
        payload.capacity,
        payload.status,
        JSON.stringify(payload.equipment),
        payload.description
      ]
    );

    return mapRoom(result.rows[0]);
  }
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    roomId: String(row.room_id),
    roomCode: String(row.room_code),
    roomName: String(row.room_name),
    building: String(row.building),
    floor: Number(row.floor),
    capacity: Number(row.capacity),
    status: row.status as Room["status"],
    equipment: Array.isArray(row.equipment) ? (row.equipment as string[]) : [],
    description: row.description === null ? null : String(row.description)
  };
}

export const roomRepository = new RoomRepository();
