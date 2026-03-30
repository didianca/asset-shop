import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateProductBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *         - slug
 *         - price
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
 *         isBundle:
 *           type: boolean
 *           description: Mark this product as the purchasable bundle product. Mutually exclusive with bundleId.
 *           example: false
 *         bundleId:
 *           type: string
 *           format: uuid
 *           description: Assign this product to an existing bundle. Mutually exclusive with isBundle.
 *     UpdateProductBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *         - slug
 *         - description
 *         - price
 *         - discountPercent
 *         - isActive
 *         - tags
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
 *     ProductResponse:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - description
 *         - price
 *         - discountPercent
 *         - isBundle
 *         - isActive
 *         - tags
 *         - previewKey
 *         - assetKey
 *         - previewUrl
 *         - assetUrl
 *         - bundle
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
 *         isBundle:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         previewKey:
 *           type: string
 *           example: previews/dark-minimalist-pack.png
 *         assetKey:
 *           type: string
 *           example: assets/dark-minimalist-pack.png
 *         previewUrl:
 *           type: string
 *           format: uri
 *         assetUrl:
 *           type: string
 *           format: uri
 *         bundle:
 *           nullable: true
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             slug:
 *               type: string
 *             discountPercent:
 *               type: integer
 *               nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

export const UuidParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  isBundle: z.boolean().optional(),
  bundleId: z.string().uuid().optional(),
}).strict().refine(
  (data) => !(data.isBundle && data.bundleId),
  { message: "isBundle and bundleId are mutually exclusive", path: ["bundleId"] },
);

export const UpdateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  discountPercent: z.number().int().min(1).max(100).nullable(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
}).strict();

export type CreateProductBody = z.infer<typeof CreateProductSchema>;
export type UpdateProductBody = z.infer<typeof UpdateProductSchema>;
