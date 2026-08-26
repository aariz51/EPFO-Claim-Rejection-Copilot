/**
 * Record the PF Precheck demo with a standalone Playwright browser.
 *
 *   node video/record-demo.mjs         all segments
 *   node video/record-demo.mjs 4 6     only 4 and 6
 *
 * Its own Chromium plus Playwright's built-in video capture: no extension is
 * attached, so the "started debugging this browser" banner cannot appear, and
 * nothing else on the desktop can reach a frame.
 *
 * Recorded against the live deployment, so what is filmed is what a reviewer
 * will actually open.
 */

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEGMENTS = join(HERE, 'segments');
const RAW = join(HERE, '.rawvideo');
const VO = join(HERE, 'vo');
const BASE = process.env.BASE ?? 'https://pf-precheck.vercel.app';

const W = 1920;
const H = 1080;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function takeLength(n) {
  const f = join(VO, `take${n}.wav`);
  if (!existsSync(f)) throw new Error(`missing narration: take${n}.wav`);
  return parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`).toString().trim()
  );
}

/** Preference state, so a segment opens in the language and mode it needs. */
function prefs({ lang = 'en', mode = 'simple', scale = 'normal' } = {}) {
  return JSON.stringify({ lang, mode, scale, speak: false, assisted: false });
}

async function glide(page, to, ms) {
  await page.evaluate(
    ([to, ms]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        function step(now) {
          const k = Math.min(1, (now - t0) / ms);
          window.scrollTo(0, from + (to - from) * ease(k));
          if (k < 1) requestAnimationFrame(step);
          else done();
        }
        requestAnimationFrame(step);
      }),
    [to, ms]
  );
}

/** Walk the waiting journey to the verdict. */
async function toVerdict(page, hindi = false) {
  const L = hindi
    ? [/मैंने आवेदन किया/, /लगभग एक महीने पहले/, /पोर्टल पर जमा है/]
    : [/I applied, money has not come/, /About a month ago/, /Submitted at portal/];
  await page.getByRole('button', { name: L[0] }).click();
  await sleep(700);
  await page.getByRole('button', { name: L[1] }).click();
  await sleep(600);
  await page.getByRole('button', { name: L[2] }).click();
  await sleep(1400);
}

const BEATS = {
  // "one in five rejected, two words back"
  1: async (page, secs) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await sleep(3600);                 // the landing, the specimen card
    await glide(page, 240, 2800);
    await sleep(secs * 1000 - 6400);
  },

  // "EPFO already promised twenty days. nobody is told."
  2: async (page, secs) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await sleep(900);
    await page.evaluate(() => {
      document.querySelector('.lp-facts')?.scrollIntoView({ block: 'center' });
    });
    await sleep(3200);                 // 20 days / 12% / 1 in 5
    await glide(page, 1500, 2800);
    await sleep(secs * 1000 - 6900);
  },

  // "before you file it runs the rules and shows the gap as numbers"
  3: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(1400);
    await page.getByRole('button', { name: /I want to take money out/ }).click();
    await sleep(900);
    await page.getByRole('button', { name: /House or flat/ }).click();
    await sleep(800);
    await page.getByRole('button', { name: /4,00,000|400,000/ }).first().click();
    await sleep(1600);
    await page.evaluate(() => document.querySelector('.prefile-checks')?.scrollIntoView({ block: 'start' }));
    await sleep(secs * 1000 - 6700);   // the named checks, rule wants vs record says
  },

  // "day twenty seven of a twenty day limit"
  4: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(700);
    await toVerdict(page);
    await sleep(secs * 1000 - 5000);
  },

  // "worth one thousand one hundred and eighty four rupees"
  5: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(600);
    await toVerdict(page);
    await page.evaluate(() => {
      document.querySelector('.penal-card')?.scrollIntoView({ block: 'center' });
    });
    await sleep(secs * 1000 - 4600);   // sit on the rupee figure
  },

  // "the ladder unlocks by day. names the role. writes the grievance."
  6: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(600);
    await toVerdict(page);
    await glide(page, 620, 2200);      // the owner card
    await sleep(1800);
    await glide(page, 1250, 2600);     // the ladder
    await sleep(secs * 1000 - 8800);
  },

  // "type that scales, a contrast mode at 21 to 1, and Hindi that covers the advice"
  7: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(900);
    await page.getByRole('button', { name: /Bigger text/ }).click();
    await sleep(1200);
    await page.getByRole('button', { name: /High contrast/i }).click();
    await sleep(2000);                 // the 21:1 mode, visibly
    await page.getByRole('button', { name: /contrast/i }).first().click();
    await sleep(600);
    await page.getByRole('button', { name: 'हिंदी' }).click();
    await sleep(1600);
    await toVerdict(page, true);
    await sleep(secs * 1000 - 9500);
  },

  // "rule table first, model only on the rest, labelled either way"
  8: async (page, secs) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await sleep(700);
    await page.getByRole('button', { name: /My claim was rejected/ }).click();
    await sleep(800);
    await page.locator('.simple-textarea').fill(
      'Your claim stands rejected as the wage details furnished by the establishment for 04/2019 to 11/2021 do not tally with the ECR filed, kindly get the same rectified by employer and resubmit.'
    );
    await sleep(700);
    await page.getByRole('button', { name: /Explain this to me/ }).click();
    await page.waitForSelector('.decode-card', { timeout: 40000 }).catch(() => {});
    await sleep(1000);
    await page.evaluate(() => document.querySelector('.decode-gap')?.scrollIntoView({ block: 'center' }));
    await sleep(secs * 1000 - 6000);
  },

  // "the real fix is not this app. four fields."
  9: async (page, secs) => {
    await page.goto(`${BASE}/proposal`, { waitUntil: 'networkidle' });
    await sleep(2600);
    await glide(page, 760, 3000);
    await sleep(1600);
    await glide(page, 1700, 2800);
    await sleep(secs * 1000 - 10600);
  },
};

async function main() {
  const wanted = process.argv.slice(2).map(Number).filter(Boolean);
  const list = wanted.length ? wanted : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  mkdirSync(SEGMENTS, { recursive: true });
  rmSync(RAW, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const n of list) {
    const secs = takeLength(n);
    const dir = join(RAW, `s${n}`);
    mkdirSync(dir, { recursive: true });

    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      recordVideo: { dir, size: { width: W, height: H } },
      storageState: {
        cookies: [],
        origins: [
          {
            origin: BASE,
            localStorage: [
              { name: 'pf-assist-prefs', value: prefs({ mode: 'simple' }) },
              { name: 'gh-banner', value: 'hidden' },
            ],
          },
        ],
      },
    });

    const page = await ctx.newPage();
    await page.addStyleTag({ content: '*{caret-color:transparent!important}' }).catch(() => {});

    const t0 = Date.now();
    try {
      await BEATS[n](page, secs);
    } catch (e) {
      console.log(`  segment ${n}: beat error -> ${e.message}`);
    }
    const held = (Date.now() - t0) / 1000;
    if (held < secs + 0.4) await sleep((secs + 0.4 - held) * 1000);

    await ctx.close();
    const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
    if (!webm) { console.log(`  segment ${n}: NO VIDEO PRODUCED`); continue; }

    const out = join(SEGMENTS, `seg${n}.mp4`);
    execSync(
      `ffmpeg -hide_banner -loglevel error -y -i "${join(dir, webm)}" ` +
        `-vf "scale=${W}:${H},setsar=1,format=yuv420p" -r 30 ` +
        `-c:v libx264 -preset veryfast -crf 20 -movflags +faststart "${out}"`
    );
    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`
    ).toString().trim();
    console.log(`  seg${n}.mp4  ${parseFloat(dur).toFixed(1)}s   (narration ${secs.toFixed(1)}s)`);
  }

  await browser.close();
  rmSync(RAW, { recursive: true, force: true });
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
