const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  const options = {
    entryPoints: ['src/index.tsx'],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    globalName: 'MendBuddyChat',
    target: ['es2022', 'chrome105', 'firefox105', 'safari16'],
    outfile: 'dist/v1/chat.js',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    // Inject Preact imports for JSX
    inject: ['./src/preact-shim.js'],
  };

  // Ensure dist directories exist
  fs.mkdirSync('dist/v1', { recursive: true });

  // Voice bundle (loaded on demand when user starts a call)
  const voiceOptions = {
    entryPoints: ['src/voice/index.ts'],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    globalName: '__MendBuddyVoice',
    target: ['es2022', 'chrome105', 'firefox105', 'safari16'],
    outfile: 'dist/v1/voice.js',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  };

  if (isWatch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    // Also watch voice bundle
    try {
      const voiceCtx = await esbuild.context(voiceOptions);
      await voiceCtx.watch();
    } catch (e) {
      console.log('Voice bundle not ready yet (src/voice/index.ts may not exist)');
    }
    console.log('Watching for changes...');
  } else {
    await esbuild.build(options);
    const stats = fs.statSync('dist/v1/chat.js');
    console.log(`Built dist/v1/chat.js (${(stats.size / 1024).toFixed(1)} KB)`);

    // Build voice bundle
    try {
      await esbuild.build(voiceOptions);
      const voiceStats = fs.statSync('dist/v1/voice.js');
      console.log(`Built dist/v1/voice.js (${(voiceStats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.log('Skipping voice bundle (src/voice/index.ts not found)');
    }

    // Copy to legacy path for backwards compatibility
    fs.copyFileSync('dist/v1/chat.js', 'dist/mendbuddy-chat-widget.js');
    console.log('Copied to dist/mendbuddy-chat-widget.js (legacy compat)');

    // Copy public files (Cloudflare Pages _headers, etc.) into dist
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      for (const file of fs.readdirSync(publicDir)) {
        fs.copyFileSync(path.join(publicDir, file), path.join('dist', file));
        console.log(`Copied public/${file} to dist/`);
      }
    }

    // Show gzipped size estimate
    try {
      const { execSync } = require('child_process');
      const gzipSize = execSync('gzip -c dist/v1/chat.js | wc -c', { encoding: 'utf-8' }).trim();
      console.log(`Gzipped: ~${(parseInt(gzipSize) / 1024).toFixed(1)} KB`);
    } catch (e) {
      // gzip not available
    }
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
