import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../../middleware/validate.js";
import { RegisterSchema, LoginSchema } from "../auth.types.js";
import { registerHandler } from "./register.js";
import { loginHandler } from "./login.js";
import { verifyEmailHandler } from "./verify.js";

const isTest = process.env.NODE_ENV === "test";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTest ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts, please try again later" },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts, please try again later" },
});

const router = Router();

router.post("/register", registerLimiter, validate(RegisterSchema), registerHandler);
router.post("/login", loginLimiter, validate(LoginSchema), loginHandler);
router.get("/verify", verifyLimiter, verifyEmailHandler);

export default router;
