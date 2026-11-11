// One-off: crops the source screenshots from the main portfolio into the sizes this site shows.
import sharp from "sharp";
const SRC = process.argv[2];
const out = "public";
const jobs = [
  // [source, target, resize width, crop height (from the top), format]
  ["images/tututor/showcase/tututor-catalog.jpg", "work/tututor.jpg", 1600, 757],
  ["images/tututor/mobile/familias-tareas.jpg", "work/tututor-mobile.jpg", 720, 1557],
  ["images/illume/showcase/dashboard.png", "work/illume.jpg", 1600, 1014],
  ["images/screens/viloi.jpg", "work/viloi.jpg", 1600, 1000],
  ["images/ali-foodies/compare/after-home.jpg", "work/ali-foodies-after.jpg", 664, 1380],
  ["images/ali-foodies/compare/before-home.jpg", "work/ali-foodies-before.jpg", 664, 1380],
  ["images/screens/jurri.jpg", "work/jurri.jpg", 1200, 750],
  ["images/screens/yaksport.jpg", "work/yaksport.jpg", 1200, 750],
  ["images/screens/crownkabab.png", "work/crown-kabab.jpg", 1200, 750],
  ["images/screens/enomad.png", "work/animated-landing.jpg", 1200, 750],
  ["images/screens/toolkitjar.png", "work/toolkitjar.jpg", 1200, 750],
  ["images/ubaid-portrait.jpg", "me/ubaid.jpg", 900, 976],
];
for (const [from, to, w, h] of jobs) {
  const img = sharp(`${SRC}/${from}`).resize({ width: w });
  const meta = await img.toBuffer({ resolveWithObject: true });
  const height = Math.min(h, meta.info.height);
  await sharp(meta.data)
    .extract({ left: 0, top: 0, width: meta.info.width, height })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`${out}/${to}`);
  console.log(to, meta.info.width, "x", height);
}
