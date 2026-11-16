// Browser test (dev only): packs (save, switch, delete), CurseForge modpack zip install (overrides only, offline), saved server list. No server.
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message)); const out = {};
try {
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn'); await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.$eval('#mcForge', e => { e.checked = true; e.dispatchEvent(new Event('change')); }); await wait(300);
await pg.setInputFiles('#mcModsIn', ['/tmp/claude-0/rl/simpledifficulty.jar']); await pg.waitForFunction(() => /Imported/.test(document.getElementById('mcModsStat').textContent), null, { timeout: 120000 }); await wait(1800);
await pg.$eval('#mcCfgAs', e => e.click()); await pg.fill('#mcCfgNameIn', 'SD only'); await pg.$eval('#mcCfgNameOk', e => e.click()); await pg.waitForFunction(() => /Saved/.test(document.getElementById('mcModsStat').textContent), null, { timeout: 60000 });
out.afterSave = await pg.evaluate(async () => [(await StrataMCE.cfgList()).map(q => [q.name, q.mods, q.jars]), StrataMCE.cfgCurrent(), document.getElementById('mcCfg').selectedOptions[0].textContent]);
await pg.setInputFiles('#mcCfIn', ['/tmp/claude-0/cfpack.zip']); await pg.waitForFunction(() => /Installed|failed/.test(document.getElementById('mcCfStat').textContent), null, { timeout: 120000 }); await wait(1500);
out.install = await pg.evaluate(async () => [document.getElementById('mcCfStat').textContent, (await StrataMCE.cfgList()).map(q => [q.name, q.mods, q.pack]), document.getElementById('mcModsStat').textContent.slice(0, 80), document.getElementById('mcPackStat').textContent]);
out.switch = await pg.evaluate(async () => { const L = await StrataMCE.cfgList(), s = document.getElementById('mcCfg'); s.value = L[0].id; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 1500)); return [document.getElementById('mcModsStat').textContent.slice(0, 60), document.getElementById('mcPackStat').textContent]; });
await pg.fill('#mcHost', 'play.example.net'); await pg.$eval('#mcSrvAdd', e => e.click()); await wait(400); await pg.fill('#mcHost', 'rlcraft.example.com:25565'); await pg.$eval('#mcSrvAdd', e => e.click()); await wait(400);
out.servers = await pg.evaluate(() => [...document.querySelectorAll('#mcSrvList button')].map(b => b.textContent));
await pg.evaluate(() => document.querySelectorAll('#mcSrvList button')[1].click()); await wait(200); await pg.screenshot({ path: '/tmp/cfg-1.png', fullPage: true });
out.del = await pg.evaluate(async () => { const s = document.getElementById('mcCfg'); const n0 = (await StrataMCE.cfgList()).length; document.getElementById('mcCfgDel').click(); document.getElementById('mcCfgDel').click(); await new Promise(r => setTimeout(r, 4000)); return [n0, (await StrataMCE.cfgList()).length]; });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
