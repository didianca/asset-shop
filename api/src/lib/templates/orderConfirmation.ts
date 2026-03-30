export type OrderConfirmationItem = {
  productName: string;
  unitPrice: string;
  downloadUrl: string;
};

export type OrderConfirmationData = {
  id: string;
  createdAt: Date;
  totalAmount: string;
  items: OrderConfirmationItem[];
};

export function orderConfirmationHtml(order: OrderConfirmationData): string {
  const formattedDate = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${item.productName}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">$${item.unitPrice}</td>
        </tr>`
    )
    .join("");

  const downloadLinks = order.items
    .map(
      (item) => `
        <div style="margin-bottom:12px;">
          <a href="${item.downloadUrl}"
             style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:14px;font-weight:bold;">
            Download ${item.productName}
          </a>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">Asset Shop</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;">Your order is confirmed!</h2>
      <p style="color:#666;margin:0 0 32px;font-size:14px;">
        Thank you for your purchase. Your downloads are ready below.
      </p>

      <h3 style="font-size:15px;border-bottom:2px solid #eee;padding-bottom:10px;margin:0 0 16px;">Invoice</h3>
      <table style="width:100%;font-size:13px;margin-bottom:16px;color:#555;">
        <tr>
          <td style="padding:4px 0;">Order ID</td>
          <td style="text-align:right;font-family:monospace;font-size:12px;">${order.id}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Date</td>
          <td style="text-align:right;">${formattedDate}</td>
        </tr>
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
            <td style="padding:12px 0;font-weight:700;border-top:2px solid #1a1a1a;">Total</td>
            <td style="text-align:right;padding:12px 0;font-weight:700;border-top:2px solid #1a1a1a;">$${order.totalAmount}</td>
          </tr>
        </tfoot>
      </table>

      <h3 style="font-size:15px;border-bottom:2px solid #eee;padding-bottom:10px;margin:32px 0 8px;">Your Downloads</h3>
      <p style="color:#888;font-size:13px;margin:0 0 20px;">
        Links expire in 7 days — download your files and store them safely.
      </p>
      ${downloadLinks}
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;text-align:center;color:#bbb;font-size:12px;">
      Asset Shop &mdash; Questions? Reply to this email.
    </div>
  </div>
</body>
</html>`;
}
