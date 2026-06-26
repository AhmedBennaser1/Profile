#!/usr/bin/env node
// build.js — Scans content/ for .md files, generates data.js + individual post pages.

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const WRITEUPS_DIR = path.join(ROOT, 'content', 'writeups');
const NOTES_DIR = path.join(ROOT, 'content', 'notes');
const POSTS_OUT = path.join(ROOT, 'posts');
const OUTPUT = path.join(ROOT, 'data.js');

// Configure marked for code highlighting friendly output
marked.setOptions({
  gfm: true,
  breaks: true
});

function parseFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    console.warn(`⚠ No frontmatter in ${path.basename(filePath)}, skipping.`);
    return null;
  }

  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  });

  // Get markdown body (everything after frontmatter)
  const body = raw.replace(/^---\n[\s\S]*?\n---\n*/, '');

  const slug = path.basename(filePath, '.md');

  return {
    title: meta.title || 'Untitled',
    category: meta.category || 'post',
    date: meta.date || '2025-01-01',
    excerpt: meta.excerpt || '',
    tags: (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    slug: slug,
    body: body
  };
}

function postTemplate(post) {
  const htmlBody = marked.parse(post.body);
  const tags = post.tags.map(t => `<span class="post-tag">#${t}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title} — natashi</title>
  <meta name="description" content="${post.excerpt}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
</head>
<body>

  <canvas id="particles"></canvas>

  <nav class="navbar">
    <a href="../index.html" class="nav-logo">
      <span class="logo-bracket">[</span>natashi<span class="logo-bracket">]</span>
    </a>
    <div class="nav-links">
      <a href="../index.html" class="nav-link">Home</a>
      <a href="../writeups.html" class="nav-link">Writeups</a>
      <a href="../notes.html" class="nav-link">Notes</a>
      <a href="../about.html" class="nav-link">About</a>
    </div>
  </nav>

  <main class="container page-content">
    <article class="post-article">
      <div class="post-article-header">
        <a href="../${post.category === 'writeup' ? 'writeups' : 'notes'}.html" class="back-link">← Back to ${post.category === 'writeup' ? 'Writeups' : 'Notes'}</a>
        <div class="post-article-meta">
          <span class="post-category">${post.category}</span>
          <span class="post-date">${post.date}</span>
        </div>
        <h1 class="post-article-title">${post.title}</h1>
        <div class="post-tags">${tags}</div>
      </div>
      <div class="post-article-body">
        ${htmlBody}
      </div>
    </article>
  </main>

  <footer class="footer">
    <p>© 2025 natashi — built with ☕ and curiosity</p>
  </footer>

  <script src="../script.js"></script>
</body>
</html>`;
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => parseFrontmatter(path.join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Image/media file extensions to copy alongside posts
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

function copyImages(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;
  fs.readdirSync(srcDir).forEach(f => {
    const ext = path.extname(f).toLowerCase();
    if (IMAGE_EXTS.includes(ext)) {
      fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
      count++;
    }
  });
  return count;
}

// Clean old posts and images
if (fs.existsSync(POSTS_OUT)) {
  fs.readdirSync(POSTS_OUT).forEach(f => {
    const ext = path.extname(f).toLowerCase();
    if (f.endsWith('.html') || IMAGE_EXTS.includes(ext)) {
      fs.unlinkSync(path.join(POSTS_OUT, f));
    }
  });
} else {
  fs.mkdirSync(POSTS_OUT, { recursive: true });
}

const writeups = scanDir(WRITEUPS_DIR);
const notes = scanDir(NOTES_DIR);

// Generate individual post pages
const allPosts = [...writeups, ...notes];
allPosts.forEach(post => {
  const html = postTemplate(post);
  fs.writeFileSync(path.join(POSTS_OUT, `${post.slug}.html`), html, 'utf-8');
});

// Copy images from content dirs into posts/ so relative paths resolve
let imgCount = 0;
imgCount += copyImages(WRITEUPS_DIR, POSTS_OUT);
imgCount += copyImages(NOTES_DIR, POSTS_OUT);
console.log(`✓ Copied ${imgCount} image(s) to posts/`);

// Generate data.js (without body content, just metadata for listings)
const cleanWriteups = writeups.map(({ body, ...rest }) => rest);
const cleanNotes = notes.map(({ body, ...rest }) => rest);

const output = `// Auto-generated by build.js — do not edit manually.
// To add content, create .md files in content/writeups/ or content/notes/
const writeups = ${JSON.stringify(cleanWriteups, null, 2)};

const notes = ${JSON.stringify(cleanNotes, null, 2)};
`;

fs.writeFileSync(OUTPUT, output, 'utf-8');
console.log(`✓ Built data.js — ${writeups.length} writeups, ${notes.length} notes`);
console.log(`✓ Generated ${allPosts.length} post pages in posts/`);
