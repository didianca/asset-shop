import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendVerificationEmail, sendOrderConfirmationEmail, sendRefundConfirmationEmail, sendRefundDeniedEmail } from "../email.js";
import { emailConfig } from "../email.config.js";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn().mockImplementation((params) => params),
}));

beforeEach(() => {
  mockSend.mockReset();
});

const makeOrder = <T extends object>(overrides: T): { id: string; createdAt: Date; totalAmount: string; items: { productName: string; unitPrice: string; downloadUrl: string }[] } & T => ({
  id: "11111111-2222-3333-4444-555555555555",
  createdAt: new Date("2026-01-15T12:00:00Z"),
  totalAmount: "29.99",
  items: [
    { productName: "Cool Asset", unitPrice: "14.99", downloadUrl: "https://s3.example.com/asset1.zip?sig=abc" },
    { productName: "Another Asset", unitPrice: "15.00", downloadUrl: "https://s3.example.com/asset2.zip?sig=def" },
  ],
  ...overrides,
});

const makeRefund = <T extends object>(overrides: T): { orderId: string; totalAmount: string; note: string; items: { productName: string; unitPrice: string }[] } & T => ({
  orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  totalAmount: "29.99",
  note: "Not what I expected",
  items: [
    { productName: "Cool Asset", unitPrice: "14.99" },
    { productName: "Another Asset", unitPrice: "15.00" },
  ],
  ...overrides,
});

const makeRefundDenied = <T extends object>(overrides: T): { orderId: string; totalAmount: string; customerNote: string; adminNote: string; items: { productName: string; unitPrice: string }[] } & T => ({
  orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  totalAmount: "29.99",
  customerNote: "Not what I expected",
  adminNote: "Outside return policy",
  items: [
    { productName: "Cool Asset", unitPrice: "14.99" },
    { productName: "Another Asset", unitPrice: "15.00" },
  ],
  ...overrides,
});

describe("sendVerificationEmail", () => {
  it("calls SES send with the recipient address and configured from address", async () => {
    mockSend.mockResolvedValue({});

    await sendVerificationEmail("user@example.com", "abc123token");

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Destination.ToAddresses).toContain("user@example.com");
    expect(command.Source).toBe(emailConfig.sesFromEmail);
  });

  it("includes the verification token in the email body", async () => {
    mockSend.mockResolvedValue({});

    await sendVerificationEmail("user@example.com", "abc123token");

    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Message.Body.Html.Data).toContain("abc123token");
    expect(command.Message.Body.Text.Data).toContain("abc123token");
  });

  it("propagates errors thrown by SES", async () => {
    mockSend.mockRejectedValue(new Error("SES unavailable"));

    await expect(sendVerificationEmail("user@example.com", "token")).rejects.toThrow("SES unavailable");
  });
});

describe("sendOrderConfirmationEmail", () => {
  it("sends to the correct recipient with the configured from address", async () => {
    mockSend.mockResolvedValue({});

    await sendOrderConfirmationEmail("buyer@example.com", makeOrder({}));

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Destination.ToAddresses).toContain("buyer@example.com");
    expect(command.Source).toBe(emailConfig.sesFromEmail);
  });

  it("includes the order ID prefix in the subject", async () => {
    mockSend.mockResolvedValue({});
    const order = makeOrder({});

    await sendOrderConfirmationEmail("buyer@example.com", order);

    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Message.Subject.Data).toContain(order.id.slice(0, 8).toUpperCase());
  });

  it("includes product names and download URLs in the HTML body", async () => {
    mockSend.mockResolvedValue({});
    const order = makeOrder({});

    await sendOrderConfirmationEmail("buyer@example.com", order);

    const html: string = mockSend.mock.calls[0]?.[0].Message.Body.Html.Data;
    expect(html).toContain("Cool Asset");
    expect(html).toContain("Another Asset");
    expect(html).toContain("https://s3.example.com/asset1.zip?sig=abc");
    expect(html).toContain("https://s3.example.com/asset2.zip?sig=def");
  });

  it("includes the total amount in the HTML body", async () => {
    mockSend.mockResolvedValue({});

    await sendOrderConfirmationEmail("buyer@example.com", makeOrder({}));

    const html: string = mockSend.mock.calls[0]?.[0].Message.Body.Html.Data;
    expect(html).toContain("29.99");
  });

  it("includes download URLs in the plain-text body", async () => {
    mockSend.mockResolvedValue({});
    const order = makeOrder({});

    await sendOrderConfirmationEmail("buyer@example.com", order);

    const text: string = mockSend.mock.calls[0]?.[0].Message.Body.Text.Data;
    expect(text).toContain("https://s3.example.com/asset1.zip?sig=abc");
    expect(text).toContain("https://s3.example.com/asset2.zip?sig=def");
  });

  it("propagates errors thrown by SES", async () => {
    mockSend.mockRejectedValue(new Error("SES timeout"));

    await expect(
      sendOrderConfirmationEmail("buyer@example.com", makeOrder({}))
    ).rejects.toThrow("SES timeout");
  });
});

describe("sendRefundConfirmationEmail", () => {
  it("sends to the correct recipient with the configured from address", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundConfirmationEmail("buyer@example.com", makeRefund({}));

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Destination.ToAddresses).toContain("buyer@example.com");
    expect(command.Source).toBe(emailConfig.sesFromEmail);
  });

  it("includes the order ID prefix in the subject", async () => {
    mockSend.mockResolvedValue({});
    const refund = makeRefund({});

    await sendRefundConfirmationEmail("buyer@example.com", refund);

    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Message.Subject.Data).toContain(refund.orderId.slice(0, 8).toUpperCase());
  });

  it("includes the refund note and total amount in the HTML body", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundConfirmationEmail("buyer@example.com", makeRefund({}));

    const html: string = mockSend.mock.calls[0]?.[0].Message.Body.Html.Data;
    expect(html).toContain("Not what I expected");
    expect(html).toContain("29.99");
    expect(html).toContain("Cool Asset");
    expect(html).toContain("Another Asset");
  });

  it("includes the refund note in the plain-text body", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundConfirmationEmail("buyer@example.com", makeRefund({}));

    const text: string = mockSend.mock.calls[0]?.[0].Message.Body.Text.Data;
    expect(text).toContain("Not what I expected");
    expect(text).toContain("29.99");
  });

  it("propagates errors thrown by SES", async () => {
    mockSend.mockRejectedValue(new Error("SES timeout"));

    await expect(
      sendRefundConfirmationEmail("buyer@example.com", makeRefund({}))
    ).rejects.toThrow("SES timeout");
  });
});

describe("sendRefundDeniedEmail", () => {
  it("sends to the correct recipient with the configured from address", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundDeniedEmail("buyer@example.com", makeRefundDenied({}));

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Destination.ToAddresses).toContain("buyer@example.com");
    expect(command.Source).toBe(emailConfig.sesFromEmail);
  });

  it("includes the order ID prefix in the subject", async () => {
    mockSend.mockResolvedValue({});
    const data = makeRefundDenied({});

    await sendRefundDeniedEmail("buyer@example.com", data);

    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Message.Subject.Data).toContain(data.orderId.slice(0, 8).toUpperCase());
  });

  it("includes the customer note and admin note in the HTML body", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundDeniedEmail("buyer@example.com", makeRefundDenied({}));

    const html: string = mockSend.mock.calls[0]?.[0].Message.Body.Html.Data;
    expect(html).toContain("Not what I expected");
    expect(html).toContain("Outside return policy");
    expect(html).toContain("29.99");
    expect(html).toContain("Cool Asset");
    expect(html).toContain("Another Asset");
  });

  it("includes the admin note in the plain-text body when present", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundDeniedEmail("buyer@example.com", makeRefundDenied({}));

    const text: string = mockSend.mock.calls[0]?.[0].Message.Body.Text.Data;
    expect(text).toContain("Admin Note: Outside return policy");
  });

  it("omits admin note from plain-text body when empty", async () => {
    mockSend.mockResolvedValue({});

    await sendRefundDeniedEmail("buyer@example.com", makeRefundDenied({ adminNote: "" }));

    const text: string = mockSend.mock.calls[0]?.[0].Message.Body.Text.Data;
    expect(text).not.toContain("Admin Note:");
  });

  it("propagates errors thrown by SES", async () => {
    mockSend.mockRejectedValue(new Error("SES timeout"));

    await expect(
      sendRefundDeniedEmail("buyer@example.com", makeRefundDenied({}))
    ).rejects.toThrow("SES timeout");
  });
});
