import re
import os

base_dir = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"

def get_file_content(fn):
    with open(os.path.join(base_dir, fn), 'r', encoding='utf-8') as f:
        return f.read()

files = ['index.html', 'app.js', 'modules/teacher.js', 'modules/typing.js']
all_classes = {}

for fn in files:
    content = get_file_content(fn)
    # class="..." or class='...'
    for m in re.finditer(r'class=["\']([^"\']+)["\']', content):
        val = m.group(1)
        for part in re.split(r'\s+', val):
            if part:
                all_classes.setdefault(part, set()).add((fn, 'class_attr'))
    # classList.add(...)
    for m in re.finditer(r'classList\.add\(([^)]+)\)', content):
        for lit in re.findall(r'["\']([a-zA-Z0-9_-]+)["\']', m.group(1)):
            all_classes.setdefault(lit, set()).add((fn, 'classList.add'))
    # classList.toggle(...)
    for m in re.finditer(r'classList\.toggle\(([^,)]+)', content):
        for lit in re.findall(r'["\']([a-zA-Z0-9_-]+)["\']', m.group(1)):
            all_classes.setdefault(lit, set()).add((fn, 'classList.toggle'))

css_content = get_file_content('style.css')
css_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)', css_content))

print("=== CLASSES IN EACH FILE ===")
for fn in files:
    print(f"\n--- {fn} ---")
    c_list = sorted([c for c, locs in all_classes.items() if any(l[0] == fn for l in locs)])
    for c in c_list:
        in_css = "IN_CSS" if re.search(r'\.' + re.escape(c) + r'(?![a-zA-Z0-9_-])', css_content) else "MISSING"
        print(f"  {c:<30} {in_css}")
