import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendVerificationEmail } from "../../../lib/email.js";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn().mockImplementation((params) => params),
}));

beforeEach(() => {
  mockSend.mockReset();
});

describe("sendVerificationEmail", () => {
  it("calls SES send with the recipient address and configured from address", async () => {
    mockSend.mockResolvedValue({});

    await sendVerificationEmail("user@example.com", "abc123token");

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0]?.[0];
    expect(command.Destination.ToAddresses).toContain("user@example.com");
    expect(command.Source).toBe(process.env["SES_FROM_EMAIL"]);
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
