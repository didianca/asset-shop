import type { Request, Response } from "express";
import prisma from "../../../db.js";

/**
 * @openapi
 * /products/tags:
 *   get:
 *     summary: List all tags
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tag names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["dark", "minimalist", "4K"]
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function listTagsHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  res.status(200).json(tags.map((t) => t.name));
}
