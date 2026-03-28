import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { CreateProductSchema, UpdateProductSchema } from "../product.types.js";
import { createProductHandler } from "./create.js";
import { listProductsHandler } from "./list.js";
import { getProductHandler } from "./get.js";
import { updateProductHandler } from "./update.js";
import { deleteProductHandler } from "./delete.js";

const router = Router();

router.get("/", listProductsHandler);
router.get("/:slug", getProductHandler);
router.post("/", requireAdmin, validate(CreateProductSchema), createProductHandler);
router.put("/:slug", requireAdmin, validate(UpdateProductSchema), updateProductHandler);
router.delete("/:slug", requireAdmin, deleteProductHandler);

export default router;
