import { describe, it, expect, vi, beforeEach } from "vitest";
import * as paymentsApi from "../../src/api/payments.api";
import apiClient from "../../src/api/client";

vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "get").mockResolvedValue({ data: {} });

describe("payments.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPayment calls POST /payments with orderId", async () => {
    await paymentsApi.createPayment("o1");
    expect(apiClient.post).toHaveBeenCalledWith("/payments", {
      orderId: "o1",
    });
  });

  it("getPayment calls GET /payments/:orderId", async () => {
    await paymentsApi.getPayment("o1");
    expect(apiClient.get).toHaveBeenCalledWith("/payments/o1");
  });
});
