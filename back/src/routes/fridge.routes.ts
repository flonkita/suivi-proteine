import { Router } from "express";
import multer from "multer";
import { scanFridge } from "../controllers/fridge.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les formats images sont autorisés."));
    }
  },
});

router.post("/scan", upload.single("image"), scanFridge);

export default router;
