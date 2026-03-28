import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     AddCartItemsBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - productIds
 *       properties:
 *         productIds:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["550e8400-e29b-41d4-a716-446655440000"]
 *     CartItemResponse:
 *       type: object
 *       required:
 *         - productId
 *         - name
 *         - slug
 *         - price
 *         - discountPercent
 *         - previewUrl
 *         - addedAt
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         price:
 *           type: number
 *         discountPercent:
 *           type: integer
 *           nullable: true
 *         previewUrl:
 *           type: string
 *           format: uri
 *         addedAt:
 *           type: string
 *           format: date-time
 *     CartResponse:
 *       type: object
 *       required:
 *         - id
 *         - items
 *         - total
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItemResponse'
 *         total:
 *           type: number
 *           description: Sum of effective prices (after per-item discounts)
 */

export const AddCartItemsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
}).strict();

export const ProductIdParamsSchema = z.object({
  productId: z.string().uuid(),
});

export type AddCartItemsBody = z.infer<typeof AddCartItemsSchema>;
