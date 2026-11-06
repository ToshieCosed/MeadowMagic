"""Strata inventory tap modes: whole stack, one item (pick up half / put down one), send across, and press-and-hold for one.
python tools/tests/phase26_taps.py  -> prints the inventory after each step and saves /tmp/taps.png"""
import asyncio, pathlib, os, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 430, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2] / 'release/strata-standalone.html').as_uri()); await pg.wait_for_function('typeof startWorld==="function"', timeout=90000)
        r = await pg.evaluate('''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); window.__layout='panel'; startWorld({id:'tap1',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'survival',created:1,played:1},null,false); await W(3000); mode='play'; document.getElementById('menu').hidden=true;
          inv.slots.fill(null); inv.slots[0]=mkStack(B.COBBLE,10); inv.slots[1]=mkStack(B.COBBLE,5); openInv(); await W(300); const out=[]; const st=()=>JSON.stringify({hot:inv.slots.slice(0,3).map(s=>s&&s.n), bag:inv.slots.slice(9,12).map(s=>s&&s.n), cur:inv.cursor&&inv.cursor.n, segs:document.querySelectorAll('#inv .tapSeg button').length});
          out.push('start '+st());
          setTap('one'); clickSlot(inv.slots,0); out.push('one-pick '+st()); clickSlot(inv.slots,9); out.push('one-put '+st()); clickSlot(inv.slots,10); clickSlot(inv.slots,0); out.push('one-back '+st());
          setTap('quick'); clickSlot(inv.slots,1); out.push('quick hot->bag '+st()); clickSlot(inv.slots,9); out.push('quick bag->hot '+st());
          setTap('stack'); renderInv(); await W(100); const btn=document.querySelectorAll('#hotGrid .islot')[0]; const rc=btn.getBoundingClientRect();
          window.__dbg=[]; document.addEventListener('click',e=>window.__dbg.push('click '+e.isTrusted+' '+(e.target.className||'')),true); btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:rc.x+5,clientY:rc.y+5})); await W(600); out.push('dbg '+JSON.stringify(window.__dbg)+' mode '+mode); btn.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:rc.x+5,clientY:rc.y+5})); btn.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          out.push('hold '+st()); return out; }''')
        for line in r: print(line)
        await pg.screenshot(path='/tmp/taps.png'); print('ERRS', errs[:3]); await b.close()
asyncio.run(main())
