#!/usr/bin/env node
// import-sysreptor.js — Converts SysReptor exports (.tar.gz or .json) into blog .md files.
//
// Usage:
//   node import-sysreptor.js <export.tar.gz|export.json> [options]
//
// What it does:
//   1. Extracts .tar.gz (or reads .json directly)
//   2. For each note, creates a .md file in content/writeups/ or content/notes/
//   3. Rewrites image paths and strips SysReptor-specific attributes
//   4. Copies image files automatically

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;

// --- Parse CLI args ---
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage: node import-sysreptor.js <export.tar.gz|export.json> [options]

Options:
  --category <writeup|note>   Category for the posts (default: writeup)
  --tags <tag1,tag2>          Tags to apply to all imported notes
  --dry-run                   Preview what would be created without writing files

Examples:
  node import-sysreptor.js notes-payloads-.tar.gz
  node import-sysreptor.js notes-payloads-.tar.gz --category note --tags ad,windows
  node import-sysreptor.js export.json --dry-run
  `);
  process.exit(0);
}

const inputPath = path.resolve(args[0]);
let category = 'writeup';
let tags = '';
let dryRun = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) { category = args[++i]; }
  else if (args[i] === '--tags' && args[i + 1]) { tags = args[++i]; }
  else if (args[i] === '--dry-run') { dryRun = true; }
}

const contentDir = category === 'note'
  ? path.join(ROOT, 'content', 'notes')
  : path.join(ROOT, 'content', 'writeups');

// --- Handle .tar.gz extraction ---
let jsonPath;
let extractDir;

if (inputPath.endsWith('.tar.gz') || inputPath.endsWith('.tgz')) {
  // Extract to a temp directory inside the project
  extractDir = path.join(ROOT, '.sysreptor-tmp');
  if (fs.existsSync(extractDir)) {
    execSync(`rm -rf "${extractDir}"`);
  }
  fs.mkdirSync(extractDir, { recursive: true });

  console.log(`Extracting ${path.basename(inputPath)}...`);
  execSync(`tar -xzf "${inputPath}" -C "${extractDir}"`);

  // Find the .json file inside
  const files = fs.readdirSync(extractDir);
  const jsonFile = files.find(f => f.endsWith('.json'));
  if (!jsonFile) {
    console.error('✗ No .json file found in archive.');
    execSync(`rm -rf "${extractDir}"`);
    process.exit(1);
  }
  jsonPath = path.join(extractDir, jsonFile);

  console.log(`Found: ${jsonFile}\n`);
} else if (inputPath.endsWith('.json')) {
  jsonPath = inputPath;
} else {
  console.error('✗ Unsupported file type. Provide a .tar.gz or .json file.');
  process.exit(1);
}

// --- Read & parse JSON ---
if (!fs.existsSync(jsonPath)) {
  console.error(`✗ File not found: ${jsonPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const notes = data.notes || [];
const imagesMeta = data.images || [];

if (notes.length === 0) {
  console.log('⚠ No notes found in export.');
  cleanup();
  process.exit(0);
}

console.log(`Found ${notes.length} note(s) and ${imagesMeta.length} image(s) in export.\n`);

// Build image name → id lookup
const imageMap = {};
imagesMeta.forEach(img => {
  imageMap[img.name] = img.id;
});

// Build list of directories to search for images
const imageSearchDirs = [];
if (extractDir) {
  // Look in <uuid>-images/ directories extracted from tar.gz
  fs.readdirSync(extractDir).forEach(f => {
    const fp = path.join(extractDir, f);
    if (fs.statSync(fp).isDirectory()) {
      imageSearchDirs.push(fp);
    }
  });
  imageSearchDirs.push(extractDir);
}
// Also check next to the input file
imageSearchDirs.push(path.dirname(inputPath));

// --- Process each note ---
let created = 0;
let imagesCopied = 0;
let imagesMissing = 0;

notes.forEach(note => {
  const title = (note.title || 'Untitled').trim();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const date = note.created ? note.created.slice(0, 10) : new Date().toISOString().slice(0, 10);

  let body = note.text || '';

  // --- Clean up SysReptor-specific markdown ---

  // Strip {width="auto"} and similar Pandoc attributes from images
  body = body.replace(/\{[^}]*width[^}]*\}/g, '');

  // Collect image filenames referenced in this note
  const referencedImages = [];
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  // Rewrite image paths: /images/name/filename.png → filename.png
  body = body.replace(imgRegex, (full, alt, src) => {
    const filename = path.basename(src);
    referencedImages.push(filename);
    return `![${alt}](${filename})`;
  });

  // Build frontmatter
  const excerpt = body
    .replace(/[#`*\[\]!()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 120);

  const frontmatter = [
    '---',
    `title: "${title}"`,
    `date: ${date}`,
    `category: ${category}`,
    `tags: ${tags}`,
    `excerpt: "${excerpt}..."`,
    '---',
    '',
  ].join('\n');

  const mdContent = frontmatter + body + '\n';
  const mdPath = path.join(contentDir, `${slug}.md`);

  if (dryRun) {
    console.log(`[DRY RUN] Would create: ${slug}.md (${referencedImages.length} images)`);
    referencedImages.forEach(img => console.log(`  → ${img}`));
    return;
  }

  // Ensure content directory exists
  fs.mkdirSync(contentDir, { recursive: true });

  // Write .md file
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✓ Created: ${slug}.md`);
  created++;

  // Copy images
  referencedImages.forEach(imgName => {
    const destPath = path.join(contentDir, imgName);

    // Search all candidate directories for the image
    let found = null;
    for (const dir of imageSearchDirs) {
      const candidate = path.join(dir, imgName);
      if (fs.existsSync(candidate)) {
        found = candidate;
        break;
      }
    }

    if (found) {
      fs.copyFileSync(found, destPath);
      console.log(`  ✓ Copied image: ${imgName}`);
      imagesCopied++;
    } else {
      console.warn(`  ⚠ Image not found: ${imgName}`);
      imagesMissing++;
    }
  });
});

console.log(`\n━━━ Summary ━━━`);
console.log(`Notes created:  ${created}`);
console.log(`Images copied:  ${imagesCopied}`);
if (imagesMissing > 0) {
  console.log(`Images missing: ${imagesMissing}`);
}
if (created > 0 && !dryRun) {
  console.log(`\nNext step: run ./publish.sh to build and deploy!`);
}

cleanup();

function cleanup() {
  if (extractDir && fs.existsSync(extractDir)) {
    execSync(`rm -rf "${extractDir}"`);
  }
}
