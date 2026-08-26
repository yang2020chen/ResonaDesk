import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('release builds expose the Tauri custom protocol feature', () => {
  const result = spawnSync(
    'cargo',
    ['metadata', '--no-deps', '--format-version', '1'],
    {
      cwd: path.join(projectDir, 'src-tauri'),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr);

  const metadata = JSON.parse(result.stdout);
  const appPackage = metadata.packages.find((pkg) => pkg.name === 'resona-desk');

  assert.ok(appPackage, 'resona-desk package is missing from cargo metadata');
  assert.deepEqual(
    appPackage.features['custom-protocol'],
    ['tauri/custom-protocol'],
    'release builds must enable Tauri custom-protocol instead of loading devUrl',
  );
});

test('npm, Cargo, and Tauri publish the same application version', async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectDir, 'package.json'), 'utf8'));
  const tauriConfig = JSON.parse(
    await readFile(path.join(projectDir, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const cargoResult = spawnSync(
    'cargo',
    ['metadata', '--no-deps', '--format-version', '1'],
    {
      cwd: path.join(projectDir, 'src-tauri'),
      encoding: 'utf8',
    },
  );

  assert.equal(cargoResult.status, 0, cargoResult.stderr);
  const cargoMetadata = JSON.parse(cargoResult.stdout);
  const appPackage = cargoMetadata.packages.find((pkg) => pkg.name === 'resona-desk');

  assert.ok(appPackage, 'resona-desk package is missing from cargo metadata');
  assert.equal(packageJson.version, tauriConfig.version);
  assert.equal(appPackage.version, tauriConfig.version);
});

test('the main window capability permits native window dragging', async () => {
  const capability = JSON.parse(
    await readFile(
      path.join(projectDir, 'src-tauri', 'capabilities', 'default.json'),
      'utf8',
    ),
  );

  assert.ok(
    capability.permissions.includes('core:window:allow-start-dragging'),
    'data-tauri-drag-region requires the start_dragging IPC permission',
  );
});

test('the rendered production header exposes a deep Tauri drag region', async (t) => {
  const distDir = path.join(projectDir, 'dist');
  const server = createServer(async (request, response) => {
    const requestPath = request.url === '/' ? '/index.html' : request.url;
    const assetPath = path.join(distDir, requestPath);

    try {
      const body = await readFile(assetPath);
      const contentType = assetPath.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : assetPath.endsWith('.js')
          ? 'text/javascript; charset=utf-8'
          : assetPath.endsWith('.css')
            ? 'text/css; charset=utf-8'
            : 'application/octet-stream';

      response.writeHead(200, { 'Content-Type': contentType });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  t.after(() => server.close());

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const result = await runProcess(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--dump-dom',
      `http://127.0.0.1:${address.port}/`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /<header[^>]*data-tauri-drag-region="deep"/,
    'the visible title bar must delegate dragging to Tauri',
  );
});
