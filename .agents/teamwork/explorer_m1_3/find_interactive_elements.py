"""
Audit all HTML elements and classes across index.html, app.js, modules/typing.js, modules/teacher.js
to find every single interactive element that requires :hover, :active, and :focus-visible.
"""
import re

html_files = [
    r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html",
    r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\app.js",
    r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\typing.js",
    r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\teacher.js"
]

interactive_tags = set()
classes_with_button = set()
inputs = set()
selects = set()

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all <button ... class="..." ...>
    btns = re.findall(r'<button\s+[^>]*class=["\']([^"\']+)["\']', content)
    for b in btns:
        for c in b.split():
            classes_with_button.add(c)
            
    # Also find createElement('button') and btn.className = '...'
    ce_btns = re.findall(r"className\s*=\s*['\"]([^'\"]+)['\"]", content)
    for b in ce_btns:
        for c in b.split():
            if 'btn' in c or 'card' in c:
                classes_with_button.add(c)
                
    # Inputs
    inps = re.findall(r'<input\s+[^>]*class=["\']([^"\']+)["\']', content)
    for inp in inps:
        for c in inp.split():
            inputs.add(c)
            
    # Selects
    sels = re.findall(r'<select\s+[^>]*class=["\']([^"\']+)["\']', content)
    for sel in sels:
        for c in sel.split():
            selects.add(c)

print("Button / Clickable classes found:")
for c in sorted(classes_with_button):
    print(f"  .{c}")

print("\nInput classes found:")
for c in sorted(inputs):
    print(f"  .{c}")

print("\nSelect classes found:")
for c in sorted(selects):
    print(f"  .{c}")
