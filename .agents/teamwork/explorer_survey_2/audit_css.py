import re
import os

base_dir = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"

def get_classes_from_js_html():
    classes = set()
    files = ['index.html', 'app.js', os.path.join('modules', 'typing.js'), os.path.join('modules', 'teacher.js')]
    for rel_path in files:
        f = os.path.join(base_dir, rel_path)
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
        for m in re.finditer(r'class=[\'"]([^\'"]+)[\'"]', content):
            for c in m.group(1).split():
                if '${' not in c:
                    classes.add((c, rel_path))
        for m in re.finditer(r'classList\.add\([\'"]([^\'"]+)[\'"]\)', content):
            classes.add((m.group(1), rel_path))
        for m in re.finditer(r'className\s*=\s*[\'"]([^\'"]+)[\'"]', content):
            for c in m.group(1).split():
                classes.add((c, rel_path))
    return classes

css_file = os.path.join(base_dir, 'style.css')
with open(css_file, 'r', encoding='utf-8') as fp:
    css = fp.read()

used_classes = get_classes_from_js_html()
missing = []
found = []
for c, f in sorted(used_classes):
    pattern = r'\.' + re.escape(c) + r'(?:[\s,\.\{\:\>\+\[]|$)'
    if not re.search(pattern, css):
        missing.append((c, f))
    else:
        found.append(c)

print(f"Total unique classes used: {len(used_classes)}")
print(f"Missing in style.css: {len(missing)}")
for c, f in missing:
    print(f"  MISSING: .{c} (in {f})")


css_classes_in_file = set(re.findall(r'\.([a-zA-Z0-9_-]+)', css))
used_class_names = {c for c, _ in used_classes}
unused_in_css = css_classes_in_file - used_class_names

print("\n--- Unused classes defined in style.css (possible mismatch) ---")
for c in sorted(unused_in_css):
    if not c.startswith(('stat-bar', 'badge-', 'grade-')):
        print(f"  Unused CSS rule: .{c}")
