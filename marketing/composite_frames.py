#!/usr/bin/env python3
"""Composite real app screenshots inside a real iPhone frame onto backgrounds."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Output dimensions (iPhone 6.5" App Store spec)
OUT_W, OUT_H = 1284, 2778

# iPhone frame overlay (extracted from AI-generated mockup)
# Original overlay: 1004x1999, screen at (30,30)-(973,1968), screen size 943x1938

# Target phone size in the composite (scale to fit nicely)
PHONE_SCALE = 0.82  # scale overlay to this fraction of output width
OVERLAY_ORIG_W, OVERLAY_ORIG_H = 1004, 1999
PHONE_W = int(OUT_W * PHONE_SCALE)
PHONE_H = int(PHONE_W * OVERLAY_ORIG_H / OVERLAY_ORIG_W)

# Screen position within the scaled overlay
SCREEN_LEFT_FRAC = 30 / 1004
SCREEN_TOP_FRAC = 30 / 1999
SCREEN_RIGHT_FRAC = 973 / 1004
SCREEN_BOTTOM_FRAC = 1968 / 1999

# Colors
TEXT_COLOR = (255, 255, 255)
SUBTEXT_COLOR = (224, 216, 176)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")
FRAMES_DIR = os.path.join(BASE_DIR, "frames")
OVERLAY_PATH = os.path.join(BASE_DIR, "iphone_frame_overlay.png")

# Cache the overlay
_overlay_cache = None


def get_overlay():
    """Load and cache the iPhone frame overlay."""
    global _overlay_cache
    if _overlay_cache is None:
        _overlay_cache = Image.open(OVERLAY_PATH).convert("RGBA")
    return _overlay_cache.copy()


# ── Fonts ──

def get_headline_font(size):
    """Heavy weight font for headlines."""
    for path in [
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def get_subtitle_font(size):
    """Lighter font for subtitles."""
    for path in [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFCompact.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


# ── Content centering ──

def center_screenshot_content(screenshot):
    """Shift screenshot content to be vertically centered."""
    arr = np.array(screenshot.convert("RGB"))
    row_brightness = arr.max(axis=(1, 2))
    content_rows = np.where(row_brightness > 20)[0]

    if len(content_rows) == 0:
        return screenshot

    content_top = content_rows[0]
    content_bottom = content_rows[-1]
    content_center = (content_top + content_bottom) // 2
    image_center = arr.shape[0] // 2
    shift = image_center - content_center

    if abs(shift) < 10:
        return screenshot

    orig_w, orig_h = screenshot.size
    centered = Image.new("RGBA", (orig_w, orig_h), (0, 0, 0, 255))
    if shift > 0:
        centered.paste(screenshot, (0, shift))
    else:
        cropped = screenshot.crop((0, -shift, orig_w, orig_h))
        centered.paste(cropped, (0, 0))
    return centered


# ── Text drawing ──

def draw_text_with_shadow(draw, text, xy, font, fill=TEXT_COLOR):
    """Draw text with multi-layer drop shadow."""
    x, y = xy
    draw.text((x + 4, y + 4), text, fill=(0, 0, 0, 160), font=font)
    draw.text((x + 2, y + 2), text, fill=(0, 0, 0, 200), font=font)
    draw.text((x, y), text, fill=fill, font=font)


def draw_centered_text(draw, text, y, font, fill=TEXT_COLOR, canvas_w=OUT_W, shadow=True):
    """Draw horizontally centered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (canvas_w - tw) // 2
    if shadow:
        draw_text_with_shadow(draw, text, (x, y), font, fill)
    else:
        draw.text((x, y), text, fill=fill, font=font)
    return bbox[3] - bbox[1]


# ── Main composite ──

def composite_frame(bg_path, screenshot_path, lines, output_path, phone_y_offset=0,
                    out_w=None, out_h=None, phone_scale=None):
    """
    Create a marketing frame:
    - Background image (darkened + blurred)
    - Real iPhone frame overlay with centered screenshot
    - Bold text overlay

    out_w/out_h: override output dimensions (for iPad etc.)
    phone_scale: override phone scale fraction (default 0.82 for iPhone, ~0.45 for iPad)
    """
    ow = out_w or OUT_W
    oh = out_h or OUT_H
    ps = phone_scale or PHONE_SCALE

    # Compute phone size for this output
    pw = int(ow * ps)
    ph = int(pw * OVERLAY_ORIG_H / OVERLAY_ORIG_W)

    # Load and resize background
    bg = Image.open(bg_path).convert("RGBA")
    bg = bg.resize((ow, oh), Image.LANCZOS)

    # Darken background
    dark = Image.new("RGBA", (ow, oh), (0, 0, 0, 110))
    bg = Image.alpha_composite(bg, dark)

    # Blur background
    bg_rgb = bg.convert("RGB").filter(ImageFilter.GaussianBlur(radius=20))
    canvas = bg_rgb.convert("RGBA")

    # Phone position: centered, with vertical offset scaled to output height
    phone_x = (ow - pw) // 2
    y_scale = oh / OUT_H
    phone_y = int((500 + phone_y_offset) * y_scale)

    # Scale the overlay to target size
    overlay = get_overlay().resize((pw, ph), Image.LANCZOS)

    # Calculate screen position within the scaled overlay
    screen_x = phone_x + int(pw * SCREEN_LEFT_FRAC)
    screen_y = phone_y + int(ph * SCREEN_TOP_FRAC)
    screen_w = int(pw * (SCREEN_RIGHT_FRAC - SCREEN_LEFT_FRAC))
    screen_h = int(ph * (SCREEN_BOTTOM_FRAC - SCREEN_TOP_FRAC))

    # Create rounded screen mask
    screen_radius = int(22 * pw / OVERLAY_ORIG_W)
    mask = Image.new("L", (screen_w, screen_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_radius, fill=255)

    # Load, center, and resize screenshot
    screenshot = Image.open(screenshot_path).convert("RGBA")
    screenshot = center_screenshot_content(screenshot)
    screenshot = screenshot.resize((screen_w, screen_h), Image.LANCZOS)

    # Drop shadow behind the phone
    shadow = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [phone_x + 6, phone_y + 10, phone_x + pw + 6, phone_y + ph + 10],
        radius=int(62 * pw / OVERLAY_ORIG_W), fill=(0, 0, 0, 150)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))
    canvas = Image.alpha_composite(canvas, shadow)

    # Paste screenshot into screen area
    canvas.paste(screenshot, (screen_x, screen_y), mask)

    # Overlay the real iPhone frame on top
    frame_layer = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    frame_layer.paste(overlay, (phone_x, phone_y), overlay)
    canvas = Image.alpha_composite(canvas, frame_layer)

    # Text overlay — scale font sizes proportionally
    text_layer = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    font_scale = ow / OUT_W

    current_y = int(80 * y_scale)
    for text, size, color, is_headline in lines:
        scaled_size = int(size * font_scale)
        font = get_headline_font(scaled_size) if is_headline else get_subtitle_font(scaled_size)
        h = draw_centered_text(text_draw, text, current_y, font, fill=color, canvas_w=ow)
        current_y += h + int(16 * font_scale)

    canvas = Image.alpha_composite(canvas, text_layer)

    # Save
    canvas.convert("RGB").save(output_path, quality=95)
    print(f"  Saved: {output_path}")


def main():
    os.makedirs(FRAMES_DIR, exist_ok=True)

    # lines: (text, font_size, color, is_headline)
    frames = [
        ("bg01_airport.png", "noseconds.png",
         [("TOCK", 160, TEXT_COLOR, True),
          ("A split-flap clock", 64, SUBTEXT_COLOR, False),
          ("that slaps.", 64, SUBTEXT_COLOR, False)],
         "frame01_intro.png", 80),

        ("bg02_cityscape.png", "noseconds.png",
         [("YOUR AIRPORT", 96, TEXT_COLOR, True),
          ("HAS A CLOCK.", 96, TEXT_COLOR, True),
          ("So should your phone.", 56, SUBTEXT_COLOR, False)],
         "frame02_main_clock.png", 60),

        ("bg03_gorilla.png", "noseconds.png",
         [("MECHANICALLY", 96, TEXT_COLOR, True),
          ("SATISFYING.", 96, TEXT_COLOR, True),
          ("Digitally obsessive.", 56, SUBTEXT_COLOR, False)],
         "frame03_flip.png", 60),

        ("bg04_worldmap.png", "noseconds.png",
         [("FIVE TIME", 96, TEXT_COLOR, True),
          ("ZONES.", 96, TEXT_COLOR, True),
          ("Zero excuses for", 56, SUBTEXT_COLOR, False),
          ("missing that call.", 56, SUBTEXT_COLOR, False)],
         "frame04_world_clocks.png", 60),

        ("bg05_weather.png", "noseconds.png",
         [("WEATHER", 110, TEXT_COLOR, True),
          ("INCLUDED.", 110, TEXT_COLOR, True),
          ("You're welcome.", 56, SUBTEXT_COLOR, False)],
         "frame05_weather.png", 60),

        ("bg06_workshop.png", "settings.png",
         [("YOUR CLOCK,", 96, TEXT_COLOR, True),
          ("YOUR RULES.", 96, TEXT_COLOR, True),
          ("Add any city. We won't judge.", 48, SUBTEXT_COLOR, False)],
         "frame06_settings.png", 60),

        ("bg07_space.png", "withseconds.png",
         [("SECONDS?", 110, TEXT_COLOR, True),
          ("OBVIOUSLY.", 110, TEXT_COLOR, True),
          ("For the obsessively punctual.", 52, SUBTEXT_COLOR, False)],
         "frame07_seconds.png", 60),

        ("bg08_lounge.png", "noseconds.png",
         [("FREE. NO ADS.", 92, TEXT_COLOR, True),
          ("NO TRACKING.", 92, TEXT_COLOR, True),
          ("Just vibes.", 56, SUBTEXT_COLOR, False)],
         "frame08_free.png", 60),

        ("bg09_sunset.png", "noseconds.png",
         [("YOUR CLOCK", 96, TEXT_COLOR, True),
          ("IS BORING.", 96, TEXT_COLOR, True),
          ("You're not. Fix it.", 64, SUBTEXT_COLOR, False)],
         "frame09_outro.png", 60),
    ]

    for bg_file, capture, lines, output, y_offset in frames:
        bg_path = os.path.join(BG_DIR, bg_file)
        capture_path = os.path.join(CAPTURES_DIR, capture)
        output_path = os.path.join(FRAMES_DIR, output)

        if not os.path.exists(bg_path):
            print(f"  SKIP (no bg): {bg_file}")
            continue
        if not os.path.exists(capture_path):
            print(f"  SKIP (no capture): {capture}")
            continue

        print(f"Compositing {output}...")
        composite_frame(bg_path, capture_path, lines, output_path, y_offset)

    print("\nDone! All frames composited.")


if __name__ == "__main__":
    main()
