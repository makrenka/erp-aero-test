import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getPool } from "../db";

const ACCESS_EXPIRES_MIN = Number(process.env.ACCESS_TOKEN_EXPIRES_MIN || 10);
const REFRESH_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7,
);

export const signAccessToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: `${ACCESS_EXPIRES_MIN}m`,
  });
};

export const signRefreshToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
  });
};

export const randomTokenString = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const createSession = async (
  userId: number,
  refreshToken: string,
  meta: any,
) => {
  const pool = getPool();
  const sessionId = uuidv4();
  const hash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86400000);
  await pool.query(
    "INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      sessionId,
      userId,
      hash,
      meta.userAgent || null,
      meta.ip || null,
      expiresAt,
    ],
  );
  return sessionId;
};

export const revokeSession = async (sessionId: string) => {
  const pool = getPool();
  await pool.query("UPDATE sessions SET revoked = 1 WHERE id = ?", [sessionId]);
};

export const findSession = async (sessionId: string) => {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ?", [
    sessionId,
  ]);
  return (rows as any)[0];
};
