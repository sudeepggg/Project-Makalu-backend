import multer from "multer";
import path   from "path";
import fs     from "fs";

const dir = "uploads/products";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename:    (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG and WebP allowed")),
});