import { Request, Response, NextFunction } from "express";
import { verifyAccess, verifyRefresh } from "../utils/token";
import { AppDataSource } from "../index";
import { User } from "../entities/User";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
});

const isTokenBlacklisted = async (tokenId: string) => {
  const result = await redis.get(`blacklist: ${tokenId}`);
  return !!result;
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  const token = auth.slice(7);

  try {
    const payload: any = verifyAccess(token) as any;

    if (payload.tokenId && (await isTokenBlacklisted(payload.tokenId))) {
      return res.status(401).json({ error: "Token revoked" });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: payload.id });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // @ts-ignore
    req.user = { id: user.id };
    // @ts-ignore
    req.tokenId = payload.tokenId;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const blacklistToken = async (tokenId: string, ttl = 600) => {
  await redis.setex(`blacklist: ${tokenId}`, ttl, "1");
};

export const validateRefreshToken = async (refreshToken: string) => {
  try {
    const payload: any = verifyRefresh(refreshToken) as any;

    if (payload.tokenId && (await isTokenBlacklisted(payload.tokenId))) {
      throw new Error("Refresh token revoked");
    }

    return payload;
  } catch (e) {
    throw new Error("Invalid or revoked refresh token");
  }
};
