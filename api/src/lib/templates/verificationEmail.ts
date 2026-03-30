export function verificationEmailHtml(verificationUrl: string): string {
  return `
    <h2>Welcome to Asset Shop</h2>
    <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
    <a href="${verificationUrl}">Verify my account</a>
    <p>If you did not create an account, you can safely ignore this email.</p>
  `;
}
