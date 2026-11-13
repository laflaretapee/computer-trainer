import sys
import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--window-size=1280,720')

try:
    driver = webdriver.Edge(options=options)
    url = "file:///" + os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html").replace("\\", "/")
    driver.get(url)
    print("Page title:", driver.title)
    driver.quit()
    print("Selenium Edge test successful!")
except Exception as e:
    print("Selenium Edge test error:", e)
