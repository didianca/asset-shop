import { Router } from "express";
import { requireAdmin } from "../../../middleware/auth.js";
import { validate, validateParams } from "../../../middleware/validate.js";
import { OrderIdParamsSchema, UpdateOrderStatusSchema, RefundRequestSchema } from "../order.types.js";
import { createOrderHandler } from "./createOrder.js";
import { listOrdersHandler } from "./getOrders.js";
import { getOrderHandler } from "./getOrder.js";
import { updateOrderStatusHandler } from "./updateOrderStatus.js";
import { requestRefundHandler } from "./requestRefund.js";

const router = Router();

router.post("/", createOrderHandler);
router.get("/", listOrdersHandler);
router.get("/:id", validateParams(OrderIdParamsSchema), getOrderHandler);
router.patch("/:id/status", requireAdmin, validateParams(OrderIdParamsSchema), validate(UpdateOrderStatusSchema), updateOrderStatusHandler);
router.post("/:id/refund", validateParams(OrderIdParamsSchema), validate(RefundRequestSchema), requestRefundHandler);

export default router;
