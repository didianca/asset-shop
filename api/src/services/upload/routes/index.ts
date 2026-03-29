import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../../../middleware/auth.js";
import { validateQuery } from "../../../middleware/validate.js";
import { UploadQuerySchema } from "../upload.types.js";
import { uploadAssetHandler } from "./uploadAsset.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post("/", requireAdmin, upload.single("file"), validateQuery(UploadQuerySchema), uploadAssetHandler);

export default router;
