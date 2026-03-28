import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Asset Shop API",
      version: "1.0.0",
      description: "REST API for the Asset Shop e-commerce platform",
    },
  },
  apis: [resolve(__dirname, "./**/*.ts")],
};

export const swaggerSpec = swaggerJsdoc(options);
