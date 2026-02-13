import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../index";
import { File } from "../entities/File";

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// /file/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  // @ts-ignore
  const ownerId = req.user.id;
  const f = req.file;

  if (!f) {
    return res.status(400).json({ error: "No file" });
  }

  const file = fileRepository.create({
    ownerId,
    filename: f.filename,
    originalName: f.originalname,
    mimeType: f.mimetype,
    extension: path.extname(f.originalname).replace(".", ""),
    size: f.size,
  });

  await fileRepository.save(file);
  res.json({ ok: true, file });
});

// /file/list?page=1&list_size=10
router.get("/list", async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  const page = Math.max(1, Number(req.query.page) || 1);
  const listSize = Math.max(1, Number(req.query.list_size) || 10);
  const [items, total] = await fileRepository.findAndCount({
    skip: (page - 1) * listSize,
    take: listSize,
    order: { uploadedAt: "DESC" },
  });

  res.json({ page, list_size: listSize, total, items });
});

// /file/delete/:id
router.delete("/delete/:id", async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  const id = Number(req.params.id);
  const file = await fileRepository.findOneBy({ id });

  if (!file) {
    return res.status(404).json({ error: "Not found" });
  }

  // @ts-ignore
  const ownerId = req.user.id;

  if (file.ownerId !== ownerId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const filepath = path.join(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    file.filename,
  );

  try {
    fs.unlinkSync(filepath);
  } catch (e) {
    console.warn(`Could not delete file: ${filepath}`, e);
  }

  await fileRepository.delete(id);
  res.json({ ok: true });
});

// /file/:id
router.get("/:id", async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  const id = Number(req.params.id);
  const file = await fileRepository.findOneBy({ id });

  if (!file) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ file });
});

// /file/download/:id
router.get("/download/:id", async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  const id = Number(req.params.id);
  const file = await fileRepository.findOneBy({ id });

  if (!file) {
    return res.status(404).json({ error: "Not found" });
  }

  const filepath = path.join(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    file.filename,
  );

  res.download(filepath, file.originalName);
});

// /file/update/:id
router.put("/update/:id", upload.single("file"), async (req, res) => {
  const fileRepository = AppDataSource.getRepository(File);
  const id = Number(req.params.id);
  const f = req.file;

  if (!f) {
    return res.status(400).json({ error: "No file" });
  }

  const file = await fileRepository.findOneBy({ id });

  if (!file) {
    return res.status(404).json({ error: "Not found" });
  }

  // @ts-ignore
  const ownerId = req.user.id;

  if (file.ownerId !== ownerId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // remove old file
  const old = path.join(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    file.filename,
  );

  try {
    fs.unlinkSync(old);
  } catch (e) {
    console.warn(`Could not remove old file: ${old}`, e);
  }

  file.filename = f.filename;
  file.originalName = f.originalname;
  file.mimeType = f.mimetype;
  file.extension = path.extname(f.originalname).replace(".", "");
  file.size = f.size;

  await fileRepository.save(file);
  res.json({ ok: true, file });
});

export default router;
