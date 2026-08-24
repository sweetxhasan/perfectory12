// One-off build helper: rasterizes public/icon.svg (the source-of-truth
// vector brand mark) into the raster sizes Next.js metadata + browsers need.
// Not imported by the app — run manually with `node scripts/render-icons.mjs`
// whenever public/icon.svg changes.
import sharp from "sharp"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, "..", "public")
const svg = readFileSync(path.join(publicDir, "icon.svg"))
const appleSvg = readFileSync(path.join(publicDir, "icon-apple-source.svg"))

async function render(name, size, source = svg) {
  await sharp(source, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, name))
  console.log(`[v0] rendered ${name} (${size}x${size})`)
}

async function main() {
  // Favicon — same badge works on both light and dark browser chrome since
  // it carries its own gradient background.
  await render("icon-light-32x32.png", 32)
  await render("icon-dark-32x32.png", 32)
  // iOS home-screen icon — full-bleed, no transparency (see icon-apple-source.svg).
  await render("apple-icon.png", 180, appleSvg)
  // Larger master PNG for any raster use (marketing/OG images, etc).
  await render("logo-mark-512.png", 512)
}

main()
