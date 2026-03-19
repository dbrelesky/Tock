#!/usr/bin/env python3
"""Composite real app screenshots for App Store listing (same style as video frames)."""
import os
from composite_frames import (
    OUT_W, OUT_H, composite_frame, TEXT_COLOR, SUBTEXT_COLOR,
    BASE_DIR, FRAMES_DIR
)

CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")


def main():
    screenshots = [
        ("bg01_airport.png", "noseconds.png",
         [("YOUR AIRPORT", 96, TEXT_COLOR),
          ("HAS A CLOCK.", 96, TEXT_COLOR),
          ("So should your phone.", 56, SUBTEXT_COLOR)],
         "screen1_hero.png", 60),

        ("bg04_worldmap.png", "noseconds.png",
         [("FIVE TIME", 96, TEXT_COLOR),
          ("ZONES.", 96, TEXT_COLOR),
          ("Zero excuses for", 56, SUBTEXT_COLOR),
          ("missing that call.", 56, SUBTEXT_COLOR)],
         "screen2_world_clocks.png", 60),

        ("bg03_gorilla.png", "noseconds.png",
         [("MECHANICALLY", 96, TEXT_COLOR),
          ("SATISFYING.", 96, TEXT_COLOR),
          ("Digitally obsessive.", 56, SUBTEXT_COLOR)],
         "screen3_flip_detail.png", 60),

        ("bg06_workshop.png", "settings.png",
         [("YOUR CLOCK,", 96, TEXT_COLOR),
          ("YOUR RULES.", 96, TEXT_COLOR),
          ("Add any city. We won't judge.", 48, SUBTEXT_COLOR)],
         "screen4_settings.png", 60),

        ("bg05_weather.png", "noseconds.png",
         [("WEATHER", 110, TEXT_COLOR),
          ("INCLUDED.", 110, TEXT_COLOR),
          ("You're welcome.", 56, SUBTEXT_COLOR)],
         "screen5_weather.png", 60),

        ("bg07_space.png", "withseconds.png",
         [("SECONDS?", 110, TEXT_COLOR),
          ("OBVIOUSLY.", 110, TEXT_COLOR),
          ("For the obsessively punctual.", 52, SUBTEXT_COLOR)],
         "screen6_widgets.png", 60),
    ]

    for bg_file, capture, lines, output, y_offset in screenshots:
        bg_path = os.path.join(BG_DIR, bg_file)
        capture_path = os.path.join(CAPTURES_DIR, capture)
        output_path = os.path.join(BASE_DIR, output)

        if not os.path.exists(bg_path) or not os.path.exists(capture_path):
            print(f"  SKIP: {output}")
            continue

        print(f"Compositing {output}...")
        composite_frame(bg_path, capture_path, lines, output_path, y_offset)

    print("\nDone! All screenshots composited.")


if __name__ == "__main__":
    main()
