import { Response } from "express";

export class ApiResponse {
  constructor(res: Response, statusCode: number, message?: string, data?: any) {
    res.status(statusCode).json({ message, data });
  }
}

export class HTTPError extends Error {
      statusCode: number;
    
      constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
      }
    }
    