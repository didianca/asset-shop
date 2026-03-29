import type { Request, Response } from "express";
import { extname } from "path";
import type { UploadQuery } from "../upload.types.js";
import { uploadToS3 } from "../s3.js";
import { generateWatermark } from "../watermark.js";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * @openapi
 * /upload:
 *   post:
 *     summary: Upload an asset image
 *     description: |
 *       Admin only. Uploads an image to S3 and generates a watermarked preview.
 *       Returns S3 object keys for both the original asset (private) and the watermarked preview (public).
 *       Use these keys when creating a product via POST /products.
 *     tags:
 *       - Upload
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Product slug used as the S3 filename
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Asset uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Missing or invalid file
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
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function uploadAssetHandler(
  req: Request<object, object, object, UploadQuery>,
  res: Response
): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: "No file provided" });
    return;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    res.status(400).json({ message: "File must be an image (png, jpeg, or webp)" });
    return;
  }

  const { slug } = req.query;
  const ext = extname(file.originalname) || `.${file.mimetype.split("/")[1]}`;

  const assetKey = `assets/${slug}${ext}`;
  const previewKey = `previews/${slug}${ext}`;

  const watermarkedBuffer = await generateWatermark(file.buffer);

  await Promise.all([
    uploadToS3(assetKey, file.buffer, file.mimetype),
    uploadToS3(previewKey, watermarkedBuffer, file.mimetype, true),
  ]);

  res.status(200).json({ assetKey, previewKey });
}
