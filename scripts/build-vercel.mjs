/**
 * Build for Vercel.
 *
 * Vercel sees `next` in dependencies and assumes a Next.js app, then looks for
 * .next/routes-manifest.json which vinext never writes. Rather than fight that
 * detection, this emits the Build Output API v3 directory directly and deploys
 * with --prebuilt, so Vercel does no framework inference at all.
 *
 *   .vercel/output/static/          the client assets, served straight from CDN
 *   .vercel/output/functions/       one Node function running the vinext handler
 *   .vercel/output/config.json      routes: static first, everything else to SSR
 *
 * The Cloudflare target is untouched. DEPLOY_TARGET=vercel drops the Cloudflare
 * vite plugin so the server build is plain Node rather than a Worker bundle, and
 * the entry it produces is a normal (Request) => Response function.
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, '.vercel', 'output');
const FUNC = join(OUT, 'functions', 'index.func');

const log = (m) => console.log(`  ${m}`);

/* 1. Build with the Cloudflare plugin disabled. */
log('building (DEPLOY_TARGET=vercel)');
rmSync(DIST, { recursive: true, force: true });
execSync('npm run build', {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, DEPLOY_TARGET: 'vercel' },
});

for (const required of ['server/index.js', 'client']) {
  if (!existsSync(join(DIST, required))) {
    throw new Error(`build did not produce dist/${required}`);
  }
}
log('dist/server/index.js and dist/client present');

/* 2. Reset the output directory. */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(FUNC, { recursive: true });

/* 3. Static assets go to the CDN, never through the function. */
cpSync(join(DIST, 'client'), join(OUT, 'static'), { recursive: true });
log('static assets copied');

/* 4. The SSR function. It carries the whole server build with it. */
cpSync(join(DIST, 'server'), join(FUNC, 'server'), { recursive: true });

// vinext leaves react and react-dom external rather than bundling them, so the
// function has to ship them or SSR dies with ERR_MODULE_NOT_FOUND at runtime.
// The API route survives without them, which is why only page renders failed.
// The standalone build already resolved the right versions, so take them from
// there instead of guessing from the workspace tree.
const externals = JSON.parse(
  readFileSync(join(DIST, 'server', 'vinext-externals.json'), 'utf8')
);
// scheduler is react-dom's own dependency and is not listed as external.
const runtimeDeps = [...new Set([...externals, 'scheduler'])];
const src = join(DIST, 'standalone', 'node_modules');
if (!existsSync(src)) {
  throw new Error('dist/standalone/node_modules missing. next.config needs output: "standalone".');
}
for (const dep of runtimeDeps) {
  const from = join(src, dep);
  if (!existsSync(from)) throw new Error(`runtime dependency not found: ${dep}`);
  cpSync(from, join(FUNC, 'node_modules', dep), { recursive: true });
}
log(`bundled runtime deps: ${runtimeDeps.join(', ')}`);

// The function must be ESM. Without this the launcher loads index.mjs through
// the CJS loader and dies on the first import statement.
writeFileSync(join(FUNC, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

// Vercel's Node launcher calls (req, res). vinext's entry is a web
// (Request) => Response. This bridges the two rather than assuming the launcher
// hands us a web Request.
writeFileSync(
  join(FUNC, 'index.mjs'),
  `import handler from './server/index.js';

function toRequest(req) {
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', proto + '://' + host);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) for (const one of v) headers.append(k, one);
    else if (v != null) headers.set(k, String(v));
  }
  return { url, headers };
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function (req, res) {
  try {
    const { url, headers } = toRequest(req);
    const body = await readBody(req);

    const response = await handler(
      new Request(url, { method: req.method, headers, body, duplex: 'half' })
    );

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (error) {
    console.error('[vinext] request failed', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
    }
    res.end('Internal Server Error');
  }
}
`
);

writeFileSync(
  join(FUNC, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2
  )
);

/* 5. Routes. Anything the CDN can serve, it serves. The rest is SSR. */
writeFileSync(
  join(OUT, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Hashed build assets are immutable.
        {
          src: '^/_next/static/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Serve any real file from the CDN first.
        { handle: 'filesystem' },
        // Everything else is rendered.
        { src: '^/(.*)$', dest: '/index' },
      ],
    },
    null,
    2
  )
);

log('.vercel/output ready');
log('deploy with:  vercel deploy --prebuilt --prod --global-config ~/.vercel-accounts/rashiqxd');
