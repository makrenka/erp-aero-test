import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import fileRoutes from "./routes/file";
import { authMiddleware } from "./middlewares/auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/signin", authRoutes);
app.use("/signup", authRoutes);

app.use("/info", authMiddleware, (req, res) => {
  // @ts-ignore
  res.json({ id: req.user.id });
});
app.use("/logout", authMiddleware, authRoutes);
app.use("/file", authMiddleware, fileRoutes);

export default app;
