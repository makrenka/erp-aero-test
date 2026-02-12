import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../utils/token";
import { AppDataSource } from "../index";
import { User } from "../entities/User";

const accessBlacklist = new Set<string>();

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  const token = auth.slice(7);

  try {
    const payload: any = verifyAccess(token) as any;

    if (payload.jti && accessBlacklist.has(payload.jti)) {
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
    req.jti = payload.jti;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function blacklistAccessToken(jti: string) {
  accessBlacklist.add(jti);
}
