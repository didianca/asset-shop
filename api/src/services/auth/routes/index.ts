import { Router } from "express";
import { registerHandler } from "./register.js";
import { loginHandler } from "./login.js";
import { verifyEmailHandler } from "./verify.js";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/verify", verifyEmailHandler);

export default router;
