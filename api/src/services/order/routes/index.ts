import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate, validateParams } from "../../../middleware/validate.js";
import { OrderIdParamsSchema, UpdateOrderStatusSchema } from "../order.types.js";
import { createOrderHandler } from "./createOrder.js";
import { listOrdersHandler } from "./getOrders.js";
import { getOrderHandler } from "./getOrder.js";
import { updateOrderStatusHandler } from "./updateOrderStatus.js";

const router = Router();

router.post("/", createOrderHandler);
router.get("/", listOrdersHandler);
router.get("/:id", validateParams(OrderIdParamsSchema), getOrderHandler);
router.patch("/:id/status", requireAdmin, validateParams(OrderIdParamsSchema), validate(UpdateOrderStatusSchema), updateOrderStatusHandler);

export default router;
