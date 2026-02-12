import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPool } from "../db";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = req.headers.authorization;

    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = auth.slice(7);
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string,
    ) as any;
    const { userId, sessionId } = payload;

    const pool = getPool();
    const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);
    const session = (rows as any)[0];

    if (!session || session.revoked) {
      return res.status(401).json({ error: "Session revoked" });
    }

    const [users] = await pool.query(
      "SELECT id, identity FROM users WHERE id = ?",
      [userId],
    );
    const user = (users as any)[0];

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = { id: user.id, identity: user.identity, sessionId };

    next();
  } catch (err: any) {
    res.status(401).json({ error: "Unauthorized", details: err.message });
  }
};
