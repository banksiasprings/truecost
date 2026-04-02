/**
 * generate-twa.js
 * Uses @bubblewrap/core programmatically to generate a TWA Android project
 * from twa-manifest.json — no interactive prompts, CI-safe.
 */
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.resolve('./android-twa');
const MANIFEST_PATH = path.resolve('./twa-manifest.json');

async function main() {
  console.log('Loading TWA manifest...');
  const manifest = await TwaManifest.fromFile(MANIFEST_PATH);
  console.log('Package:', manifest.packageId);
  console.log('Host:', manifest.host);
  console.log('Start URL:', manifest.startUrl);

  // Clean existing project dir
  if (fs.existsSync(PROJECT_DIR)) {
    fs.rmSync(PROJECT_DIR, { recursive: true });
    console.log('Cleaned existing android-twa/');
  }
  fs.mkdirSync(PROJECT_DIR, { recursive: true });

  const log = new ConsoleLog('generate-twa');
  const generator = new TwaGenerator();

  console.log('Generating TWA Android project...');
  await generator.createTwaProject(PROJECT_DIR, manifest);
  console.log('TWA project generated at:', PROJECT_DIR);
}

main().catch(e => {
  console.error('Failed:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
