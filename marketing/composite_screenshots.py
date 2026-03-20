#!/usr/bin/env python3
"""Composite real app screenshots for App Store listing (iPhone + iPad)."""
import os
from composite_frames import (
    composite_frame, TEXT_COLOR, SUBTEXT_COLOR, BASE_DIR
)

CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")

# App Store screenshot sizes
IPHONE_W, IPHONE_H = 1284, 2778   # iPhone 6.5"
IPAD_W, IPAD_H = 2048, 2732       # iPad Pro 12.9"

# lines: (text, font_size, color, is_headline)
SCREENSHOTS = [
    ("bg01_airport.png", "noseconds.png",
     [("YOUR AIRPORT", 96, TEXT_COLOR, True),
      ("HAS A CLOCK.", 96, TEXT_COLOR, True),
      ("So should your phone.", 56, SUBTEXT_COLOR, False)],
     "screen1_hero", 60),

    ("bg04_worldmap.png", "noseconds.png",
     [("FIVE TIME", 96, TEXT_COLOR, True),
      ("ZONES.", 96, TEXT_COLOR, True),
      ("Zero excuses for", 56, SUBTEXT_COLOR, False),
      ("missing that call.", 56, SUBTEXT_COLOR, False)],
     "screen2_world_clocks", 60),

    ("bg03_gorilla.png", "noseconds.png",
     [("MECHANICALLY", 96, TEXT_COLOR, True),
      ("SATISFYING.", 96, TEXT_COLOR, True),
      ("Digitally obsessive.", 56, SUBTEXT_COLOR, False)],
     "screen3_flip_detail", 60),

    ("bg06_workshop.png", "settings.png",
     [("YOUR CLOCK,", 96, TEXT_COLOR, True),
      ("YOUR RULES.", 96, TEXT_COLOR, True),
      ("Add any city. We won't judge.", 48, SUBTEXT_COLOR, False)],
     "screen4_settings", 60),

    ("bg05_weather.png", "noseconds.png",
     [("WEATHER", 110, TEXT_COLOR, True),
      ("INCLUDED.", 110, TEXT_COLOR, True),
      ("You're welcome.", 56, SUBTEXT_COLOR, False)],
     "screen5_weather", 60),

    ("bg07_space.png", "withseconds.png",
     [("SECONDS?", 110, TEXT_COLOR, True),
      ("OBVIOUSLY.", 110, TEXT_COLOR, True),
      ("For the obsessively punctual.", 52, SUBTEXT_COLOR, False)],
     "screen6_widgets", 60),
]


def main():
    for bg_file, capture, lines, base_name, y_offset in SCREENSHOTS:
        bg_path = os.path.join(BG_DIR, bg_file)
        capture_path = os.path.join(CAPTURES_DIR, capture)

        if not os.path.exists(bg_path) or not os.path.exists(capture_path):
            print(f"  SKIP: {base_name}")
            continue

        # iPhone 6.5"
        iphone_path = os.path.join(BASE_DIR, f"{base_name}.png")
        print(f"iPhone: {base_name}.png...")
        composite_frame(bg_path, capture_path, lines, iphone_path, y_offset,
                        out_w=IPHONE_W, out_h=IPHONE_H, phone_scale=0.82)

        # iPad Pro 12.9"
        ipad_path = os.path.join(BASE_DIR, f"ipad_{base_name}.png")
        print(f"iPad:   ipad_{base_name}.png...")
        composite_frame(bg_path, capture_path, lines, ipad_path, y_offset,
                        out_w=IPAD_W, out_h=IPAD_H, phone_scale=0.48)

    print("\nDone! All iPhone + iPad screenshots composited.")


if __name__ == "__main__":
    main()
