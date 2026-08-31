import sharp from "sharp";
import { mkdirSync, copyFileSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Source: 1024x1024, black rounded-square tile with a white "L" mark,
// transparent corners. Regular icons use it as-is (the rounded corners read
// fine against any background); maskable icons need a full-bleed square
// background instead, since the OS applies its own mask shape - composited
// onto a solid black canvas here so nothing but the "L" itself is scaled
// down into the safe zone.
const SRC = "assets/logo/ledger-icon-black.png";
const SRC_WHITE = "assets/logo/ledger-icon-white.png";

async function plain(name, size) {
  await sharp(SRC).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log("wrote", name);
}

async function maskable(name, size) {
  const inner = Math.round(size * 0.7); // safe-zone padding for circular/squircle crops
  const iconBuf = await sharp(SRC).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } })
    .composite([{ input: iconBuf, gravity: "center" }])
    .png()
    .toFile(`public/icons/${name}`);
  console.log("wrote", name);
}

async function main() {
  await plain("icon-192.png", 192);
  await plain("icon-512.png", 512);
  await maskable("maskable-192.png", 192);
  await maskable("maskable-512.png", 512);
  await plain("apple-touch-icon.png", 180);
  await plain("favicon.png", 64);

  // Next.js file-convention icons (src/app/icon.png, apple-icon.png) mirror
  // the same generated sizes.
  copyFileSync("public/icons/icon-192.png", "src/app/icon.png");
  copyFileSync("public/icons/apple-touch-icon.png", "src/app/apple-icon.png");
  console.log("synced src/app/icon.png and apple-icon.png");

  // Small inline brand marks (login screen, header) - black-tile for light
  // theme, white-tile for dark, swapped via CSS in globals.css.
  await sharp(SRC).resize(96, 96).png().toFile("public/brand-mark-black.png");
  await sharp(SRC_WHITE).resize(96, 96).png().toFile("public/brand-mark-white.png");
  console.log("wrote brand-mark-black.png, brand-mark-white.png");
}

main();
