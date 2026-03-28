import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { CreateProductSchema, UpdateProductSchema } from "../product.types.js";
import { createProductHandler } from "./createProduct.js";
import { listProductsHandler } from "./getProducts.js";
import { getProductHandler } from "./getProduct.js";
import { updateProductHandler } from "./updateProduct.js";
import { deleteProductHandler } from "./deleteProduct.js";
import { listTagsHandler } from "./getTags.js";

const router = Router();

router.get("/", listProductsHandler);
router.get("/tags", listTagsHandler);
router.get("/:slug", getProductHandler);
router.post("/", requireAdmin, validate(CreateProductSchema), createProductHandler);
router.put("/:slug", requireAdmin, validate(UpdateProductSchema), updateProductHandler);
router.delete("/:slug", requireAdmin, deleteProductHandler);

export default router;
