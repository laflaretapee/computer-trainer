import re
import os

base_dir = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"

for fn in ['app.js', 'modules/typing.js', 'modules/teacher.js']:
    fpath = os.path.join(base_dir, fn)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"=== {fn} ===")
    for m in re.finditer(r'classList\.(?:add|remove|toggle|contains)\(([^)]+)\)', content):
        print("  classList:", m.group(0))
    for m in re.finditer(r'querySelector(?:All)?\(["\']([^"\']+)["\']\)', content):
        if '.' in m.group(1):
            print("  query:", m.group(0))
    for m in re.finditer(r'(?:offsetClass|cls|className)\s*=\s*[^;\n]+', content):
        print("  var assign:", m.group(0))
