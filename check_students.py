import json
with open('data/students.json', encoding='utf-8') as f:
    data = json.load(f)
total = 0
for cls in data['classes']:
    n = len(cls['students'])
    total += n
    print(f"{cls['name']}: {n} учеников")
print(f"Итого: {total} учеников")
