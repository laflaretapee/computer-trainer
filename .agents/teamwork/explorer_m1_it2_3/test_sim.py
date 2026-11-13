"""
Simulation of CSS calculations for Explorer 3
Verifies student card width calculations across all 9 viewports in test_m1_adversarial_challenger.py
"""
import math

VIEWPORTS = [
    {"name": "Standard Laptop 720p", "width": 1280, "height": 720, "scale": 1.0, "winW": 1280, "winH": 577},
    {"name": "Standard Laptop 768p", "width": 1366, "height": 768, "scale": 1.0, "winW": 1366, "winH": 625},
    {"name": "Full HD 1080p", "width": 1920, "height": 1080, "scale": 1.0, "winW": 1920, "winH": 937},
    {"name": "16:10 Laptop/Desktop", "width": 1440, "height": 900, "scale": 1.0, "winW": 1440, "winH": 757},
    {"name": "Extreme Boundary Netbook", "width": 1024, "height": 550, "scale": 1.0, "winW": 992, "winH": 407},
    {"name": "1920x1080 @ 125% Scale", "width": 1536, "height": 864, "scale": 1.25, "winW": 1536, "winH": 864},
    {"name": "1920x1080 @ 150% Scale", "width": 1280, "height": 720, "scale": 1.5, "winW": 1280, "winH": 720},
    {"name": "1366x768 @ 125% Scale", "width": 1093, "height": 614, "scale": 1.25, "winW": 1093, "winH": 614},
    {"name": "1366x768 @ 150% Scale", "width": 911, "height": 512, "scale": 1.5, "winW": 911, "winH": 512},
    # Extra stress boundary
    {"name": "Direct 900px boundary", "width": 900, "height": 500, "scale": 1.0, "winW": 900, "winH": 500},
]

def clamp(val, min_v, max_v):
    return max(min_v, min(val, max_v))

def simulate_grid():
    print(f"{'Viewport':<30} | {'winW':<5} | {'minCol':<7} | {'cols':<4} | {'cardW':<7} | {'min>=180':<8} | {'max<=420':<8}")
    print("-" * 85)
    for vp in VIEWPORTS:
        w = vp["winW"]
        # Screen body padding: clamp(16px, 3vw, 32px)
        pad_h = clamp(0.03 * w, 16.0, 32.0)
        avail_w = w - 2 * pad_h
        
        # Gap: clamp(10px, 1.2vw, 16px)
        gap = clamp(0.012 * w, 10.0, 16.0)
        
        # Grid min col: clamp(220px, 24vw, 280px)
        # Note: if min-width: 1600px rule applies (w >= 1600):
        if w >= 1600:
            avail_w = min(avail_w, 1400.0)
            col_min = 280.0
        else:
            col_min = clamp(0.24 * w, 220.0, 280.0)
            
        # auto-fill column count calculation in CSS Grid:
        # cols = floor((avail_w + gap) / (col_min + gap))
        cols = math.floor((avail_w + gap) / (col_min + gap))
        if cols < 1:
            cols = 1
            
        # card width with 1fr:
        card_w = (avail_w - (cols - 1) * gap) / cols
        
        c1 = card_w >= 180.0
        c2 = card_w <= 420.0
        
        print(f"{vp['name']:<30} | {w:<5} | {col_min:<7.1f} | {cols:<4} | {card_w:<7.1f} | {str(c1):<8} | {str(c2):<8}")

if __name__ == "__main__":
    simulate_grid()


def simulate_typing_screen():
    print("\n" + "=" * 85)
    print("TYPING SCREEN VERTICAL BUDGET SIMULATION (winH = 407px)")
    print("=" * 85)
    
    # winH = 407px
    winH = 407.0
    
    # 1. Header:
    # padding: 6px top, 6px bottom = 12px
    # border-bottom: 2px
    # back button height: 26px (padding 4px top/bottom + 16px font/line-height + 2px border)
    headerH = 12 + 2 + 26
    
    # 2. Screen body padding:
    # padding: 6px top, 6px bottom = 12px
    bodyPadH = 12.0
    
    # 3. Typing trainer gaps:
    # 5 gaps * 4px = 20px
    gapsH = 20.0
    
    # 4. Level selector:
    # button: padding 2px top/bottom + 14px font + 2px border = 20px
    levelSelH = 20.0
    
    # 5. Level title:
    # padding 3px top/bottom + 14px font = 20px
    levelTitleH = 20.0
    
    # 6. Typing text wrap:
    # min-height: 36px, border: 2px, padding: 8px = 38px
    textH = 38.0
    
    # 7. Keyboard:
    # 4 rows of keys: height 28px each = 112px
    # 3 gaps of 2px = 6px
    # padding: 4px top + 4px bottom = 8px
    kbH = 112 + 6 + 8
    
    # 8. Stats:
    # font-size: 0.75rem (~12px) + line-height = 18px
    statsH = 18.0
    
    totalH = headerH + bodyPadH + gapsH + levelSelH + levelTitleH + textH + kbH + statsH
    kbBottom = headerH + (bodyPadH / 2) + levelSelH + levelTitleH + textH + kbH + (4 * 4.0)
    
    print(f"Header:           {headerH:.1f}px")
    print(f"Body Padding:     {bodyPadH:.1f}px")
    print(f"Level Selector:   {levelSelH:.1f}px")
    print(f"Level Title:      {levelTitleH:.1f}px")
    print(f"Text Input Box:   {textH:.1f}px")
    print(f"Keyboard Total:   {kbH:.1f}px")
    print(f"Gaps (5 x 4px):   {gapsH:.1f}px")
    print(f"Stats Bar:        {statsH:.1f}px")
    print("-" * 40)
    print(f"Total Stack H:    {totalH:.1f}px (winH = {winH:.1f}px) -> Margin: +{winH - totalH:.1f}px")
    print(f"Keyboard Bottom:  {kbBottom:.1f}px <= {winH + 2:.1f}px -> Visible: {kbBottom <= winH + 2}")
    print(f"Doc Scroll H <= winH: {totalH <= winH}")

if __name__ == "__main__":
    simulate_typing_screen()
