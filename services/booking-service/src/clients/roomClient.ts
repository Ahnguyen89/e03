interface RoomDetails {
  roomId: string;
  status: string;
}

interface RoomCheckResult {
  found: boolean;
  active: boolean;
}

const roomServiceUrl = process.env.ROOM_SERVICE_URL ?? "http://room-service:5000";

export async function checkRoom(roomId: string): Promise<RoomCheckResult> {
  const response = await fetch(`${roomServiceUrl}/rooms/${encodeURIComponent(roomId)}`);

  if (response.status === 404) {
    return {
      found: false,
      active: false
    };
  }

  if (!response.ok) {
    throw new Error(`room-service returned status ${response.status}`);
  }

  const room = (await response.json()) as RoomDetails;

  return {
    found: true,
    active: room.status === "active"
  };
}
