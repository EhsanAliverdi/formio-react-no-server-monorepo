/**
 * Generates name→SVG JSON files for each icon pack from react-icons .mjs source.
 * Output goes to HPA.SurveyFlow.Api/icons/{pack}.json
 * Usage: node scripts/generate-icon-svgs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactIconsRoot = path.join(__dirname, '../HPA.SurveyFlow.Web/node_modules/react-icons');
const outputDir = path.join(__dirname, '../HPA.SurveyFlow.Api/icons');

const packs = [
  'fa', 'md', 'ai', 'bs', 'bi', 'cg', 'di', 'fc', 'fi',
  'gi', 'go', 'gr', 'hi', 'im', 'io', 'io5', 'lu', 'pi',
  'ri', 'rx', 'si', 'sl', 'tb', 'ti', 'tfi', 'vsc', 'wi', 'lia'
];

function buildSvgString(node) {
  if (!node) return '';
  const tag = node.tag;
  if (!tag || tag === 'svg') {
    // recurse into children only for root svg node
    return (node.child || []).map(buildSvgString).join('');
  }
  const attrs = Object.entries(node.attr || {})
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const children = (node.child || []).map(buildSvgString).join('');
  return `<${tag}${attrs ? ' ' + attrs : ''}>${children}</${tag}>`;
}

function extractIconsFromMjs(mjsSource) {
  const result = {};
  // Match: export function IconName (props) { return GenIcon({...})(props); };
  const fnRegex = /export function (\w+)\s*\(props\)\s*\{\s*return GenIcon\((\{[\s\S]*?\})\)\(props\);\s*\};/g;
  let match;
  while ((match = fnRegex.exec(mjsSource)) !== null) {
    const name = match[1];
    try {
      const data = JSON.parse(match[2]);
      const viewBox = data.attr?.viewBox || '0 0 24 24';
      const inner = (data.child || []).map(buildSvgString).join('');
      result[name] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${inner}</svg>`;
    } catch {
      // skip malformed
    }
  }
  return result;
}

let total = 0;
for (const pack of packs) {
  const mjsPath = path.join(reactIconsRoot, pack, 'index.mjs');
  if (!fs.existsSync(mjsPath)) {
    console.warn(`Skipping ${pack} — index.mjs not found`);
    continue;
  }
  const src = fs.readFileSync(mjsPath, 'utf8');
  const icons = extractIconsFromMjs(src);
  const count = Object.keys(icons).length;
  if (count === 0) {
    console.warn(`Skipping ${pack} — no icons extracted`);
    continue;
  }
  const outPath = path.join(outputDir, `${pack}.json`);
  fs.writeFileSync(outPath, JSON.stringify(icons));
  console.log(`${pack}: ${count} icons → ${outPath}`);
  total += count;
}
console.log(`\nDone. ${total} icons total.`);
