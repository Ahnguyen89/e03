import { Room } from "../models/room";

export const seedRooms: Room[] = [
  {
    roomId: "ROOM-A101",
    roomCode: "A101",
    roomName: "Phòng A101",
    building: "Building A",
    floor: 1,
    capacity: 40,
    status: "active",
    equipment: ["projector", "whiteboard", "air_conditioner"],
    description: "Phòng học tiêu chuẩn cho lớp lý thuyết cỡ vừa."
  },
  {
    roomId: "ROOM-A202",
    roomCode: "A202",
    roomName: "Phòng A202",
    building: "Building A",
    floor: 2,
    capacity: 60,
    status: "active",
    equipment: ["projector", "microphone", "speaker", "air_conditioner"],
    description: "Phòng lớn phù hợp cho seminar hoặc lớp đông."
  },
  {
    roomId: "ROOM-B303",
    roomCode: "B303",
    roomName: "Phòng B303",
    building: "Building B",
    floor: 3,
    capacity: 25,
    status: "inactive",
    equipment: ["whiteboard", "fan"],
    description: "Phòng đang tạm ngưng để bảo trì."
  }
];
