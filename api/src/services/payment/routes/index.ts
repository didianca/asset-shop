import { Router } from "express";
import { validate, validateParams } from "../../../middleware/validate.js";
import { CreatePaymentSchema, OrderIdParamsSchema } from "../payment.types.js";
import { createPaymentHandler } from "./createPayment.js";
import { getPaymentHandler } from "./getPayment.js";

const router = Router();

router.post("/", validate(CreatePaymentSchema), createPaymentHandler);
router.get("/:orderId", validateParams(OrderIdParamsSchema), getPaymentHandler);

export default router;
