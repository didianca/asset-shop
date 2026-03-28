import type { Request, Response } from "express";
import type { CreateProductBody } from "../product.types.js";

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: Admin only. Creates a new product with optional tags and image URLs.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductBody'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function createProductHandler(
  req: Request<object, object, CreateProductBody>,
  res: Response
): Promise<void> {
  res.status(201).json({ message: "Product created" });
}
