import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const INK = "#0a0a09";
const MARK = "#f5f4f2";

function iconSvg({ size, pad }) {
  const inner = size - pad * 2;
  const s = inner / 192; // scale factor from a 192-unit design
  const p = pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${p} ${p}) scale(${s})" stroke="${MARK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <polyline points="40,136 78,96 104,118 152,58"/>
      <polyline points="120,58 152,58 152,90"/>
    </g>
    <circle cx="${p + 40 * s}" cy="${p + 136 * s}" r="${8 * s}" fill="${MARK}"/>
    <circle cx="${p + 104 * s}" cy="${p + 118 * s}" r="${8 * s}" fill="${MARK}"/>
  </svg>`;
}

async function make(name, size, pad) {
  await sharp(Buffer.from(iconSvg({ size, pad })))
    .png()
    .toFile(`public/icons/${name}`);
  console.log("wrote", name);
}

async function main() {
  await make("icon-192.png", 192, 0);
  await make("icon-512.png", 512, 0);
  await make("maskable-192.png", 192, 28); // safe-zone padding for maskable
  await make("maskable-512.png", 512, 74);
  await make("apple-touch-icon.png", 180, 0);

  // favicon: small flat version
  await sharp(Buffer.from(iconSvg({ size: 64, pad: 0 })))
    .png()
    .toFile("public/icons/favicon.png");
}

main();
