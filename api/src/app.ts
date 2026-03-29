import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import { authenticate } from "./middleware/auth.js";
import authRouter from "./services/auth/routes/index.js";
import productRouter from "./services/product/routes/index.js";
import cartRouter from "./services/cart/routes/index.js";
import orderRouter from "./services/order/routes/index.js";
import paymentRouter from "./services/payment/routes/index.js";
import uploadRouter from "./services/upload/routes/index.js";
import { handleWebhookHandler } from "./services/payment/routes/handleWebhook.js";

const app = express();

// Stripe webhook needs raw body for signature verification — must be before express.json()
app.post("/payments/webhook", express.raw({ type: "application/json" }), handleWebhookHandler);

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public routes — no authentication required
app.use("/auth", authRouter);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Testing API" });
});

// All routes defined below this line require authentication
app.use(authenticate);

app.use("/products", productRouter);
app.use("/cart", cartRouter);
app.use("/orders", orderRouter);
app.use("/payments", paymentRouter);
app.use("/upload", uploadRouter);

// Handle malformed JSON bodies
// TODO: move to util func
app.use(
  (
    err: SyntaxError & { status?: number },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err.status === 400 && "body" in err) {
      res.status(400).json({ message: "Invalid JSON in request body" });
      return;
    }
    next(err);
  }
);

export default app;
