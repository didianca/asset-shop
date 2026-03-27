import { Router } from "express";
import { validate } from "../../../middleware/validate.js";
import { RegisterSchema, LoginSchema } from "../auth.types.js";
import { registerHandler } from "./register.js";
import { loginHandler } from "./login.js";
import { verifyEmailHandler } from "./verify.js";

const router = Router();

router.post("/register", validate(RegisterSchema), registerHandler);
router.post("/login", validate(LoginSchema), loginHandler);
router.get("/verify", verifyEmailHandler);

export default router;
