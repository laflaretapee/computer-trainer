"""
Verify teacher table sticky header behavior and scroll dynamics in headless Chromium.
"""
import asyncio
from playwright.async_api import async_playwright

HTML_URL = r"file:///C:/Users/dinar/.gemini/antigravity/scratch/computer-trainer/index.html"

async def test_teacher_table():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto(HTML_URL)
        
        # Navigate to teacher screen
        await page.click('#btn-teacher')
        await page.fill('#teacher-password', 'учитель7')
        await page.click('#btn-teacher-enter')
        await page.wait_for_timeout(300)
        
        # Check if teacher table is rendered
        table = page.locator('.teacher-table')
        is_visible = await table.is_visible()
        print(f"Teacher table visible: {is_visible}")
        
        # Check th position and computed styles
        th = page.locator('.teacher-table th').first
        th_pos = await th.evaluate("el => window.getComputedStyle(el).position")
        th_top = await th.evaluate("el => window.getComputedStyle(el).top")
        print(f"Current th position: '{th_pos}', top: '{th_top}'")
        
        # Check .table-responsive styles
        resp = page.locator('.table-responsive')
        resp_overflow_x = await resp.evaluate("el => window.getComputedStyle(el).overflowX")
        resp_overflow_y = await resp.evaluate("el => window.getComputedStyle(el).overflowY")
        print(f"Current .table-responsive overflowX: '{resp_overflow_x}', overflowY: '{resp_overflow_y}'")
        
        # Check btn-danger styling
        btn_danger = page.locator('#btn-reset-data')
        btn_bg = await btn_danger.evaluate("el => window.getComputedStyle(el).backgroundColor")
        btn_color = await btn_danger.evaluate("el => window.getComputedStyle(el).color")
        print(f"Current #btn-reset-data background: '{btn_bg}', color: '{btn_color}'")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(test_teacher_table())
