import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TMP = '/Users/taha/.claude/jobs/424df234/tmp';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Read the game stage from localStorage (source of truth)
const getStage = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('hr_motivator_game_simple') || '{}').stage; }
  catch { return null; }
});

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const ss = async (name) => { await page.screenshot({ path: `${TMP}/run-${name}.png` }); console.log(`  📸 ${name}`); };
const clickBtn = (text) => page.evaluate((t) => {
  const btn = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes(t));
  if (btn) btn.click(); return !!btn;
}, text);

// ── 1. Login → Participant ───────────────────────────────────────────────────
console.log('\n1. Login → Participant');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
await wait(500);
await ss('01-login');
await clickBtn('Participant');
await wait(700);
await ss('02-participant-form');

// ── 2. Fill form ─────────────────────────────────────────────────────────────
console.log('\n2. Fill form');
const textInputs = await page.$$('input[type="text"]');
console.log(`  ${textInputs.length} text inputs: ${(await Promise.all(textInputs.map(el => el.evaluate(e => e.placeholder)))).join(' | ')}`);

const typeInto = async (el, val) => { await el.click({ clickCount: 3 }); await el.type(val, { delay: 20 }); };
await typeInto(textInputs[0], 'Tina Moradi');    // name
await wait(100);
await typeInto(textInputs[1], 'Demo Corp');       // company
await wait(100);
await typeInto(textInputs[3], 'Product Manager'); // position
await wait(200);

const selects = await page.$$('select');
console.log(`  ${selects.length} selects`);
await selects[0].select('1988');   // year of birth
await selects[1].select('female'); // sex
await selects[2].select('senior'); // seniority
await wait(400);
await ss('03-form-filled');

const startBtn = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Level 1') || b.textContent.includes('Start'));
  return btn ? { text: btn.textContent.trim().slice(0, 40), disabled: btn.disabled } : null;
});
console.log('  start button:', startBtn);
if (!startBtn || startBtn.disabled) { console.log('⚠ Start still disabled'); await ss('03-debug'); await browser.close(); process.exit(1); }

// ── 3. Start → Instructions ───────────────────────────────────────────────────
console.log('\n3. Start');
await clickBtn('Level 1'); await clickBtn('Start');
await wait(800);
await ss('04-instructions');
console.log('  stage:', await getStage(page));

// ── 4. Got it → Playing ───────────────────────────────────────────────────────
console.log('\n4. Got it');
await clickBtn('Got it');
await wait(800);
await ss('05-playing');
console.log('  stage:', await getStage(page));

// ── 5. Play: reveal + discard using localStorage stage ────────────────────────
console.log('\n5. Playing...');
let moves = 0;
for (let i = 0; i < 150; i++) {
  const stage = await getStage(page);
  if (stage !== 'playing') { console.log(`  → stage changed to "${stage}" after ${moves} moves`); break; }

  const cardCount = await page.evaluate(() => document.querySelectorAll('.grid-cols-3 > div, .grid-cols-2 > div, .grid-cols-1 > div').length);
  // Count motivator cards via active state — simpler: check if Reveal or Discard should be clicked
  const hasReveal = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.includes('Reveal'))
  );
  const hasDiscard = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b => !b.disabled && (b.textContent.includes('Discard') || b.textContent.includes('حذف')))
  );

  if (hasDiscard) {
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes('Discard'))?.click()
    );
    moves++;
  } else if (hasReveal) {
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes('Reveal'))?.click()
    );
    moves++;
  }
  await wait(350);
}
await ss('06-after-play');
const stageAfterPlay = await getStage(page);
console.log('  stage after play:', stageAfterPlay);

// ── 6. Level 2 intro ──────────────────────────────────────────────────────────
if (stageAfterPlay === 'level2_intro') {
  console.log('\n6. Level 2 intro → proceed');
  await ss('07-level2-intro');
  await clickBtn('Level 2'); await clickBtn('Rate'); await clickBtn('ارزیابی');
  await wait(800);
} else {
  console.log(`  ⚠ unexpected stage: ${stageAfterPlay}`);
}
await ss('08-level2-scoring');
console.log('  stage:', await getStage(page));

// ── 7. Score 6 motivators ─────────────────────────────────────────────────────
console.log('\n7. Scoring...');
const scoreMap = ['+3', '-1', '+2', '-2', '+1', '0'];
for (let i = 0; i < 8; i++) {  // up to 8 in case of extra rows
  const rows = await page.$$('.grid-cols-7');
  if (rows.length === 0) { console.log('  no score rows found yet, waiting...'); await wait(500); continue; }
  console.log(`  found ${rows.length} score rows`);
  for (let j = 0; j < Math.min(rows.length, 6); j++) {
    const lbl = scoreMap[j];
    const ok = await rows[j].evaluate((el, l) => {
      const btn = [...el.querySelectorAll('button')].find(b => b.textContent.trim() === l);
      if (btn) { btn.click(); return true; }
      return false;
    }, lbl);
    if (!ok) console.log(`    ⚠ row ${j}: couldn't click ${lbl}`);
    await wait(120);
  }
  break;
}
await wait(400);
await ss('09-scored');

// ── 8. Show report ────────────────────────────────────────────────────────────
console.log('\n8. Show report');
const reportBtnClicked = await clickBtn('Report');
await wait(2500);
await ss('10-results');

const stage = await getStage(page);
const hasName = await page.evaluate(() => document.body.textContent.includes('Tina Moradi'));
const hasAvg = await page.evaluate(() => document.body.textContent.includes('Average') || document.body.textContent.includes('alignment'));
console.log(`\n  stage: ${stage}`);
console.log(`  has participant name: ${hasName}`);
console.log(`  has average/alignment: ${hasAvg}`);
console.log(`\n${stage === 'results' && hasName ? '✅ Full run complete!' : '⚠ Something went wrong'}`);

await browser.close();
