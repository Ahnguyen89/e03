import { Response } from "express";

export interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const body: ErrorBody = { code, message };

  if (details) {
    body.details = details;
  }

  res.status(status).json(body);
}
