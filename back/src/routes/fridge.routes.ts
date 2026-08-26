import { Router } from "express";
import { scanFridge } from "../controllers/fridge.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();


router.post("/scan", upload.single("image"), scanFridge);

export default router;
