"""Minecraft Compat menu: version dropdown + Microsoft sign-in against the relay running on the mock endpoints. python tools/tests/phase24_mcauth.py"""
import asyncio,pathlib,os,json,subprocess,time
from playwright.async_api import async_playwright
R=pathlib.Path(__file__).resolve().parents[1]/'relay'; ROOT=pathlib.Path(__file__).resolve().parents[2]
async def main():
    mock=subprocess.Popen(['node','mock-ms.mjs','19181'],cwd=R); time.sleep(.6); base='http://localhost:19181'
    EP=json.dumps({'devicecode':base+'/devicecode','token':base+'/token','xbl':base+'/xbl','xsts':base+'/xsts','mclogin':base+'/mclogin','profile':base+'/profile'})
    relay=subprocess.Popen(['node','relay.mjs'],cwd=R,env={**os.environ,'MS_CLIENT_ID':'t','PORT':'19180','RELAY_ENDPOINTS':EP,'RELAY_STORE':'/tmp/relay-ui-store.json'}); time.sleep(.8)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            pg=await b.new_page(viewport={'width':900,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto((ROOT/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
            await pg.click('#mpBtn'); await pg.click('[data-mp=minecraft]'); await pg.select_option('#mcVer','1.20.4'); await pg.fill('#mcRelay','ws://localhost:19180'); await pg.dispatch_event('#mcRelay','change')
            await pg.click('#mcAuth'); await pg.wait_for_selector('#mcUser:visible',timeout=5000); code=await pg.inner_text('#mcUser'); await pg.screenshot(path='/tmp/mcauth1.png')
            await pg.wait_for_function("document.getElementById('mcStat').textContent.startsWith('Signed in')",timeout=15000)
            r=await pg.evaluate("({mode:__mp.mode,ver:__mp.version,proto:__mp.protocol,auth:__mp.auth,stat:document.getElementById('mcStat').textContent,tok:JSON.stringify(__mp).includes('MCTOKEN')})")
            print(json.dumps({'code':code,**r,'errs':errs}),flush=True); await pg.screenshot(path='/tmp/mcauth2.png'); await b.close()
    finally: relay.kill(); mock.kill()
asyncio.run(main())
