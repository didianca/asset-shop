import { Router } from "express";
import { validateParams } from "../../../middleware/validate.js";
import { OrderIdParamsSchema } from "../order.types.js";
import { createOrderHandler } from "./createOrder.js";
import { listOrdersHandler } from "./getOrders.js";
import { getOrderHandler } from "./getOrder.js";

const router = Router();

router.post("/", createOrderHandler);
router.get("/", listOrdersHandler);
router.get("/:id", validateParams(OrderIdParamsSchema), getOrderHandler);

export default router;
