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
    components: {
      schemas: {
        MessageResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        RegisterBody: {
          type: "object",
          required: ["email", "password", "firstName", "lastName"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", example: "Password123!" },
            firstName: { type: "string", example: "Jane" },
            lastName: { type: "string", example: "Doe" },
          },
        },
        LoginBody: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", example: "Password123!" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Invalid request" },
            errors: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
              example: { discount: ["Unrecognized key(s) in object: 'discount'"] },
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            message: { type: "string", example: "Testing API" },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [resolve(__dirname, "./**/*.ts")],
};

export const swaggerSpec = swaggerJsdoc(options);
