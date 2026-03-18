import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

// Copy manifest
copyFileSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
console.log('✓ Copied manifest.json');

// Copy icons if they exist
const iconsDir = resolve(root, 'icons');
const distIconsDir = resolve(dist, 'icons');
if (existsSync(iconsDir)) {
  mkdirSync(distIconsDir, { recursive: true });
  for (const size of ['16', '48', '128']) {
    const src = resolve(iconsDir, `icon-${size}.png`);
    if (existsSync(src)) {
      copyFileSync(src, resolve(distIconsDir, `icon-${size}.png`));
      console.log(`✓ Copied icon-${size}.png`);
    }
  }
}
