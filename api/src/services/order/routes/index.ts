import { Router } from "express";
import { createOrderHandler } from "./createOrder.js";

const router = Router();

router.post("/", createOrderHandler);

export default router;
