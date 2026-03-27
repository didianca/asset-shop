import { PrismaClient } from "./generated/prisma/index.js";

// PrismaClient is a singleton — one instance shared across the entire app.
// Creating multiple instances would exhaust the database connection pool.
const prisma = new PrismaClient();

export default prisma;
