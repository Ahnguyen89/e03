import { Request, Response } from "express";

import { sendError } from "../http/errors";
import {
  validateListRoomsQuery,
  validateRoomId,
  validateRoomPayload
} from "../http/validation";
import { roomRepository } from "../repositories/roomRepository";

export function listRoomsHandler(req: Request, res: Response): void {
  const validation = validateListRoomsQuery(req);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  const rooms = roomRepository.list(validation.value);

  res.status(200).json({
    items: rooms,
    total: rooms.length
  });
}

export function getRoomByIdHandler(req: Request, res: Response): void {
  const validation = validateRoomId(req.params.roomId);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message);
    return;
  }

  const room = roomRepository.findById(validation.value);

  if (!room) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found", {
      roomId: validation.value
    });
    return;
  }

  res.status(200).json(room);
}

export function createRoomHandler(req: Request, res: Response): void {
  const roomIdValidation = validateRoomId(String(req.body?.roomId ?? ""));
  if (!roomIdValidation.ok) {
    sendError(res, 400, roomIdValidation.code, "roomId is required");
    return;
  }

  const payloadValidation = validateRoomPayload(req.body);
  if (!payloadValidation.ok) {
    sendError(res, 400, payloadValidation.code, payloadValidation.message, payloadValidation.details);
    return;
  }

  if (roomRepository.findById(roomIdValidation.value)) {
    sendError(res, 409, "ROOM_ALREADY_EXISTS", "roomId already exists", {
      roomId: roomIdValidation.value
    });
    return;
  }

  if (roomRepository.existsByRoomCode(payloadValidation.value.roomCode)) {
    sendError(res, 409, "ROOM_CODE_ALREADY_EXISTS", "roomCode already exists", {
      roomCode: payloadValidation.value.roomCode
    });
    return;
  }

  const room = roomRepository.create(roomIdValidation.value, payloadValidation.value);

  res.status(201).json(room);
}

export function updateRoomHandler(req: Request, res: Response): void {
  const roomIdValidation = validateRoomId(req.params.roomId);
  if (!roomIdValidation.ok) {
    sendError(res, 400, roomIdValidation.code, roomIdValidation.message);
    return;
  }

  const existingRoom = roomRepository.findById(roomIdValidation.value);
  if (!existingRoom) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found", {
      roomId: roomIdValidation.value
    });
    return;
  }

  if (req.body?.roomId && req.body.roomId !== roomIdValidation.value) {
    sendError(res, 409, "ROOM_ID_MISMATCH", "roomId in body does not match path parameter", {
      pathRoomId: roomIdValidation.value,
      bodyRoomId: req.body.roomId
    });
    return;
  }

  const payloadValidation = validateRoomPayload(req.body);
  if (!payloadValidation.ok) {
    sendError(res, 400, payloadValidation.code, payloadValidation.message, payloadValidation.details);
    return;
  }

  if (
    roomRepository.existsByRoomCode(payloadValidation.value.roomCode, roomIdValidation.value)
  ) {
    sendError(res, 409, "ROOM_CODE_ALREADY_EXISTS", "roomCode already exists", {
      roomCode: payloadValidation.value.roomCode
    });
    return;
  }

  const room = roomRepository.update(roomIdValidation.value, payloadValidation.value);
  res.status(200).json(room);
}
