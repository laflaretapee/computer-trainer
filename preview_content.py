import json
with open('data/content.json', encoding='utf-8') as f:
    data = json.load(f)
for slug, item in data.items():
    slides = item['slides']
    topic = item['topic']
    print(f"=== {topic} ({len(slides)} слайдов) ===")
    count = 0
    for s in slides:
        txt = s['text']
        if txt and count < 4:
            preview = txt[:250].replace('\n', ' | ')
            print(f"  Слайд {s['slide']}: {preview}")
            count += 1
    print()
