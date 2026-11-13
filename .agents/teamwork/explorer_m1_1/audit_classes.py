import re
import os

base_dir = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
files = ['index.html', 'app.js', os.path.join('modules', 'teacher.js'), os.path.join('modules', 'typing.js')]

class_refs = {}

for rel in files:
    fpath = os.path.join(base_dir, rel)
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        # find class="..." or class='...'
        for m in re.finditer(r'class=["\']([^"\']+)["\']', line):
            val = m.group(1)
            # handle template literals like ${... ? 'active' : ''}
            literals = re.findall(r'["\']([a-zA-Z0-9_-]+)["\']', val)
            for lit in literals:
                class_refs.setdefault(lit, []).append((rel, idx+1, line.strip()))
            cleaned = re.sub(r'\$\{[^}]*\}', ' ', val)
            tokens = re.findall(r'[a-zA-Z0-9_-]+', cleaned)
            for t in tokens:
                class_refs.setdefault(t, []).append((rel, idx+1, line.strip()))
        
        # find classList.add(...)
        for m in re.finditer(r'classList\.add\(([^)]+)\)', line):
            val = m.group(1)
            literals = re.findall(r'["\']([a-zA-Z0-9_-]+)["\']', val)
            for lit in literals:
                class_refs.setdefault(lit, []).append((rel, idx+1, line.strip()))

        # find className = "..." or className += "..."
        for m in re.finditer(r'className\s*(?:\+?=)\s*["\']([^"\']+)["\']', line):
            val = m.group(1)
            tokens = re.findall(r'[a-zA-Z0-9_-]+', val)
            for t in tokens:
                class_refs.setdefault(t, []).append((rel, idx+1, line.strip()))

css_path = os.path.join(base_dir, 'style.css')
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Also let's extract all CSS classes defined in style.css
css_defined_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)', css_content))

missing = {}
found = {}

for c, refs in sorted(class_refs.items()):
    pattern = r'\.' + re.escape(c) + r'(?![a-zA-Z0-9_-])'
    if re.search(pattern, css_content):
        found[c] = refs
    else:
        missing[c] = refs

print(f"Total extracted class names from JS/HTML: {len(class_refs)}")
print(f"Found in style.css: {len(found)}")
print(f"Missing in style.css: {len(missing)}")
print("=" * 60)
for c in sorted(missing.keys()):
    print(f"MISSING: .{c} (referenced {len(missing[c])} times)")
    for r in missing[c][:2]:
        print(f"    [{r[0]}:{r[1]}] {r[2][:90]}")

print("\n" + "=" * 60)
print("Unused CSS classes in style.css (not referenced in HTML/JS):")
unused_css = set()
for c in sorted(css_defined_classes):
    if c not in class_refs and not c.isdigit() and not re.match(r'^\d', c):
        unused_css.add(c)
        print(f"  .{c}")
