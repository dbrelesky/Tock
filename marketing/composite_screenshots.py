#!/usr/bin/env python3
"""Generate ALL App Store screenshots: iPhone 6.5", iPhone 6.7", iPad, and Mac."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from composite_frames import (
    composite_frame, get_overlay, get_headline_font, get_subtitle_font,
    draw_centered_text, draw_text_with_shadow, center_screenshot_content,
    TEXT_COLOR, SUBTEXT_COLOR, BASE_DIR,
    OVERLAY_ORIG_W, OVERLAY_ORIG_H,
    SCREEN_LEFT_FRAC, SCREEN_TOP_FRAC, SCREEN_RIGHT_FRAC, SCREEN_BOTTOM_FRAC,
)

CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")
MACBOOK_FRAME_SRC = os.path.join(BASE_DIR, "macbook_frame_green.png")
MACBOOK_FRAME_OVERLAY = os.path.join(BASE_DIR, "macbook_frame_overlay.png")

# App Store screenshot sizes
IPHONE65_W, IPHONE65_H = 1284, 2778    # iPhone 6.5"
IPHONE67_W, IPHONE67_H = 1290, 2796    # iPhone 6.7"
IPAD_W, IPAD_H = 2048, 2732            # iPad Pro 12.9"
MAC_W, MAC_H = 2880, 1800              # Mac

# Screenshot definitions: (bg, capture, lines, base_name, y_offset)
SCREENSHOTS = [
    ("bg01_airport.png", "fresh_withseconds.png",
     [("YOUR AIRPORT", 96, TEXT_COLOR, True),
      ("HAS A CLOCK.", 96, TEXT_COLOR, True),
      ("So should your phone.", 56, SUBTEXT_COLOR, False)],
     "hero", 60),

    ("bg04_worldmap.png", "fresh_withseconds.png",
     [("FIVE TIME ZONES.", 96, TEXT_COLOR, True),
      ("Zero excuses for", 56, SUBTEXT_COLOR, False),
      ("missing that call.", 56, SUBTEXT_COLOR, False)],
     "world_clocks", 60),

    ("bg03_gorilla.png", "fresh_withseconds.png",
     [("MECHANICALLY", 96, TEXT_COLOR, True),
      ("SATISFYING.", 96, TEXT_COLOR, True),
      ("Digitally obsessive.", 56, SUBTEXT_COLOR, False)],
     "flip_detail", 60),

    ("bg06_workshop.png", "fresh_settings.png",
     [("YOUR CLOCK,", 96, TEXT_COLOR, True),
      ("YOUR RULES.", 96, TEXT_COLOR, True),
      ("Add any city. We won't judge.", 48, SUBTEXT_COLOR, False)],
     "settings", 60),

    ("bg05_weather.png", "fresh_withseconds.png",
     [("WEATHER", 110, TEXT_COLOR, True),
      ("INCLUDED.", 110, TEXT_COLOR, True),
      ("You're welcome.", 56, SUBTEXT_COLOR, False)],
     "weather", 60),

    ("bg07_space.png", "fresh_withseconds.png",
     [("SECONDS?", 110, TEXT_COLOR, True),
      ("OBVIOUSLY.", 110, TEXT_COLOR, True),
      ("For the obsessively punctual.", 52, SUBTEXT_COLOR, False)],
     "widgets", 60),
]


# ── MacBook frame extraction ──

def extract_macbook_frame():
    """Extract MacBook frame from green screen, making green and screen area transparent."""
    if os.path.exists(MACBOOK_FRAME_OVERLAY):
        print("  MacBook frame overlay already exists, skipping extraction.")
        return

    print("  Extracting MacBook frame from green screen...")
    img = Image.open(MACBOOK_FRAME_SRC).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]

    # Detect green pixels (green screen background)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green_mask = (g > 150) & (r < 120) & (b < 120)

    # Detect screen area (very dark interior of the laptop)
    # Screen bounds found by analysis: roughly rows 247-932, cols 858-1956
    # But we want a more robust approach - find the dark rectangular area
    brightness = r + g + b
    dark_mask = brightness < 30  # nearly black

    # Create a screen region mask: flood from center of known screen area
    # Screen center is approximately row 590, col 1408
    screen_center_r, screen_center_c = 590, 1408

    # Define screen bounds more precisely by scanning from center
    # Scan to find exact screen edges
    scan_row = screen_center_r
    left_edge, right_edge = 858, 1956
    top_edge, bottom_edge = 247, 932

    # Refine: scan from center outward for each direction
    for c in range(screen_center_c, 0, -1):
        if brightness[scan_row, c] > 30:
            left_edge = c + 1
            break
    for c in range(screen_center_c, w):
        if brightness[scan_row, c] > 30:
            right_edge = c - 1
            break
    for rr in range(screen_center_r, 0, -1):
        if brightness[rr, screen_center_c] > 30:
            top_edge = rr + 1
            break
    for rr in range(screen_center_r, h):
        if brightness[rr, screen_center_c] > 30:
            bottom_edge = rr - 1
            break

    print(f"    Screen bounds: ({left_edge}, {top_edge}) - ({right_edge}, {bottom_edge})")

    # Make screen area transparent (with some margin inward to avoid bezel artifacts)
    margin = 3
    screen_mask = np.zeros((h, w), dtype=bool)
    screen_mask[top_edge + margin:bottom_edge - margin,
                left_edge + margin:right_edge - margin] = True

    # Make green background transparent
    result = arr.copy()
    result[green_mask, 3] = 0

    # Make screen area transparent
    result[screen_mask, 3] = 0

    # Handle green fringing on edges of the laptop body
    # For pixels near the green boundary, reduce alpha based on green channel
    for _ in range(3):
        # Find edge pixels that are semi-green
        semi_green = (g > 100) & (r < 150) & (b < 150) & ~green_mask
        result[semi_green, 3] = np.clip(
            255 - (arr[semi_green, 1] - arr[semi_green, 0]) * 2, 0, 255
        )

    out = Image.fromarray(result.astype(np.uint8), "RGBA")
    out.save(MACBOOK_FRAME_OVERLAY)
    print(f"    Saved: {MACBOOK_FRAME_OVERLAY}")

    # Store screen bounds for later use
    return left_edge, top_edge, right_edge, bottom_edge


# MacBook screen bounds (from analysis of the green screen image)
# These are the coordinates within the original 2816x1536 MacBook frame image
MAC_SCREEN_LEFT = 858
MAC_SCREEN_TOP = 248
MAC_SCREEN_RIGHT = 1957
MAC_SCREEN_BOTTOM = 933


def get_macbook_overlay():
    """Load the MacBook frame overlay."""
    return Image.open(MACBOOK_FRAME_OVERLAY).convert("RGBA")


def create_desktop_capture(mobile_capture_path):
    """Create a desktop-aspect-ratio version of the mobile capture.
    Places the mobile capture centered on a dark background at 16:10 ratio."""
    mobile = Image.open(mobile_capture_path).convert("RGBA")
    mobile = center_screenshot_content(mobile)

    # Target aspect: 16:10, using the MacBook screen dimensions
    screen_w = MAC_SCREEN_RIGHT - MAC_SCREEN_LEFT  # ~1099
    screen_h = MAC_SCREEN_BOTTOM - MAC_SCREEN_TOP   # ~685
    desk_w, desk_h = screen_w, screen_h

    desktop = Image.new("RGBA", (desk_w, desk_h), (26, 26, 26, 255))

    # Scale mobile capture to fit height, centered horizontally
    scale = desk_h / mobile.height
    new_w = int(mobile.width * scale)
    new_h = desk_h
    mobile_resized = mobile.resize((new_w, new_h), Image.LANCZOS)

    x = (desk_w - new_w) // 2
    desktop.paste(mobile_resized, (x, 0), mobile_resized)
    return desktop


def composite_mac_frame(bg_path, screenshot_path, lines, output_path):
    """Create a Mac App Store screenshot with the MacBook frame."""
    ow, oh = MAC_W, MAC_H

    # Load and prepare background
    bg = Image.open(bg_path).convert("RGBA")
    bg = bg.resize((ow, oh), Image.LANCZOS)
    dark = Image.new("RGBA", (ow, oh), (0, 0, 0, 110))
    bg = Image.alpha_composite(bg, dark)
    bg_rgb = bg.convert("RGB").filter(ImageFilter.GaussianBlur(radius=20))
    canvas = bg_rgb.convert("RGBA")

    # Load MacBook overlay
    mac_overlay = get_macbook_overlay()
    mac_orig_w, mac_orig_h = mac_overlay.size  # 2816 x 1536

    # Scale MacBook to fit nicely in output (about 85% of width)
    mac_scale = 0.82
    mac_w = int(ow * mac_scale)
    mac_h = int(mac_w * mac_orig_h / mac_orig_w)

    # Position: centered horizontally, lower portion of frame (leave room for text)
    mac_x = (ow - mac_w) // 2
    mac_y = oh - mac_h - int(oh * 0.04)  # 4% from bottom

    # Scale screen bounds to match scaled overlay
    scale_factor = mac_w / mac_orig_w
    screen_x = mac_x + int(MAC_SCREEN_LEFT * scale_factor)
    screen_y = mac_y + int(MAC_SCREEN_TOP * scale_factor)
    screen_w = int((MAC_SCREEN_RIGHT - MAC_SCREEN_LEFT) * scale_factor)
    screen_h = int((MAC_SCREEN_BOTTOM - MAC_SCREEN_TOP) * scale_factor)

    # Create desktop capture and fit into screen area
    desktop = create_desktop_capture(screenshot_path)
    desktop = desktop.resize((screen_w, screen_h), Image.LANCZOS)

    # Create rounded screen mask
    screen_radius = int(6 * scale_factor)
    mask = Image.new("L", (screen_w, screen_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_radius, fill=255)

    # Drop shadow behind laptop
    shadow = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [mac_x + 8, mac_y + 12, mac_x + mac_w + 8, mac_y + mac_h + 12],
        radius=int(20 * scale_factor), fill=(0, 0, 0, 140)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=25))
    canvas = Image.alpha_composite(canvas, shadow)

    # Paste desktop capture into screen area
    canvas.paste(desktop, (screen_x, screen_y), mask)

    # Overlay MacBook frame on top
    scaled_overlay = mac_overlay.resize((mac_w, mac_h), Image.LANCZOS)
    frame_layer = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    frame_layer.paste(scaled_overlay, (mac_x, mac_y), scaled_overlay)
    canvas = Image.alpha_composite(canvas, frame_layer)

    # Text overlay at top
    text_layer = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    font_scale = ow / 1284  # scale relative to iPhone base
    # Mac is landscape, so use slightly larger fonts
    current_y = int(60)
    for text, size, color, is_headline in lines:
        scaled_size = int(size * font_scale * 0.85)  # slightly smaller for landscape
        font = get_headline_font(scaled_size) if is_headline else get_subtitle_font(scaled_size)
        h = draw_centered_text(text_draw, text, current_y, font, fill=color, canvas_w=ow)
        current_y += h + int(14 * font_scale)

    canvas = Image.alpha_composite(canvas, text_layer)

    canvas.convert("RGB").save(output_path, quality=95)
    print(f"  Saved: {output_path}")


def main():
    # Step 1: Extract MacBook frame if needed
    print("=== Step 1: Extract MacBook frame ===")
    # Force re-extraction
    if os.path.exists(MACBOOK_FRAME_OVERLAY):
        os.remove(MACBOOK_FRAME_OVERLAY)
    extract_macbook_frame()

    # Step 2: Generate all screenshots
    print("\n=== Step 2: Generate screenshots ===")

    num_idx = {
        "hero": 1, "world_clocks": 2, "flip_detail": 3,
        "settings": 4, "weather": 5, "widgets": 6,
    }

    generated = []

    for bg_file, capture, lines, base_name, y_offset in SCREENSHOTS:
        bg_path = os.path.join(BG_DIR, bg_file)
        capture_path = os.path.join(CAPTURES_DIR, capture)
        idx = num_idx[base_name]

        if not os.path.exists(bg_path):
            print(f"  SKIP (no bg): {bg_file}")
            continue
        if not os.path.exists(capture_path):
            print(f"  SKIP (no capture): {capture}")
            continue

        # iPhone 6.5"
        fname = f"screen{idx}_{base_name}.png"
        out_path = os.path.join(BASE_DIR, fname)
        print(f"\niPhone 6.5\": {fname}")
        composite_frame(bg_path, capture_path, lines, out_path, y_offset,
                        out_w=IPHONE65_W, out_h=IPHONE65_H, phone_scale=0.82)
        generated.append((fname, IPHONE65_W, IPHONE65_H))

        # iPhone 6.7"
        fname = f"screen67_{idx}_{base_name}.png"
        out_path = os.path.join(BASE_DIR, fname)
        print(f"iPhone 6.7\": {fname}")
        composite_frame(bg_path, capture_path, lines, out_path, y_offset,
                        out_w=IPHONE67_W, out_h=IPHONE67_H, phone_scale=0.82)
        generated.append((fname, IPHONE67_W, IPHONE67_H))

        # iPad Pro 12.9"
        fname = f"ipad_screen{idx}_{base_name}.png"
        out_path = os.path.join(BASE_DIR, fname)
        print(f"iPad:       {fname}")
        composite_frame(bg_path, capture_path, lines, out_path, y_offset,
                        out_w=IPAD_W, out_h=IPAD_H, phone_scale=0.48)
        generated.append((fname, IPAD_W, IPAD_H))

        # Mac
        fname = f"mac_screen{idx}_{base_name}.png"
        out_path = os.path.join(BASE_DIR, fname)
        print(f"Mac:        {fname}")
        composite_mac_frame(bg_path, capture_path, lines, out_path)
        generated.append((fname, MAC_W, MAC_H))

    # Step 3: Verify all outputs
    print("\n\n=== Verification ===")
    all_ok = True
    for fname, exp_w, exp_h in generated:
        path = os.path.join(BASE_DIR, fname)
        if os.path.exists(path):
            img = Image.open(path)
            w, h = img.size
            status = "OK" if (w == exp_w and h == exp_h) else f"WRONG SIZE ({w}x{h})"
            print(f"  {status}: {fname} ({w}x{h})")
            if w != exp_w or h != exp_h:
                all_ok = False
        else:
            print(f"  MISSING: {fname}")
            all_ok = False

    total = len(generated)
    print(f"\n{'All' if all_ok else 'Some'} {total} screenshots generated {'successfully' if all_ok else 'with issues'}.")


if __name__ == "__main__":
    main()
