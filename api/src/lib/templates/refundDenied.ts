export type RefundDeniedItem = {
  productName: string;
  unitPrice: string;
};

export type RefundDeniedData = {
  orderId: string;
  totalAmount: string;
  customerNote: string;
  adminNote: string;
  items: RefundDeniedItem[];
};

export function refundDeniedHtml(data: RefundDeniedData): string {
  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${item.productName}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">$${item.unitPrice}</td>
        </tr>`
    )
    .join("");

  const adminNoteSection = data.adminNote
    ? `<tr>
          <td style="padding:4px 0;">Admin Note</td>
          <td style="text-align:right;">${data.adminNote}</td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">Asset Shop</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;">Your refund request has been denied</h2>
      <p style="color:#666;margin:0 0 32px;font-size:14px;">
        We reviewed your refund request and were unable to approve it at this time. If you have questions, please reply to this email.
      </p>

      <h3 style="font-size:15px;border-bottom:2px solid #eee;padding-bottom:10px;margin:0 0 16px;">Request Details</h3>
      <table style="width:100%;font-size:13px;margin-bottom:16px;color:#555;">
        <tr>
          <td style="padding:4px 0;">Order ID</td>
          <td style="text-align:right;font-family:monospace;font-size:12px;">${data.orderId}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Your Reason</td>
          <td style="text-align:right;">${data.customerNote}</td>
        </tr>
        ${adminNoteSection}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;">Item</th>
            <th style="text-align:right;padding:8px 0;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td style="padding:12px 0;font-weight:700;border-top:2px solid #1a1a1a;">Order Total</td>
            <td style="text-align:right;padding:12px 0;font-weight:700;border-top:2px solid #1a1a1a;">$${data.totalAmount}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;text-align:center;color:#bbb;font-size:12px;">
      Asset Shop &mdash; Questions? Reply to this email.
    </div>
  </div>
</body>
</html>`;
}
