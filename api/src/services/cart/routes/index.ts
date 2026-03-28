import { Router } from "express";
import { validate, validateParams } from "../../../middleware/validate.js";
import { AddCartItemsSchema, ProductIdParamsSchema } from "../cart.types.js";
import { getCartHandler } from "./getCart.js";
import { addCartItemHandler } from "./addCartItem.js";
import { removeCartItemHandler } from "./removeCartItem.js";
import { clearCartHandler } from "./clearCart.js";

const router = Router();

router.get("/", getCartHandler);
router.post("/items", validate(AddCartItemsSchema), addCartItemHandler);
router.delete("/items/:productId", validateParams(ProductIdParamsSchema), removeCartItemHandler);
router.delete("/", clearCartHandler);

export default router;
