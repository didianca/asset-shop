import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { GetOrdersQuerySchema } from "../order.types.js";
import { formatOrder } from "../utils.js";

const orderInclude = {
  items: {
    include: {
      product: {
        select: { name: true, slug: true, previewUrl: true },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  payment: true,
} as const;

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List orders
 *     description: Customers see only their own orders. Admins see all orders, optionally filtered by userId.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin only)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Orders retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderListResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function listOrdersHandler(
  req: Request,
  res: Response
): Promise<void> {
  const user = req.user!;
  const parsed = GetOrdersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid query parameters" });
    return;
  }

  const { page, limit, userId } = parsed.data;

  const where =
    user.role === "admin"
      ? userId
        ? { userId }
        : {}
      : { userId: user.id };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.status(200).json({
    orders: orders.map(formatOrder),
    total,
    page,
    limit,
  });
}
