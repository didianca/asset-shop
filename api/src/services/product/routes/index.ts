import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate, validateParams } from "../../../middleware/validate.js";
import { CreateProductSchema, UpdateProductSchema, UuidParamsSchema } from "../product.types.js";
import { createProductHandler } from "./createProduct.js";
import { listProductsHandler } from "./getProducts.js";
import { getProductHandler } from "./getProduct.js";
import { updateProductHandler } from "./updateProduct.js";
import { listTagsHandler } from "./getTags.js";

const router = Router();

router.get("/", listProductsHandler);
router.get("/tags", listTagsHandler);
router.get("/:id", validateParams(UuidParamsSchema), getProductHandler);
router.post("/", requireAdmin, validate(CreateProductSchema), createProductHandler);
router.put("/:id", requireAdmin, validateParams(UuidParamsSchema), validate(UpdateProductSchema), updateProductHandler);

export default router;
