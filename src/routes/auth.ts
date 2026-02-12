import { Router } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../index";
import { User } from "../entities/User";
import { signAccess, signRefresh, verifyRefresh } from "../utils/token";
import { blacklistAccessToken } from "../middlewares/auth";

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// /signup -> POST
router.post("/", async (req, res) => {
  const { identifier, password, deviceId } = req.body;

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

  const access = signAccess({ id: user.id });
  const refresh = signRefresh({ id: user.id, device: deviceId || "unknown" });
  user.devices = (user.devices || []).concat({
    deviceId: deviceId || "unknown",
    refreshToken: refresh,
    issuedAt: Date.now(),
  });

  await userRepository.save(user);
  res.json({ accessToken: access, refreshToken: refresh });
});

// /signin -> POST (login)
router.post("/login", async (req, res) => {
  const { identifier, password, deviceId } = req.body;

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

  const access = signAccess({ id: user.id });
  const refresh = signRefresh({ id: user.id, device: deviceId || "unknown" });
  user.devices = (user.devices || []).concat({
    deviceId: deviceId || "unknown",
    refreshToken: refresh,
    issuedAt: Date.now(),
  });

  await userRepository.save(user);
  res.json({ accessToken: access, refreshToken: refresh });
});

// /signin/new_token -> POST refresh
router.post("/new_token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshTokenrequired" });
  }

  try {
    const payload: any = verifyRefresh(refreshToken) as any;
    const user = await userRepository.findOneBy({ id: payload.id });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // find device entry with refreshToken
    const idx = (user.devices || []).findIndex(
      (d) => d.refreshToken === refreshToken && !d.revoked,
    );

    if (idx === -1) {
      return res
        .status(401)
        .json({ error: "Refresh token invalid or revoked" });
    }

    // issue new access token and rotate refresh token
    const access = signAccess({ id: user.id });
    const newRefresh = signRefresh({
      id: user.id,
      device: user.devices![idx].deviceId,
    });
    user.devices![idx].refreshToken = newRefresh;
    user.devices![idx].issuedAt = Date.now();

    await userRepository.save(user);
    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (e) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

// /logout -> GET (must be protected)
router.get("/", async (req, res) => {
  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const jti = req.jti; // access token id
  const { refreshToken } = req.body; // client should send refresh to revoke that device
  const user = await userRepository.findOneBy({ id: userId });

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  // blacklist access token so it cannot be used anymore
  if (jti) {
    blacklistAccessToken(jti);
  }

  if (refreshToken) {
    const idx = (user.devices || []).findIndex(
      (d) => d.refreshToken === refreshToken,
    );
    if (idx !== -1) {
      user.devices![idx].revoked = true;
      await userRepository.save(user);
    }
  }

  res.json({ ok: true });
});

export default router;
