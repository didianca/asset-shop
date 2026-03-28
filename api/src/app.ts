import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import { authenticate } from "./middleware/auth.js";
import authRouter from "./services/auth/routes/index.js";
import productRouter from "./services/product/routes/index.js";

const app = express();

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

export default app;
