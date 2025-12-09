import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '..', 'public', 'icon.svg');
const publicPath = join(__dirname, '..', 'public');

async function generateIcons() {
  const svgBuffer = readFileSync(svgPath);

  // Generate icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicPath, 'icon-192.png'));
  console.log('✓ Generated icon-192.png');

  // Generate icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicPath, 'icon-512.png'));
  console.log('✓ Generated icon-512.png');

  // Generate apple-touch-icon.png (180x180 for iOS)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicPath, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  console.log('✓ All icons generated successfully!');
}

generateIcons().catch(console.error);
