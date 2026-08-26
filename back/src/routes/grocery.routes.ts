import { Router } from "express";
import { upload } from "../middlewares/upload.middleware.js";
import { scanGroceryItem } from "../controllers/grocery.controller.js";

const router = Router();

// Route : POST /api/grocery/scan
router.post("/scan", upload.single("image"), scanGroceryItem);

export default router;
