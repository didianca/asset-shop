import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { appConfig } from "./lib/app.config.js";
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
const apiRouter = express.Router();

// Stripe webhook needs raw body for signature verification — must be before express.json()
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", appConfig.s3Origin].filter(Boolean) as string[],
    },
  },
}));
app.use(cors({
  origin: appConfig.corsOrigin,
  credentials: true,
}));

app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhookHandler);

app.use(express.json());

// --- API routes (mounted at /api) ---

apiRouter.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public routes — no authentication required
apiRouter.use("/auth", authRouter);

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
apiRouter.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Testing API" });
});

// All routes defined below this line require authentication
apiRouter.use(authenticate);

apiRouter.use("/products", productRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/upload", uploadRouter);

app.use("/api", apiRouter);

// Handle malformed JSON bodies — must be on app since express.json() is app-level
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

// --- Static file serving (production only) ---
// In dev the Vite dev server serves the client; Express only serves it in production.
// Extracted so tests can call it without relying on NODE_ENV at module-load time.
export function enableStaticServing(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.join(__dirname, "../client");
  app.use(express.static(clientDir));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

/* v8 ignore next 3 -- module-level guard; enableStaticServing() is tested directly */
if (process.env.NODE_ENV === "production") {
  enableStaticServing();
}

export default app;
