#!/usr/bin/env python3
"""
Индексатор презентаций для тренажёра.

Как использовать:
1. Положи .pptx файлы в папку presentations/<класс>/  (например, presentations/7А/)
2. Запусти: python index_presentations.py
3. Результат появится в папке indexed/ и data/content.json

Скрипт:
- Извлекает текст со слайдов → data/content.json (для тестов/теории)
- Конвертирует слайды в PNG-картинки → indexed/<тема>/slide_01.png (для просмотра)
"""

import os
import re
import json
import shutil
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches
from PIL import Image
import io

# ── Пути ──────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
PRES_DIR      = BASE_DIR / "presentations"
INDEXED_DIR   = BASE_DIR / "indexed"
DATA_DIR      = BASE_DIR / "data"
CONTENT_FILE  = DATA_DIR / "content.json"

DATA_DIR.mkdir(exist_ok=True)
INDEXED_DIR.mkdir(exist_ok=True)

# ── Вспомогательные функции ───────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Превращает название в безопасное имя папки."""
    text = text.strip().replace(" ", "_")
    text = re.sub(r"[^\w\-]", "", text, flags=re.UNICODE)
    return text or "unknown"


def extract_slide_text(slide) -> str:
    """Извлекает весь текст со слайда."""
    parts = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                line = "".join(run.text for run in para.runs).strip()
                if line:
                    parts.append(line)
    return "\n".join(parts)


def export_slide_as_image(slide, prs, out_path: Path, width_px: int = 1280):
    """
    Экспортирует слайд в PNG через python-pptx + Pillow.
    Использует встроенные изображения + текстовый рендер (упрощённый).
    Для полного рендера нужен LibreOffice — но это работает офлайн без него.
    """
    from pptx.util import Emu
    from PIL import Image, ImageDraw, ImageFont
    import textwrap

    slide_w = prs.slide_width
    slide_h = prs.slide_height
    ratio = slide_h / slide_w
    height_px = int(width_px * ratio)

    img = Image.new("RGB", (width_px, height_px), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    def emu_to_px_x(emu): return int(emu / slide_w * width_px)
    def emu_to_px_y(emu): return int(emu / slide_h * height_px)

    for shape in slide.shapes:
        # Встроенные изображения
        if shape.shape_type == 13:  # MSO_SHAPE_TYPE.PICTURE
            try:
                img_data = shape.image.blob
                shape_img = Image.open(io.BytesIO(img_data)).convert("RGBA")
                x = emu_to_px_x(shape.left)
                y = emu_to_px_y(shape.top)
                w = emu_to_px_x(shape.width)
                h = emu_to_px_y(shape.height)
                shape_img = shape_img.resize((w, h), Image.LANCZOS)
                img.paste(shape_img, (x, y), shape_img)
            except Exception:
                pass

        # Текст
        if shape.has_text_frame:
            x = emu_to_px_x(shape.left)
            y = emu_to_px_y(shape.top)
            w = emu_to_px_x(shape.width)

            for para in shape.text_frame.paragraphs:
                text = "".join(run.text for run in para.runs).strip()
                if not text:
                    y += 20
                    continue

                # Определяем размер шрифта
                font_size = 16
                try:
                    for run in para.runs:
                        if run.font.size:
                            font_size = max(10, int(run.font.size.pt * height_px / 540))
                            break
                except Exception:
                    pass

                # Пробуем загрузить системный шрифт
                font = None
                for font_path in [
                    "C:/Windows/Fonts/arial.ttf",
                    "C:/Windows/Fonts/calibri.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                ]:
                    if os.path.exists(font_path):
                        try:
                            font = ImageFont.truetype(font_path, font_size)
                            break
                        except Exception:
                            pass
                if font is None:
                    font = ImageFont.load_default()

                # Цвет текста
                fill_color = (0, 0, 0)
                try:
                    for run in para.runs:
                        if run.font.color and run.font.color.type:
                            rgb = run.font.color.rgb
                            fill_color = (rgb.red, rgb.green, rgb.blue)
                            break
                except Exception:
                    pass

                # Перенос текста
                chars_per_line = max(10, w // (font_size // 2 + 1))
                lines = textwrap.wrap(text, width=chars_per_line) or [text]
                for line in lines:
                    draw.text((x, y), line, fill=fill_color, font=font)
                    y += font_size + 4
            y += 10  # отступ между шейпами

    img.save(out_path, "PNG", optimize=True)


# ── Основной цикл ─────────────────────────────────────────────────────────────

def index_all():
    all_content = {}

    # Загружаем существующий content.json если есть
    if CONTENT_FILE.exists():
        with open(CONTENT_FILE, encoding="utf-8") as f:
            all_content = json.load(f)

    pptx_files = list(PRES_DIR.rglob("*.pptx"))
    if not pptx_files:
        print(f"⚠️  Не найдено .pptx файлов в папке: {PRES_DIR}")
        print("   Положи презентации в папку:")
        print("   presentations/grade7/Тема_1.pptx")
        return

    print(f"🔍 Найдено файлов: {len(pptx_files)}\n")

    for pptx_path in pptx_files:
        # Определяем тему из имени файла (класс — всегда grade7)
        klass = "grade7"
        topic_name = pptx_path.stem

        slug = slugify(f"{klass}_{topic_name}")
        slide_out_dir = INDEXED_DIR / slug
        slide_out_dir.mkdir(exist_ok=True)

        print(f"📂 [{klass}] {topic_name}")

        try:
            prs = Presentation(str(pptx_path))
        except Exception as e:
            print(f"   ❌ Ошибка чтения: {e}")
            continue

        slides_data = []
        for i, slide in enumerate(prs.slides, start=1):
            text = extract_slide_text(slide)

            # Экспорт слайда в PNG
            img_name = f"slide_{i:02d}.png"
            img_path = slide_out_dir / img_name
            try:
                export_slide_as_image(slide, prs, img_path)
                print(f"   🖼️  Слайд {i:02d} → {img_name}")
            except Exception as e:
                print(f"   ⚠️  Слайд {i:02d}: картинка не создана ({e})")
                img_name = None

            slides_data.append({
                "slide": i,
                "text": text,
                "image": f"indexed/{slug}/{img_name}" if img_name else None,
            })

        all_content[slug] = {
            "class":   klass,
            "topic":   topic_name,
            "slug":    slug,
            "file":    str(pptx_path.relative_to(BASE_DIR)),
            "slides":  slides_data,
            # Весь текст презентации одной строкой — удобно для поиска/тестов
            "full_text": "\n\n".join(
                s["text"] for s in slides_data if s["text"]
            ),
        }
        print(f"   ✅ Готово: {len(slides_data)} слайдов\n")

    # Сохраняем
    with open(CONTENT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_content, f, ensure_ascii=False, indent=2)

    print(f"💾 Индекс сохранён: {CONTENT_FILE}")
    print(f"   Всего тем: {len(all_content)}")
    print("\n✨ Теперь открой data/content.json — там весь контент для тренажёра.")


if __name__ == "__main__":
    index_all()
