import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../utils/token";
import { AppDataSource } from "../index";
import { User } from "../entities/User";

const accessBlacklist = new Set<string>();

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

    if (payload.tokenId && accessBlacklist.has(payload.tokenId)) {
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

export const blacklistAccessToken = (tokenId: string) => {
  accessBlacklist.add(tokenId);
};
