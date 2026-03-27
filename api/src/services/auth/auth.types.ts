import type jwt from "jsonwebtoken";

// Request body for POST /auth/register
export interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Request body for POST /auth/login
export interface LoginBody {
  email: string;
  password: string;
}

// Shape of the JWT payload — embedded in every token
export interface JwtPayload extends jwt.JwtPayload {
  id: string;
  role: "admin" | "customer";
  status: "pending" | "active" | "deleted";
}
