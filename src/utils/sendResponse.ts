import { Response } from 'express';

type Meta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

type ResponsePayload<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: Meta;
  data?: T;
};

const sendResponse = <T>(res: Response, payload: ResponsePayload<T>) => {
  res.status(payload.statusCode).json({
    success: payload.success,
    message: payload.message,
    meta: payload.meta,
    data: payload.data,
  });
};

export default sendResponse;
