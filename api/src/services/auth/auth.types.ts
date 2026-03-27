import type jwt from "jsonwebtoken";
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Request body for POST /auth/register
export type RegisterBody = z.infer<typeof RegisterSchema>;

// Request body for POST /auth/login
export type LoginBody = z.infer<typeof LoginSchema>;

// Shape of the JWT payload — embedded in every token
export interface JwtPayload extends jwt.JwtPayload {
  id: string;
  role: "admin" | "customer";
  status: "pending" | "active" | "deleted";
}
