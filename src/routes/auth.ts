import { Router } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { AppDataSource } from "../index";
import { User } from "../entities/User";
import { signAccess, signRefresh, verifyRefresh } from "../utils/token";
import { blacklistToken, validateRefreshToken } from "../middlewares/auth";

const router = Router();

// signup
router.post("/", async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "identifier and password required" });
  }

  const existing = await userRepository.findOneBy({ identifier });

  if (existing) {
    return res.status(400).json({ error: "User exists" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = userRepository.create({
    identifier,
    passwordHash: hash,
    devices: [],
  });

  await userRepository.save(user);

  const deviceId = randomUUID();

  const access = signAccess({ id: user.id });
  const refresh = signRefresh({ id: user.id, deviceId });
  user.devices = (user.devices || []).concat({
    deviceId,
    refreshToken: refresh,
    createdAt: Date.now(),
  });

  await userRepository.save(user);
  res.json({ accessToken: access, refreshToken: refresh });
});

// signin
router.post("/login", async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "identifier and password required" });
  }

  const user = await userRepository.findOneBy({ identifier });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const deviceId = randomUUID();

  const access = signAccess({ id: user.id });
  const refresh = signRefresh({ id: user.id, deviceId });
  user.devices = (user.devices || []).concat({
    deviceId,
    refreshToken: refresh,
    createdAt: Date.now(),
  });

  await userRepository.save(user);
  res.json({ accessToken: access, refreshToken: refresh });
});

// signin
router.post("/new_token", async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshTokenrequired" });
  }

  try {
    const payload = await validateRefreshToken(refreshToken);
    const user = await userRepository.findOneBy({ id: payload.id });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const deviceIndex = (user.devices || []).findIndex(
      (device) => device.refreshToken === refreshToken && !device.revoked,
    );

    if (deviceIndex === -1) {
      return res
        .status(401)
        .json({ error: "Refresh token invalid or revoked" });
    }

    const access = signAccess({ id: user.id });
    const newRefresh = signRefresh({
      id: user.id,
      device: user.devices![deviceIndex].deviceId,
    });
    user.devices![deviceIndex].refreshToken = newRefresh;
    user.devices![deviceIndex].createdAt = Date.now();

    await userRepository.save(user);
    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (e) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

// logout
router.get("/", async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const accessTokenId = req.tokenId;
  const { refreshToken } = req.body; // client should send refresh to revoke that device
  const user = await userRepository.findOneBy({ id: userId });

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  if (accessTokenId) {
    blacklistToken(accessTokenId, Number(process.env.ACCESS_EXPIRES));
  }

  if (refreshToken) {
    try {
      const payload: any = validateRefreshToken(refreshToken);

      if (payload.tokenId) {
        await blacklistToken(
          payload.tokenId,
          Number(process.env.REFRESH_EXPIRES),
        );
      }

      const deviceIndex = (user.devices || []).findIndex(
        (device) => device.refreshToken === refreshToken,
      );
      if (deviceIndex !== -1) {
        user.devices![deviceIndex].revoked = true;
        await userRepository.save(user);
      }
    } catch (err: any) {
      console.warn("Logout: failed to process refreshToken:", err.message);
    }
  }

  res.json({ ok: true });
});

export default router;
