import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate, validateParams } from "../../../middleware/validate.js";
import { CreateBundleSchema, UpdateBundleSchema, UuidParamsSchema } from "../bundle.types.js";
import { createBundleHandler } from "./createBundle.js";
import { listBundlesHandler } from "./getBundles.js";
import { getBundleHandler } from "./getBundle.js";
import { updateBundleHandler } from "./updateBundle.js";

const router = Router();

router.get("/", listBundlesHandler);
router.get("/:id", validateParams(UuidParamsSchema), getBundleHandler);
router.post("/", requireAdmin, validate(CreateBundleSchema), createBundleHandler);
router.put("/:id", requireAdmin, validateParams(UuidParamsSchema), validate(UpdateBundleSchema), updateBundleHandler);

export default router;
