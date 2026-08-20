import { Router } from "express";
import multer from "multer";
import { scanGroceryItem } from "../controllers/grocery.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Route : POST /api/grocery/scan
router.post("/scan", upload.single("image"), scanGroceryItem);

export default router;
