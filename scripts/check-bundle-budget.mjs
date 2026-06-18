import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");
const budgets = [
  { match: /^index-.*\.js$/, maxKb: 500, label: "main app chunk" },
  { match: /^vendor-three-.*\.js$/, maxKb: 750, label: "async Three.js chunk" }
];

const files = await readdir(assetsDir);
const failures = [];

for (const budget of budgets) {
  const file = files.find((candidate) => budget.match.test(candidate));
  if (!file) {
    failures.push(`${budget.label}: chunk not found`);
    continue;
  }
  const { size } = await stat(join(assetsDir, file));
  const sizeKb = size / 1024;
  if (sizeKb > budget.maxKb) {
    failures.push(`${budget.label}: ${sizeKb.toFixed(1)} kB exceeds ${budget.maxKb} kB`);
  } else {
    console.log(`${budget.label}: ${sizeKb.toFixed(1)} kB / ${budget.maxKb} kB`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
