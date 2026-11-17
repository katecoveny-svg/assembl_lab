"""Copy the built site (dist/) into a lab folder and add the lab's shared navigation script before </body>.

usage: python3 -I scripts/stage_lab.py TARGET_DIR      e.g. /home/claude/lab-inventory/plan-studio/library
The target is replaced wholesale except for its src/ folder (the editable source, which is not deployed).
"""
import os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
NAV = '<script src="/lab/navigation.js" defer></script>'
target = os.path.abspath(sys.argv[1])
os.makedirs(target, exist_ok=True)
for name in os.listdir(target):
    if name == 'src':
        continue
    p = os.path.join(target, name)
    shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)
for name in os.listdir(DIST):
    s, d = os.path.join(DIST, name), os.path.join(target, name)
    shutil.copytree(s, d) if os.path.isdir(s) else shutil.copy2(s, d)
idx = os.path.join(target, 'index.html')
html = open(idx, encoding='utf-8').read()
if NAV not in html:
    html = html.replace('</body>', f'  {NAV}\n  </body>', 1)
open(idx, 'w', encoding='utf-8').write(html)
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(target) for f in fs if '/src' not in dp[len(target):] or not dp[len(target):].startswith('/src'))
print(f'staged into {target}: {total / 1e6:.2f} MB')
