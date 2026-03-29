import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderItemResponse:
 *       type: object
 *       required:
 *         - productId
 *         - name
 *         - slug
 *         - unitPrice
 *         - previewUrl
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         unitPrice:
 *           type: number
 *         previewUrl:
 *           type: string
 *           format: uri
 *     OrderStatusHistoryEntry:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - note
 *         - changedBy
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, paid, fulfilled, refunded]
 *         note:
 *           type: string
 *           nullable: true
 *         changedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     PaymentSummary:
 *       type: object
 *       required:
 *         - id
 *         - amount
 *         - status
 *         - provider
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, captured, failed, refunded]
 *         provider:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     OrderResponse:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - status
 *         - totalAmount
 *         - items
 *         - statusHistory
 *         - payment
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, paid, fulfilled, refunded]
 *         totalAmount:
 *           type: number
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItemResponse'
 *         statusHistory:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderStatusHistoryEntry'
 *         payment:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/PaymentSummary'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UpdateOrderStatusBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, paid, fulfilled, refunded]
 *         note:
 *           type: string
 *     OrderListResponse:
 *       type: object
 *       required:
 *         - orders
 *         - total
 *         - page
 *         - limit
 *       properties:
 *         orders:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderResponse'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 */

export const OrderIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "fulfilled", "refunded"]),
  note: z.string().optional(),
}).strict();

export const GetOrdersQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateOrderStatusBody = z.infer<typeof UpdateOrderStatusSchema>;
