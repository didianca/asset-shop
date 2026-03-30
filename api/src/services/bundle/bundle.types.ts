import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateBundleBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *         - slug
 *       properties:
 *         name:
 *           type: string
 *           example: Dark Essentials Bundle
 *         slug:
 *           type: string
 *           example: dark-essentials-bundle
 *         description:
 *           type: string
 *           example: A curated set of dark-themed assets
 *         discountPercent:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 20
 *         productIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *     UpdateBundleBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *         - slug
 *         - description
 *         - discountPercent
 *         - isActive
 *         - productIds
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         discountPercent:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         productIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *     BundleResponse:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - description
 *         - discountPercent
 *         - isActive
 *         - products
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
 *           nullable: true
 *         discountPercent:
 *           type: integer
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               price:
 *                 type: number
 *               discountPercent:
 *                 type: integer
 *                 nullable: true
 *               previewKey:
 *                 type: string
 *               previewUrl:
 *                 type: string
 *                 format: uri
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export const UuidParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateBundleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  productIds: z.array(z.string().uuid()).optional(),
}).strict();

export const UpdateBundleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  discountPercent: z.number().int().min(1).max(100).nullable(),
  isActive: z.boolean(),
  productIds: z.array(z.string().uuid()),
}).strict();

export type CreateBundleBody = z.infer<typeof CreateBundleSchema>;
export type UpdateBundleBody = z.infer<typeof UpdateBundleSchema>;
