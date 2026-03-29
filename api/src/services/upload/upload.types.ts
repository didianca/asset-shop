import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     UploadQuery:
 *       type: object
 *       required:
 *         - slug
 *       properties:
 *         slug:
 *           type: string
 *           example: dark-minimalist-pack
 *     UploadResponse:
 *       type: object
 *       required:
 *         - assetKey
 *         - previewKey
 *       properties:
 *         assetKey:
 *           type: string
 *           example: assets/dark-minimalist-pack.png
 *         previewKey:
 *           type: string
 *           example: previews/dark-minimalist-pack.png
 */

export const UploadQuerySchema = z.object({
  slug: z.string().min(1),
}).strict();

export type UploadQuery = z.infer<typeof UploadQuerySchema>;
