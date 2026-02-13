import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "verysecret_access";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "verysecret_refresh";
const ACCESS_EXPIRES = Number(process.env.ACCESS_EXPIRES || 600);
const REFRESH_EXPIRES = Number(process.env.REFRESH_EXPIRES || 86400);

export const signAccess = (payload: object) => {
  return jwt.sign({ ...payload, tokenId: randomUUID() }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
};

export const verifyAccess = (token: string) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

export const signRefresh = (payload: object) => {
  return jwt.sign({ ...payload, tokenId: randomUUID() }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
};

export const verifyRefresh = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
