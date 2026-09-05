import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import config from '../config';

const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong';
  let errors: unknown[] = [];
  let stack: string | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Common Prisma error codes -> friendly messages
    if (err.code === 'P2002') {
      statusCode = httpStatus.CONFLICT;
      message = `Duplicate value for field(s): ${(err.meta?.target as string[])?.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = httpStatus.NOT_FOUND;
      message = 'Requested resource not found';
    } else {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Database request error';
    }
    errors = [{ code: err.code }];
    stack = err.stack;
  } else if (err instanceof Error) {
    message = err.message;
    stack = err.stack;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.env === 'development' ? stack : undefined,
  });
};

export default globalErrorHandler;
