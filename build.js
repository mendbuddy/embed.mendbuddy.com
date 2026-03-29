const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const sharedTarget = ['es2022', 'chrome105', 'firefox105', 'safari16'];

async function build() {
  // Ensure dist directories exist
  fs.mkdirSync('dist/v1', { recursive: true });
  fs.mkdirSync('dist/w', { recursive: true });

  // ── 1. Thin loader (chat.js) — vanilla JS, no Preact ──────────────
  const loaderOptions = {
    entryPoints: ['src/loader.ts'],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    globalName: 'MendBuddyChat',
    target: sharedTarget,
    outfile: 'dist/v1/chat.js',
    loader: { '.ts': 'ts' },
    define: { 'process.env.NODE_ENV': '"production"' },
  };

  // ── 2. Widget bundle (full Preact app for iframe) ─────────────────
  const widgetOptions = {
    entryPoints: ['src/widget-entry.tsx'],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    target: sharedTarget,
    outfile: 'dist/w/widget.js',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: { 'process.env.NODE_ENV': '"production"' },
    inject: ['./src/preact-shim.js'],
  };

  // ── 3. Voice bundle (loaded on demand inside iframe) ──────────────
  const voiceOptions = {
    entryPoints: ['src/voice/index.ts'],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    globalName: '__MendBuddyVoice',
    target: sharedTarget,
    outfile: 'dist/w/voice.js',
    loader: { '.ts': 'ts' },
    define: { 'process.env.NODE_ENV': '"production"' },
  };

  if (isWatch) {
    const loaderCtx = await esbuild.context(loaderOptions);
    await loaderCtx.watch();
    const widgetCtx = await esbuild.context(widgetOptions);
    await widgetCtx.watch();
    try {
      const voiceCtx = await esbuild.context(voiceOptions);
      await voiceCtx.watch();
    } catch {}
    console.log('Watching for changes...');
  } else {
    // Build all bundles
    await esbuild.build(loaderOptions);
    const loaderStats = fs.statSync('dist/v1/chat.js');
    console.log(`Built dist/v1/chat.js [loader] (${(loaderStats.size / 1024).toFixed(1)} KB)`);

    await esbuild.build(widgetOptions);
    const widgetStats = fs.statSync('dist/w/widget.js');
    console.log(`Built dist/w/widget.js [widget] (${(widgetStats.size / 1024).toFixed(1)} KB)`);

    try {
      await esbuild.build(voiceOptions);
      const voiceStats = fs.statSync('dist/w/voice.js');
      console.log(`Built dist/w/voice.js [voice] (${(voiceStats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.log('Skipping voice bundle');
    }

    // Copy iframe HTML
    fs.copyFileSync('src/widget-frame.html', 'dist/w/index.html');
    console.log('Copied widget-frame.html to dist/w/index.html');

    // Legacy compat
    fs.copyFileSync('dist/v1/chat.js', 'dist/mendbuddy-chat-widget.js');
    console.log('Copied to dist/mendbuddy-chat-widget.js (legacy compat)');

    // Copy public files (_headers, _redirects, etc.)
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      for (const file of fs.readdirSync(publicDir)) {
        fs.copyFileSync(path.join(publicDir, file), path.join('dist', file));
        console.log(`Copied public/${file} to dist/`);
      }
    }

    // Gzipped sizes
    try {
      const { execSync } = require('child_process');
      const loaderGz = execSync('gzip -c dist/v1/chat.js | wc -c', { encoding: 'utf-8' }).trim();
      console.log(`Loader gzipped: ~${(parseInt(loaderGz) / 1024).toFixed(1)} KB`);
      const widgetGz = execSync('gzip -c dist/w/widget.js | wc -c', { encoding: 'utf-8' }).trim();
      console.log(`Widget gzipped: ~${(parseInt(widgetGz) / 1024).toFixed(1)} KB`);
    } catch {}
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
