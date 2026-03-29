import sharp from "sharp";

export async function generateWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();

  const width = metadata.width ?? 400;
  const height = metadata.height ?? 400;

  // Create a diagonal stripe pattern as watermark — no fonts needed
  const stripeWidth = 4;
  const spacing = 20;
  const patternSize = spacing * 2;

  const lines: string[] = [];
  for (let i = -patternSize; i < patternSize * 2; i += spacing) {
    lines.push(
      `<line x1="${i}" y1="0" x2="${i + patternSize}" y2="${patternSize}" stroke="white" stroke-opacity="0.3" stroke-width="${stripeWidth}"/>`
    );
  }

  const patternSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${patternSize}" height="${patternSize}">${lines.join("")}</svg>`
  );

  const tile = await sharp(patternSvg).png().toBuffer();

  const overlay = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: tile, tile: true, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return sharp(imageBuffer)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .toBuffer();
}
