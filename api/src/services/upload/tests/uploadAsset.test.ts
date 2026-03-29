import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const ADMIN_EMAIL = "admin@upload.test";
const CUSTOMER_EMAIL = "customer@upload.test";

let adminToken: string;
let customerToken: string;

const mockS3Send = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
}));

const mockSharpToBuffer = vi.hoisted(() => vi.fn());
const mockSharpMetadata = vi.hoisted(() => vi.fn());

vi.mock("sharp", () => {
  const createInstance = (): Record<string, unknown> => ({
    metadata: mockSharpMetadata,
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: mockSharpToBuffer,
  });
  return { default: vi.fn().mockImplementation(createInstance) };
});

beforeAll(async () => {
  mockS3Send.mockResolvedValue({});
  mockSharpMetadata.mockResolvedValue({ width: 800, height: 600 });
  mockSharpToBuffer.mockResolvedValue(Buffer.from("watermarked"));

  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminToken = jwt.sign({ id: admin.id, role: "admin", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });

  const customer = await prisma.user.create({
    data: { email: CUSTOMER_EMAIL, passwordHash: "x", firstName: "Customer", lastName: "Test", role: "customer", status: "active" },
  });
  customerToken = jwt.sign({ id: customer.id, role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("POST /upload", () => {
  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/upload?slug=test-asset")
      .attach("file", Buffer.from("fake-image"), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const res = await request(app)
      .post("/api/upload?slug=test-asset")
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("file", Buffer.from("fake-image"), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await request(app)
      .post("/api/upload?slug=test-asset")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No file provided");
  });

  it("returns 400 when slug query param is missing", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fake-image"), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid request");
  });

  it("returns 400 for non-image file types", async () => {
    const res = await request(app)
      .post("/api/upload?slug=test-asset")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fake-pdf"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("File must be an image (png, jpeg, or webp)");
  });

  it("uploads to S3 and returns asset and preview keys", async () => {
    const res = await request(app)
      .post("/api/upload?slug=dark-minimalist-pack")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fake-image"), { filename: "asset.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.assetKey).toBe("assets/dark-minimalist-pack.png");
    expect(res.body.previewKey).toBe("previews/dark-minimalist-pack.png");
  });

  it("calls S3 twice — once for asset, once for watermarked preview", async () => {
    mockS3Send.mockClear();

    await request(app)
      .post("/api/upload?slug=double-upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fake-image"), { filename: "asset.jpg", contentType: "image/jpeg" });

    expect(mockS3Send).toHaveBeenCalledTimes(2);
  });

  it("supports webp images", async () => {
    const res = await request(app)
      .post("/api/upload?slug=webp-test")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fake-image"), { filename: "asset.webp", contentType: "image/webp" });

    expect(res.status).toBe(200);
    expect(res.body.assetKey).toContain("webp-test.webp");
  });
});
