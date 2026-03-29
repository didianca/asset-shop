import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreatePaymentBody:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - orderId
 *       properties:
 *         orderId:
 *           type: string
 *           format: uuid
 *     CreatePaymentResponse:
 *       type: object
 *       required:
 *         - paymentId
 *         - clientSecret
 *       properties:
 *         paymentId:
 *           type: string
 *           format: uuid
 *         clientSecret:
 *           type: string
 *     PaymentResponse:
 *       type: object
 *       required:
 *         - id
 *         - orderId
 *         - amount
 *         - status
 *         - provider
 *         - providerReference
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         orderId:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, captured, failed, refunded]
 *         provider:
 *           type: string
 *         providerReference:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export const CreatePaymentSchema = z.object({
  orderId: z.string().uuid(),
}).strict();

export const OrderIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreatePaymentBody = z.infer<typeof CreatePaymentSchema>;
