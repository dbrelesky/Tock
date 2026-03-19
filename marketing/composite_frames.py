#!/usr/bin/env python3
"""Composite real app screenshots inside an iPhone frame onto fun backgrounds."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Output dimensions (iPhone 14 Pro Max video spec)
OUT_W, OUT_H = 1284, 2778

# iPhone frame dimensions (relative to output)
PHONE_W = 820       # phone body width
PHONE_H = 1680      # phone body height
PHONE_RADIUS = 70   # corner radius
BEZEL = 14          # bezel thickness
SCREEN_W = PHONE_W - 2 * BEZEL
SCREEN_H = PHONE_H - 2 * BEZEL
NOTCH_W = 200       # Dynamic Island width
NOTCH_H = 48        # Dynamic Island height
NOTCH_RADIUS = 24

# Colors
PHONE_COLOR = (28, 28, 30)       # near-black titanium
BEZEL_COLOR = (38, 38, 40)       # slightly lighter bezel
NOTCH_COLOR = (0, 0, 0)          # pure black Dynamic Island
TEXT_COLOR = (255, 255, 255)      # white text
TEXT_SHADOW = (0, 0, 0)
SUBTEXT_COLOR = (224, 216, 176)  # cream like the app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")
FRAMES_DIR = os.path.join(BASE_DIR, "frames")


def get_font(size, bold=True):
    """Get a font for text overlays."""
    weight = "Bold" if bold else "Regular"
    for name in [
        f"/System/Library/Fonts/SFCompact-{weight}.otf",
        f"/Library/Fonts/SF-Compact-Display-{weight}.otf",
        f"/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFMono-Bold.otf",
    ]:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_iphone_frame(draw, x, y):
    """Draw an iPhone frame at position (x, y) top-left corner."""
    # Phone body (dark titanium)
    draw.rounded_rectangle(
        [x, y, x + PHONE_W, y + PHONE_H],
        radius=PHONE_RADIUS, fill=PHONE_COLOR
    )
    # Inner bezel highlight
    draw.rounded_rectangle(
        [x + 2, y + 2, x + PHONE_W - 2, y + PHONE_H - 2],
        radius=PHONE_RADIUS - 2, outline=(55, 55, 58), width=1
    )
    # Screen cutout (will be filled by screenshot)
    draw.rounded_rectangle(
        [x + BEZEL, y + BEZEL, x + BEZEL + SCREEN_W, y + BEZEL + SCREEN_H],
        radius=PHONE_RADIUS - BEZEL, fill=(17, 17, 17)
    )
    # Dynamic Island
    island_x = x + (PHONE_W - NOTCH_W) // 2
    island_y = y + BEZEL + 20
    draw.rounded_rectangle(
        [island_x, island_y, island_x + NOTCH_W, island_y + NOTCH_H],
        radius=NOTCH_RADIUS, fill=NOTCH_COLOR
    )
    # Side button (right)
    draw.rounded_rectangle(
        [x + PHONE_W - 1, y + 280, x + PHONE_W + 5, y + 380],
        radius=2, fill=(45, 45, 48)
    )
    # Volume buttons (left)
    draw.rounded_rectangle(
        [x - 5, y + 250, x + 1, y + 310],
        radius=2, fill=(45, 45, 48)
    )
    draw.rounded_rectangle(
        [x - 5, y + 330, x + 1, y + 410],
        radius=2, fill=(45, 45, 48)
    )


def paste_screenshot(canvas, screenshot_path, phone_x, phone_y):
    """Paste a real app screenshot into the phone screen area."""
    screen_x = phone_x + BEZEL
    screen_y = phone_y + BEZEL

    screenshot = Image.open(screenshot_path).convert("RGBA")
    # Scale to fit screen area
    screenshot = screenshot.resize((SCREEN_W, SCREEN_H), Image.LANCZOS)

    # Create rounded mask for the screen
    mask = Image.new("L", (SCREEN_W, SCREEN_H), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [0, 0, SCREEN_W, SCREEN_H],
        radius=PHONE_RADIUS - BEZEL, fill=255
    )

    canvas.paste(screenshot, (screen_x, screen_y), mask)


def draw_text_with_shadow(draw, text, xy, font, fill=TEXT_COLOR, shadow_offset=3):
    """Draw text with a drop shadow for readability."""
    x, y = xy
    # Shadow
    draw.text((x + shadow_offset, y + shadow_offset), text, fill=(0, 0, 0, 180), font=font)
    draw.text((x - 1, y - 1), text, fill=(0, 0, 0, 100), font=font)
    # Main text
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
    return bbox[3] - bbox[1]  # return text height


def composite_frame(bg_path, screenshot_path, lines, output_path, phone_y_offset=0):
    """
    Create a complete frame:
    - Fun background image
    - iPhone frame with real screenshot
    - Text overlay

    lines: list of (text, font_size, color) tuples
    """
    # Load and resize background
    bg = Image.open(bg_path).convert("RGBA")
    bg = bg.resize((OUT_W, OUT_H), Image.LANCZOS)

    # Darken background slightly so phone pops
    dark_overlay = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 100))
    bg = Image.alpha_composite(bg, dark_overlay)

    # Apply slight blur to background so phone is the focus
    bg_rgb = bg.convert("RGB")
    bg_rgb = bg_rgb.filter(ImageFilter.GaussianBlur(radius=18))
    canvas = bg_rgb.convert("RGBA")

    # Phone position: centered horizontally, offset vertically
    phone_x = (OUT_W - PHONE_W) // 2
    phone_y = 520 + phone_y_offset  # leave room for text at top

    # Draw phone frame
    frame_layer = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame_layer)

    # Phone shadow
    shadow_layer = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rounded_rectangle(
        [phone_x + 8, phone_y + 12, phone_x + PHONE_W + 8, phone_y + PHONE_H + 12],
        radius=PHONE_RADIUS, fill=(0, 0, 0, 120)
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, shadow_layer)

    draw_iphone_frame(frame_draw, phone_x, phone_y)
    canvas = Image.alpha_composite(canvas, frame_layer)

    # Paste real screenshot
    paste_screenshot(canvas, screenshot_path, phone_x, phone_y)

    # Redraw Dynamic Island on top of screenshot
    top_layer = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    top_draw = ImageDraw.Draw(top_layer)
    island_x = phone_x + (PHONE_W - NOTCH_W) // 2
    island_y = phone_y + BEZEL + 20
    top_draw.rounded_rectangle(
        [island_x, island_y, island_x + NOTCH_W, island_y + NOTCH_H],
        radius=NOTCH_RADIUS, fill=NOTCH_COLOR
    )
    canvas = Image.alpha_composite(canvas, top_layer)

    # Text overlay
    text_layer = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)

    current_y = 80
    for text, size, color in lines:
        font = get_font(size)
        h = draw_centered_text(text_draw, text, current_y, font, fill=color)
        current_y += h + 20

    canvas = Image.alpha_composite(canvas, text_layer)

    # Save as RGB
    canvas.convert("RGB").save(output_path, quality=95)
    print(f"  Saved: {output_path}")


def main():
    os.makedirs(FRAMES_DIR, exist_ok=True)

    # Frame definitions: (bg_file, screenshot, text_lines, output, phone_y_offset)
    frames = [
        # Frame 1: Intro
        ("bg01_airport.png", "noseconds.png",
         [("TOCK", 160, TEXT_COLOR),
          ("A split-flap clock", 64, SUBTEXT_COLOR),
          ("that slaps.", 64, SUBTEXT_COLOR)],
         "frame01_intro.png", 80),

        # Frame 2: Main clock
        ("bg02_cityscape.png", "noseconds.png",
         [("YOUR AIRPORT", 96, TEXT_COLOR),
          ("HAS A CLOCK.", 96, TEXT_COLOR),
          ("So should your phone.", 56, SUBTEXT_COLOR)],
         "frame02_main_clock.png", 60),

        # Frame 3: Flip animation
        ("bg03_gorilla.png", "noseconds.png",
         [("MECHANICALLY", 96, TEXT_COLOR),
          ("SATISFYING.", 96, TEXT_COLOR),
          ("Digitally obsessive.", 56, SUBTEXT_COLOR)],
         "frame03_flip.png", 60),

        # Frame 4: World clocks
        ("bg04_worldmap.png", "noseconds.png",
         [("FIVE TIME", 96, TEXT_COLOR),
          ("ZONES.", 96, TEXT_COLOR),
          ("Zero excuses for", 56, SUBTEXT_COLOR),
          ("missing that call.", 56, SUBTEXT_COLOR)],
         "frame04_world_clocks.png", 60),

        # Frame 5: Weather
        ("bg05_weather.png", "noseconds.png",
         [("WEATHER", 110, TEXT_COLOR),
          ("INCLUDED.", 110, TEXT_COLOR),
          ("You're welcome.", 56, SUBTEXT_COLOR)],
         "frame05_weather.png", 60),

        # Frame 6: Settings
        ("bg06_workshop.png", "settings.png",
         [("YOUR CLOCK,", 96, TEXT_COLOR),
          ("YOUR RULES.", 96, TEXT_COLOR),
          ("Add any city. We won't judge.", 48, SUBTEXT_COLOR)],
         "frame06_settings.png", 60),

        # Frame 7: Seconds
        ("bg07_space.png", "withseconds.png",
         [("SECONDS?", 110, TEXT_COLOR),
          ("OBVIOUSLY.", 110, TEXT_COLOR),
          ("For the obsessively punctual.", 52, SUBTEXT_COLOR)],
         "frame07_seconds.png", 60),

        # Frame 8: Full view
        ("bg08_lounge.png", "noseconds.png",
         [("FREE. NO ADS.", 92, TEXT_COLOR),
          ("NO TRACKING.", 92, TEXT_COLOR),
          ("Just vibes.", 56, SUBTEXT_COLOR)],
         "frame08_free.png", 60),

        # Frame 9: CTA/Outro
        ("bg09_sunset.png", "noseconds.png",
         [("YOUR CLOCK", 96, TEXT_COLOR),
          ("IS BORING.", 96, TEXT_COLOR),
          ("You're not. Fix it.", 64, SUBTEXT_COLOR)],
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
