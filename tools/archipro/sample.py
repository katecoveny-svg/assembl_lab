# Build tool: samples the 16A GLB (exported from the live twin) into concepts/archipro/16a-points.bin.
# python3 tools/archipro/sample.py  (needs the repo served on :8765 and tools/archipro/_16a.glb, which is not committed)
import asyncio, base64, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page()
        pg.on("console", lambda m: print("console:", m.text[:300]))
        pg.on("pageerror", lambda e: print("error:", e))
        await pg.goto("http://localhost:8765/tools/archipro/sample.html?glb=/tools/archipro/_16a.glb&n=120000")
        await pg.wait_for_function("document.title==='done'", timeout=600000)
        info = await pg.evaluate("({counts: __out.counts, tris: __out.tris, edges: __out.edges, n: __out.bytes.length})")
        print(info)
        b64 = await pg.evaluate("(()=>{let s='';const u=__out.bytes;for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)})()")
        open(sys.argv[1] if len(sys.argv) > 1 else "concepts/archipro/16a-points.bin", "wb").write(base64.b64decode(b64))
        await b.close()
asyncio.run(main())
