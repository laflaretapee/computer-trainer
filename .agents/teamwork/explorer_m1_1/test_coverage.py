import re

proposed_rules = [
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

# Check against our audit_classes missing list
from audit_classes import missing

missing_set = set(missing.keys())
proposed_set = set(proposed_rules)

# filter out template artifacts from missing_set like hasData, grade-
clean_missing = {c for c in missing_set if not c.startswith(('grade-', 'hasData', '${'))}

print(f"Clean missing classes count: {len(clean_missing)}")
uncovered = clean_missing - proposed_set
print(f"Uncovered missing classes: {uncovered}")
assert len(uncovered) == 0, f"Uncovered classes exist: {uncovered}"
print("All missing classes are covered by proposed specification!")
