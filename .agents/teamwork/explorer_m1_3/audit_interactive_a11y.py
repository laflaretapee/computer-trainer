"""
Interactive States, Accessibility, Design Tokens, Teacher Usability, and Offline Asset Audit
For Milestone 1 - Explorer 3
"""
import re
import os
import math

REPO_ROOT = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"

def audit_offline_assets():
    print("=== 1. AUDITING OFFLINE ASSETS & EXTERNAL REFERENCES ===")
    url_pattern = re.compile(r'(https?://[^\s\'"<>]+|//[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,}[^\s\'"<>]*)', re.IGNORECASE)
    
    suspicious_files = []
    clean_files = []
    
    extensions = ('.html', '.css', '.js', '.json', '.md')
    for root, dirs, files in os.walk(REPO_ROOT):
        # Skip .git or .agents teamwork except if relevant
        if '.git' in root:
            continue
        for f in files:
            if f.endswith(extensions):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, REPO_ROOT)
                # Ignore .agents/teamwork reports mentioning external URLs in text
                if '.agents' in rel_path:
                    continue
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        content = fp.read()
                        matches = url_pattern.findall(content)
                        if matches:
                            suspicious_files.append((rel_path, matches))
                        else:
                            clean_files.append(rel_path)
                except Exception as e:
                    print(f"Error reading {rel_path}: {e}")

    print(f"Total clean files checked: {len(clean_files)}")
    if suspicious_files:
        print(f"WARNING: Found {len(suspicious_files)} files with external URL references:")
        for path, matches in suspicious_files:
            print(f"  - {path}: {matches[:3]}")
    else:
        print("PASS: 100% Strict Offline Operation Confirmed! Zero remote URLs in runtime files.")
    return suspicious_files

def audit_css_interactive_states():
    print("\n=== 2. AUDITING CSS INTERACTIVE STATES IN style.css ===")
    css_path = os.path.join(REPO_ROOT, "style.css")
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    # Search pseudo-classes
    hovers = re.findall(r'([^{}]+):hover\b', css)
    actives = re.findall(r'([^{}]+):active\b', css)
    focuses = re.findall(r'([^{}]+):focus\b', css)
    focus_visibles = re.findall(r'([^{}]+):focus-visible\b', css)

    print(f"Total :hover rules: {len(hovers)}")
    for h in hovers[:10]:
        print(f"  hover: {h.strip()}")
    if len(hovers) > 10:
        print(f"  ... and {len(hovers) - 10} more")

    print(f"\nTotal :active rules: {len(actives)}")
    for a in actives:
        print(f"  active: {a.strip()}")

    print(f"\nTotal :focus rules: {len(focuses)}")
    for fc in focuses:
        print(f"  focus: {fc.strip()}")

    print(f"\nTotal :focus-visible rules: {len(focus_visibles)}")
    for fv in focus_visibles:
        print(f"  focus-visible: {fv.strip()}")

def luminance(r, g, b):
    # sRGB to linear
    def to_linear(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * to_linear(r) + 0.7152 * to_linear(g) + 0.0722 * to_linear(b)

def contrast_ratio(hex1, hex2):
    def hex_to_rgb(h):
        h = h.lstrip('#')
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    
    l1 = luminance(*hex_to_rgb(hex1))
    l2 = luminance(*hex_to_rgb(hex2))
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def audit_finger_zone_contrast():
    print("\n=== 3. AUDITING 10-FINGER ZONE PALETTE CONTRAST ===")
    # Proposed colors from survey
    zones = {
        'pinky-l': {'bg': '#ffe4e6', 'color': '#be123c', 'name': 'Левый мизинец'},
        'ring-l':  {'bg': '#ffedd5', 'color': '#c2410c', 'name': 'Левый безымянный'},
        'mid-l':   {'bg': '#fef9c3', 'color': '#a16207', 'name': 'Левый средний'},
        'idx-l':   {'bg': '#dcfce7', 'color': '#15803d', 'name': 'Левый указательный'},
        'idx-r':   {'bg': '#cffafe', 'color': '#0e7490', 'name': 'Правый указательный'},
        'mid-r':   {'bg': '#e0e7ff', 'color': '#4338ca', 'name': 'Правый средний'},
        'ring-r':  {'bg': '#f3e8ff', 'color': '#7e22ce', 'name': 'Правый безымянный'},
        'pinky-r': {'bg': '#fce7f3', 'color': '#be185d', 'name': 'Правый мизинец'},
        'thumb':   {'bg': '#f1f5f9', 'color': '#334155', 'name': 'Большие пальцы (Пробел)'},
    }
    
    # Also check dark text on key background (#1e293b text vs bg)
    dark_text = '#1e293b'
    print("WCAG AA requires >= 4.5:1 for normal text, >= 3:1 for large/bold text.")
    print("-" * 75)
    for k, v in zones.items():
        cr_accent = contrast_ratio(v['bg'], v['color'])
        cr_dark = contrast_ratio(v['bg'], dark_text)
        print(f"Zone {k:8} ({v['name']}):")
        print(f"   Key BG: {v['bg']} | Accent text ({v['color']}): ratio = {cr_accent:.2f}:1 -> {'PASS' if cr_accent >= 4.5 else 'FAIL (<4.5)'}")
        print(f"   Key BG: {v['bg']} | Dark text   ({dark_text}): ratio = {cr_dark:.2f}:1 -> {'PASS' if cr_dark >= 4.5 else 'FAIL (<4.5)'}")

if __name__ == '__main__':
    audit_offline_assets()
    audit_css_interactive_states()
    audit_finger_zone_contrast()
