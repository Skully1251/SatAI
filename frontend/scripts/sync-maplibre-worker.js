/**
 * Copies MapLibre's web-worker bundles into public/maplibre/ so the app can
 * spawn the worker from a same-origin URL.
 *
 * Why: the worker ships as an ES module that imports a sibling chunk
 * (`import {...} from "./maplibre-gl-shared.mjs"`), so it must be served from
 * a real URL where that relative import resolves. Metro's query-string asset
 * URLs can't host it (the relative import would 404). Expo serves public/ at
 * the site root on web, which makes the relative import resolve naturally.
 *
 * Runs automatically via npm postinstall; also runnable by hand after
 * upgrading maplibre-gl.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const outDir = path.resolve(__dirname, '..', 'public', 'maplibre');
const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

fs.mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const src = path.join(srcDir, file);
  if (!fs.existsSync(src)) {
    console.error(`[sync-maplibre-worker] missing ${src} — is maplibre-gl installed?`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(outDir, file));
  console.log(`[sync-maplibre-worker] ${file} -> public/maplibre/${file}`);
}
