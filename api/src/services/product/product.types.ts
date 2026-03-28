import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateProductBody:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - price
 *         - previewUrl
 *         - assetUrl
 *       properties:
 *         name:
 *           type: string
 *           example: Dark Minimalist Pack
 *         slug:
 *           type: string
 *           example: dark-minimalist-pack
 *         description:
 *           type: string
 *           example: A collection of dark minimalist assets
 *         price:
 *           type: number
 *           example: 19.99
 *         discountPercent:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 10
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["dark", "minimalist"]
 *         previewUrl:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/preview.jpg
 *         assetUrl:
 *           type: string
 *           format: uri
 *           example: https://s3.example.com/asset.zip
 *     UpdateProductBody:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - description
 *         - price
 *         - discountPercent
 *         - isActive
 *         - tags
 *         - previewUrl
 *         - assetUrl
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         price:
 *           type: number
 *         discountPercent:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         previewUrl:
 *           type: string
 *           format: uri
 *         assetUrl:
 *           type: string
 *           format: uri
 *     ProductResponse:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - price
 *         - isActive
 *         - tags
 *         - previewUrl
 *         - assetUrl
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         discountPercent:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         previewUrl:
 *           type: string
 *           format: uri
 *         assetUrl:
 *           type: string
 *           format: uri
 *         createdAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  previewUrl: z.string().url(),
  assetUrl: z.string().url(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  discountPercent: z.number().int().min(0).max(100).nullable(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  previewUrl: z.string().url(),
  assetUrl: z.string().url(),
});

export type CreateProductBody = z.infer<typeof CreateProductSchema>;
export type UpdateProductBody = z.infer<typeof UpdateProductSchema>;
