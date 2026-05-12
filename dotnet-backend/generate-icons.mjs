/**
 * Generates icon JSON data files for the .NET backend IconsController.
 * Run: node generate-icons.mjs
 * Reads from ../../frontend/node_modules/react-icons/
 * Writes to ./icons/{pack}.json (array of icon names)
 * Writes to ./icons/{pack}.svg.json (map of icon name → SVG string)
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const reactIconsDir = join(__dir, 'node_modules/react-icons');
const outputDir = join(__dir, 'SurveyFlow.Api/icons');

const PACKS = [
  'fa', 'md', 'ai', 'bs', 'bi', 'cg', 'di', 'fc', 'fi', 'gi', 'go', 'gr',
  'hi', 'im', 'io', 'io5', 'lu', 'pi', 'ri', 'rx', 'si', 'sl', 'tb', 'ti',
  'tfi', 'vsc', 'wi', 'lia', 'fa6', 'hi2', 'ci', 'tb'
];

async function getSvgPathData(packDir) {
  // react-icons stores data in lib/cjs/index.js or similar
  // Each icon is exported as: export { IconName }
  // The actual SVG data is in the package's data files
  const files = await readdir(packDir).catch(() => []);

  // Look for index.js which exports the icon components
  const indexFile = files.find(f => f === 'index.js');
  if (!indexFile) return {};

  const content = await readFile(join(packDir, indexFile), 'utf8').catch(() => '');

  // Extract icon names from exports
  const iconNames = [];
  const exportRegex = /(?:exports\.(\w+)|export\s+(?:function|const|class)\s+(\w+))/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name && /^[A-Z]/.test(name)) {
      iconNames.push(name);
    }
  }

  return iconNames;
}

async function extractIconsFromPack(pack) {
  const packDir = join(reactIconsDir, pack);
  const files = await readdir(packDir).catch(() => []);

  if (!files.length) return [];

  // Try to get names from index.esm.js (ES module format - cleaner)
  const esmFile = files.find(f => f === 'index.esm.js');
  const jsFile = files.find(f => f === 'index.js');
  const targetFile = esmFile || jsFile;

  if (!targetFile) return [];

  const content = await readFile(join(packDir, targetFile), 'utf8').catch(() => '');

  const iconNames = new Set();

  // Match export patterns: export { Fa... }, exports.Fa... =, function Fa...
  const patterns = [
    /exports\.([A-Z][A-Za-z0-9]+)\s*=/g,
    /export\s+(?:function|var|const|class)\s+([A-Z][A-Za-z0-9]+)/g,
    /export\s*\{([^}]+)\}/g,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      if (m[1] && m[1].includes(',')) {
        // Multiple exports in one block
        m[1].split(',').forEach(n => {
          const name = n.trim().split(/\s+as\s+/)[0].trim();
          if (/^[A-Z][A-Za-z0-9]+$/.test(name)) iconNames.add(name);
        });
      } else if (m[1] && /^[A-Z]/.test(m[1])) {
        iconNames.add(m[1]);
      }
    }
  }

  return [...iconNames].sort();
}

async function extractSvgData(pack) {
  const packDir = join(reactIconsDir, pack);
  const files = await readdir(packDir).catch(() => []);

  // react-icons stores icon data in a lib directory or as CommonJS exports
  // The format is: { tag: 'svg', attr: {...}, child: [...] }
  const jsFile = files.find(f => f === 'index.js');
  if (!jsFile) return {};

  const content = await readFile(join(packDir, jsFile), 'utf8').catch(() => '');

  // Extract icon data: exports.FaBeer = function FaBeer(props) { return GenIcon({...})(props); }
  // The GenIcon format contains: { tag, attr: { viewBox, ... }, child: [{ tag, attr, child }] }
  const svgMap = {};

  // Match GenIcon calls
  const genIconRegex = /exports\.([A-Z][A-Za-z0-9]+)\s*=\s*function[^(]*\([^)]*\)\s*\{\s*return\s*GenIcon\((\{[^;]+?\})\)/g;
  let m;
  while ((m = genIconRegex.exec(content)) !== null) {
    const name = m[1];
    try {
      const dataStr = m[2].replace(/\n/g, ' ');
      const data = JSON.parse(dataStr.replace(/'/g, '"'));
      svgMap[name] = buildSvg(data);
    } catch {}
  }

  return svgMap;
}

function buildSvg(data) {
  if (!data || !data.tag) return '';
  const attrs = Object.entries(data.attr || {})
    .map(([k, v]) => `${camelToKebab(k)}="${escapeAttr(v)}"`)
    .join(' ');
  const children = (data.child || []).map(buildSvgNode).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${children}</svg>`;
}

function buildSvgNode(node) {
  if (!node || !node.tag) return '';
  const attrs = Object.entries(node.attr || {})
    .map(([k, v]) => `${camelToKebab(k)}="${escapeAttr(v)}"`)
    .join(' ');
  const children = (node.child || []).map(buildSvgNode).join('');
  return children ? `<${node.tag} ${attrs}>${children}</${node.tag}>` : `<${node.tag} ${attrs}/>`;
}

function camelToKebab(str) {
  if (str === 'className') return 'class';
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function escapeAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  console.log(`Writing icon data to ${outputDir}`);

  for (const pack of PACKS) {
    const packDir = join(reactIconsDir, pack);
    const exists = await readdir(packDir).catch(() => null);
    if (!exists) {
      console.log(`  Skipping ${pack} (not found)`);
      continue;
    }

    const names = await extractIconsFromPack(pack);
    if (names.length === 0) {
      console.log(`  Skipping ${pack} (no icons found)`);
      continue;
    }

    // Write names file
    await writeFile(join(outputDir, `${pack}.json`), JSON.stringify(names), 'utf8');
    console.log(`  ${pack}: ${names.length} icons`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
