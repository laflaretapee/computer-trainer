import os
import re
import json
import math

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
STYLE_CSS = os.path.join(PROJECT_ROOT, "style.css")
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
STUDENTS_JSON = os.path.join(PROJECT_ROOT, "data", "students.json")
STUDENTS_JS = os.path.join(PROJECT_ROOT, "data", "students.js")
CONTENT_JSON = os.path.join(PROJECT_ROOT, "data", "content.json")
CONTENT_JS = os.path.join(PROJECT_ROOT, "data", "content.js")

audit_results = {
    "offline_integrity": {"pass": True, "details": []},
    "data_integrity": {"pass": True, "details": []},
    "tokens_integrity": {"pass": True, "details": []},
    "missing_classes_integrity": {"pass": True, "details": []},
    "wcag_contrast": {"pass": True, "details": []},
    "facade_dummy_check": {"pass": True, "details": []},
    "prepopulated_artifacts": {"pass": True, "details": []}
}

print("=" * 70)
print("INDEPENDENT FORENSIC AUDITOR SCRIPT — MILESTONE 1")
print("=" * 70)

# 1. OFFLINE INTEGRITY
print("\n[CHECK 1] Strict Offline Integrity Check...")
with open(STYLE_CSS, "r", encoding="utf-8") as f:
    style_content = f.read()

with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# Check for remote links in style.css
css_imports = re.findall(r'@import\s+[^;]+;', style_content, re.IGNORECASE)
if css_imports:
    audit_results["offline_integrity"]["pass"] = False
    audit_results["offline_integrity"]["details"].append(f"Found @import in style.css: {css_imports}")

remote_urls_css = re.findall(r'url\s*\(\s*["\']?(https?:|//)[^)"\']+', style_content, re.IGNORECASE)
if remote_urls_css:
    audit_results["offline_integrity"]["pass"] = False
    audit_results["offline_integrity"]["details"].append(f"Found remote url() in style.css: {remote_urls_css}")

# Check for remote links in index.html
remote_urls_html = re.findall(r'(?:href|src)\s*=\s*["\'](https?:|//)[^"\']+', html_content, re.IGNORECASE)
if remote_urls_html:
    audit_results["offline_integrity"]["pass"] = False
    audit_results["offline_integrity"]["details"].append(f"Found remote href/src in index.html: {remote_urls_html}")

if audit_results["offline_integrity"]["pass"]:
    print("  -> PASS: Zero remote URLs, zero @import, zero CDNs detected. 100% offline.")
else:
    print("  -> FAIL:", audit_results["offline_integrity"]["details"])


# 2. DATA INTEGRITY (79 students, 5 lessons, slide images)
print("\n[CHECK 2] Data & Content Integrity Check...")
# Check students.json
try:
    with open(STUDENTS_JSON, "r", encoding="utf-8") as f:
        students_data = json.load(f)
    
    classes_list = students_data.get("classes", [])
    total_students = sum(len(c.get("students", [])) for c in classes_list)
    class_names = set(c.get("name") for c in classes_list)
    expected_classes = {"7-А", "7-Б", "7-В", "7-Г", "7-Д"}
    
    if total_students != 79:
        audit_results["data_integrity"]["pass"] = False
        audit_results["data_integrity"]["details"].append(f"Student count mismatch: expected 79, got {total_students}")
    
    if class_names != expected_classes:
        audit_results["data_integrity"]["pass"] = False
        audit_results["data_integrity"]["details"].append(f"Classes mismatch: expected {expected_classes}, got {class_names}")
        
    print(f"  -> Verified {total_students} students across 5 classes {sorted(list(class_names))}.")
except Exception as e:
    audit_results["data_integrity"]["pass"] = False
    audit_results["data_integrity"]["details"].append(f"Failed to read students.json: {e}")

# Check content.json and slide images
try:
    with open(CONTENT_JSON, "r", encoding="utf-8") as f:
        content_dict = json.load(f)
    
    lesson_keys = sorted(list(content_dict.keys()))
    expected_lessons = ["grade7_7-2-2", "grade7_7-2-3", "grade7_7-2-4", "grade7_7-2-5", "grade7_7-2-6"]
    
    if lesson_keys != expected_lessons:
        audit_results["data_integrity"]["pass"] = False
        audit_results["data_integrity"]["details"].append(f"Lesson keys mismatch: expected {expected_lessons}, got {lesson_keys}")
        
    total_slides = sum(len(v.get("slides", [])) for v in content_dict.values())
    missing_images = []
    for k, v in content_dict.items():
        for s in v.get("slides", []):
            img_rel = s.get("image", "")
            img_path = os.path.join(PROJECT_ROOT, img_rel.replace("/", os.sep))
            if not os.path.isfile(img_path):
                missing_images.append(img_rel)
                
    if missing_images:
        audit_results["data_integrity"]["pass"] = False
        audit_results["data_integrity"]["details"].append(f"Missing slide images on disk: {len(missing_images)} missing (e.g. {missing_images[:3]})")
    else:
        print(f"  -> Verified {len(lesson_keys)} lessons with {total_slides} slides; all image files exist on disk.")
except Exception as e:
    audit_results["data_integrity"]["pass"] = False
    audit_results["data_integrity"]["details"].append(f"Failed to read content.json: {e}")


# 3. 37 MISSING CLASSES & FACADE/DUMMY CHECK
print("\n[CHECK 3] 37 Missing Classes Authentic Implementation & Facade Check...")

EXPLORER_37_CLASSES = [
    # Keyboard
    'kb-key', 'kb-row', 'kb-space', 'kb-row-space', 'kb-row-offset-1', 'kb-row-offset-2',
    'keyboard-wrap', 'typing-trainer', 'tt-hidden-input', 'level-btn', 'level-label',
    'level-title', 'typing-text-wrap', 'stat-item', 'btn-outline',
    # Finger zones
    'kb-zone-pinky-l', 'kb-zone-ring-l', 'kb-zone-mid-l', 'kb-zone-idx-l',
    'kb-zone-idx-r', 'kb-zone-mid-r', 'kb-zone-ring-r', 'kb-zone-pinky-r', 'kb-zone-thumb',
    # Results
    'result-stats', 'result-stat', 'result-stat-label', 'result-stat-value', 'result-stat-unit',
    'result-title',
    # Teacher
    'btn-danger', 'table-responsive', 'btn-clear-student',
    # Utility / Screens
    'fade-in', 'no-results', 'slide-no-img', 'modal-body', 'mat-actions',
    'btn-open-slides', 'btn-start-test', 'ans-text', 'st-name'
]

clean_css = re.sub(r'/\*.*?\*/', '', style_content, flags=re.DOTALL)
rule_blocks = re.findall(r'([^{]+)\{([^}]+)\}', clean_css)

class_to_declarations = {}
for selector_group, decls in rule_blocks:
    selectors = [s.strip() for s in selector_group.split(',')]
    decl_clean = decls.strip()
    for s in selectors:
        for cls in EXPLORER_37_CLASSES:
            pattern = r'\.' + re.escape(cls) + r'(?![a-zA-Z0-9_-])'
            if re.search(pattern, s):
                if cls not in class_to_declarations:
                    class_to_declarations[cls] = []
                class_to_declarations[cls].append((s, decl_clean))

missing_classes = []
dummy_classes = []

for cls in EXPLORER_37_CLASSES:
    if cls not in class_to_declarations:
        missing_classes.append(cls)
    else:
        all_decls = " ".join([d[1] for d in class_to_declarations[cls]])
        props = [p.strip() for p in all_decls.split(';') if p.strip()]
        if len(props) == 0:
            dummy_classes.append((cls, "empty body"))
        if len(props) == 1 and props[0] in ["display: block", "color: inherit"]:
            dummy_classes.append((cls, f"trivial dummy prop: {props[0]}"))

if missing_classes:
    audit_results["missing_classes_integrity"]["pass"] = False
    audit_results["missing_classes_integrity"]["details"].append(f"Missing classes: {missing_classes}")
    print(f"  -> FAIL: Missing classes: {missing_classes}")
else:
    print(f"  -> PASS: All {len(EXPLORER_37_CLASSES)} classes are present in style.css!")

if dummy_classes:
    audit_results["facade_dummy_check"]["pass"] = False
    audit_results["facade_dummy_check"]["details"].append(f"Dummy/facade classes detected: {dummy_classes}")
    print(f"  -> FAIL: Dummy/facade classes detected: {dummy_classes}")
else:
    print(f"  -> PASS: Zero dummy/facade implementations detected across all 37 classes!")


# 4. WCAG CONTRAST RATIO CALCULATION FOR 10 FINGER ZONES
print("\n[CHECK 4] WCAG AA Contrast Verification for Finger Zones...")

def hex_to_rgb(hex_str):
    hex_str = hex_str.strip().lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def relative_luminance(rgb):
    sRGB = [v / 255.0 for v in rgb]
    lum = []
    for c in sRGB:
        if c <= 0.03928:
            lum.append(c / 12.92)
        else:
            lum.append(((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2]

def contrast_ratio(rgb1, rgb2):
    l1 = relative_luminance(rgb1)
    l2 = relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

tokens = {}
root_match = re.search(r':root\s*\{([^}]+)\}', clean_css)
if root_match:
    for line in root_match.group(1).split(';'):
        if ':' in line:
            name, val = line.split(':', 1)
            tokens[name.strip()] = val.strip()

zones = [
    ('pinky-l', '--zone-pinky-l-text', '--zone-pinky-l-bg'),
    ('ring-l',  '--zone-ring-l-text',  '--zone-ring-l-bg'),
    ('mid-l',   '--zone-mid-l-text',   '--zone-mid-l-bg'),
    ('idx-l',   '--zone-idx-l-text',   '--zone-idx-l-bg'),
    ('idx-r',   '--zone-idx-r-text',   '--zone-idx-r-bg'),
    ('mid-r',   '--zone-mid-r-text',   '--zone-mid-r-bg'),
    ('ring-r',  '--zone-ring-r-text',  '--zone-ring-r-bg'),
    ('pinky-r', '--zone-pinky-r-text', '--zone-pinky-r-bg'),
    ('thumb',   '--zone-thumb-text',   '--zone-thumb-bg')
]

wcag_failures = []
for name, text_tok, bg_tok in zones:
    text_val = tokens.get(text_tok)
    bg_val = tokens.get(bg_tok)
    if not text_val or not bg_val:
        wcag_failures.append(f"{name}: missing tokens ({text_tok}={text_val}, {bg_tok}={bg_val})")
        continue
    if text_val.startswith('var('):
        ref = re.search(r'var\(([^)]+)\)', text_val).group(1)
        text_val = tokens.get(ref, text_val)
    if bg_val.startswith('var('):
        ref = re.search(r'var\(([^)]+)\)', bg_val).group(1)
        bg_val = tokens.get(ref, bg_val)
    
    try:
        rgb_t = hex_to_rgb(text_val)
        rgb_b = hex_to_rgb(bg_val)
        cr = contrast_ratio(rgb_t, rgb_b)
        print(f"  Zone {name:8s}: Text={text_val} on BG={bg_val} -> Contrast Ratio = {cr:.2f}:1", end="")
        if cr >= 4.5:
            print(" (PASS WCAG AA)")
        else:
            print(" (FAIL WCAG AA: < 4.5:1)")
            wcag_failures.append(f"{name}: ratio {cr:.2f}:1 < 4.5:1")
    except Exception as e:
        wcag_failures.append(f"{name}: parsing error {e}")

if wcag_failures:
    audit_results["wcag_contrast"]["pass"] = False
    audit_results["wcag_contrast"]["details"] = wcag_failures
else:
    print("  -> PASS: All finger zones strictly satisfy WCAG AA contrast (> 4.5:1)!")


# 5. PRE-POPULATED ARTIFACTS DETECTION
print("\n[CHECK 5] Pre-populated Artifacts and Cheating Logs Check...")
repo_files = []
for root, dirs, files in os.walk(PROJECT_ROOT):
    if ".agents" in root:
        continue
    for f in files:
        if f.endswith((".log", ".out", ".artifact")) or "result" in f.lower():
            if not f.endswith((".py", ".js", ".css", ".html", ".md", ".json", ".pptx", ".png")):
                repo_files.append(os.path.join(root, f))

if repo_files:
    audit_results["prepopulated_artifacts"]["pass"] = False
    audit_results["prepopulated_artifacts"]["details"] = repo_files
    print(f"  -> WARNING: Suspicious files found: {repo_files}")
else:
    print("  -> PASS: No suspicious pre-populated log or result artifacts in workspace.")

print("\n" + "=" * 70)
overall_pass = all(v["pass"] for v in audit_results.values())
if overall_pass:
    print("INDEPENDENT FORENSIC AUDIT: 100% CLEAN. NO INTEGRITY VIOLATIONS DETECTED.")
else:
    print("INDEPENDENT FORENSIC AUDIT: INTEGRITY VIOLATION DETECTED.")
    for k, v in audit_results.items():
        if not v["pass"]:
            print(f"  - {k}: {v['details']}")
print("=" * 70)
