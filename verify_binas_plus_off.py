from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Enable console logging
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    # Go to home page
    page.goto("http://localhost:3000/index.html")

    # Clear localStorage to avoid admin overrides
    page.evaluate("localStorage.clear()")
    page.reload()

    # Wait for page to likely stabilize (Firestore init)
    page.wait_for_timeout(5000)

    # Check config value
    config_val = page.evaluate("window.BINAS_CONFIG.enableBinasPlus")
    print(f"BINAS_CONFIG.enableBinasPlus = {config_val}")

    # Take screenshot of main view
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/home_view.png")

    # Check 1: Buy Button
    try:
        buy_btn = page.locator("#btn-menu-purchase")
        expect(buy_btn).to_be_hidden(timeout=5000)
        print("PASS: Buy button is hidden.")
    except:
        print("FAIL: Buy button is visible!")

    # Check 2: Chat Icon
    try:
        chat_btn = page.locator("#btn-menu-chat")
        classes = chat_btn.get_attribute("class")
        if "gold-icon" in classes:
             print(f"FAIL: Chat icon has gold-icon class! ({classes})")
        else:
             print("PASS: Chat icon does not have gold-icon class.")
    except Exception as e:
        print(f"FAIL: Checking chat icon: {e}")

    # Check 3: Settings Links
    page.click("#btn-menu-settings")
    page.wait_for_selector("#settings-overlay.visible")

    page.screenshot(path="/home/jules/verification/settings_view.png")

    try:
        settings_links = page.locator("#settings-links-container")
        # Check visibility via expect to be hidden
        if settings_links.is_visible():
             # Double check styling
             is_hidden = page.evaluate('document.getElementById("settings-links-container").hidden')
             print(f"Element hidden attribute: {is_hidden}")
             display = page.evaluate('getComputedStyle(document.getElementById("settings-links-container")).display')
             print(f"Element display style: {display}")
             print("FAIL: Settings links container is visible!")
        else:
             print("PASS: Settings links container is hidden.")
    except Exception as e:
        print(f"FAIL: Settings links check: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
