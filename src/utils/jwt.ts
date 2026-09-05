import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../config';

export type TokenPayload = {
  userId: string;
  email: string;
  role: string;
};

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as SignOptions);
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload & JwtPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload & JwtPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload & JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload & JwtPayload;
};
