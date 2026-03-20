#!/usr/bin/env python3
"""Generate split-flap flutter animation frames for DOWNLOAD NOW end card."""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont

# --- Config ---
W, H = 1284, 2778
BG = (17, 17, 17)           # #111111
CARD_TOP = (42, 42, 42)     # #2a2a2a
CARD_BOT = (26, 26, 26)     # #1a1a1a
DIVIDER = (51, 51, 51)      # #333333
TEXT_COLOR = (224, 216, 176) # #e0d8b0
SUBTITLE_COLOR = (224, 216, 176, 180)

TARGET_TOP = "DOWNLOAD"
TARGET_BOT = "NOW"
CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&"

FPS = 30
DURATION = 4.0  # seconds
TOTAL_FRAMES = int(FPS * DURATION)

# Card dimensions
CARD_W = 72
CARD_H = 100
CARD_GAP = 10
CARD_RADIUS = 6
WORD_GAP = 30  # extra gap between words / rows

OUT_DIR = os.path.join(os.path.dirname(__file__), "frames", "flutter")
os.makedirs(OUT_DIR, exist_ok=True)


def ease_out_expo(t):
    """Exponential ease-out: fast start, slow settle."""
    return 1.0 if t >= 1.0 else 1.0 - math.pow(2, -10 * t)


def ease_out_bounce(t):
    """Slight bounce at the end for mechanical feel."""
    if t < 1 / 2.75:
        return 7.5625 * t * t
    elif t < 2 / 2.75:
        t -= 1.5 / 2.75
        return 7.5625 * t * t + 0.75
    elif t < 2.5 / 2.75:
        t -= 2.25 / 2.75
        return 7.5625 * t * t + 0.9375
    else:
        t -= 2.625 / 2.75
        return 7.5625 * t * t + 0.984375


def draw_rounded_rect(draw, xy, fill, radius):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def get_font(size):
    """Get a monospace font."""
    # Try system fonts
    for name in [
        "/System/Library/Fonts/SFMono-Bold.otf",
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Courier.dfont",
        "/Library/Fonts/SF-Mono-Bold.otf",
    ]:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_flap_card(draw, cx, cy, char, font, flipping=False, flip_progress=0):
    """Draw a single split-flap card at center (cx, cy)."""
    x0 = cx - CARD_W // 2
    y0 = cy - CARD_H // 2
    x1 = cx + CARD_W // 2
    y1 = cy + CARD_H // 2
    mid_y = cy

    # Top half
    draw_rounded_rect(draw, (x0, y0, x1, mid_y - 1), CARD_TOP, CARD_RADIUS)
    # Bottom half
    draw_rounded_rect(draw, (x0, mid_y + 1, x1, y1), CARD_BOT, CARD_RADIUS)
    # Divider line
    draw.line([(x0, mid_y), (x1, mid_y)], fill=DIVIDER, width=2)

    # Character - clip to card area
    if char and char.strip():
        bbox = font.getbbox(char)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = cx - tw // 2
        ty = cy - th // 2 - bbox[1]  # Adjust for font baseline

        # Slight vertical jitter during fast flipping
        if flipping and flip_progress < 0.8:
            jitter = random.randint(-2, 2)
            ty += jitter

        draw.text((tx, ty), char, fill=TEXT_COLOR, font=font)


def generate_frame(frame_num):
    """Generate a single animation frame."""
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    font = get_font(58)
    subtitle_font = get_font(28)
    small_font = get_font(22)

    t = frame_num / TOTAL_FRAMES  # 0.0 to 1.0

    # Layout: two rows centered
    # Row 1: D O W N L O A D (8 chars)
    # Row 2: N O W (3 chars)
    row1_chars = list(TARGET_TOP)  # 8 chars
    row2_chars = list(TARGET_BOT)  # 3 chars

    row1_total_w = len(row1_chars) * (CARD_W + CARD_GAP) - CARD_GAP
    row2_total_w = len(row2_chars) * (CARD_W + CARD_GAP) - CARD_GAP

    row1_y = H // 2 - 80
    row2_y = H // 2 + 60
    row1_x_start = (W - row1_total_w) // 2 + CARD_W // 2
    row2_x_start = (W - row2_total_w) // 2 + CARD_W // 2

    all_cards = []
    for i, ch in enumerate(row1_chars):
        cx = row1_x_start + i * (CARD_W + CARD_GAP)
        all_cards.append((cx, row1_y, ch, i))
    for i, ch in enumerate(row2_chars):
        cx = row2_x_start + i * (CARD_W + CARD_GAP)
        all_cards.append((cx, row2_y, ch, len(row1_chars) + i))

    # Each card has a slightly different settle time (imperfect)
    # Settle offsets: some cards lock in earlier, some later
    random.seed(42)  # Deterministic but imperfect
    settle_offsets = [random.uniform(-0.12, 0.18) for _ in range(len(all_cards))]
    # Make the last few cards settle latest for dramatic effect
    settle_offsets[-1] += 0.08
    settle_offsets[-2] += 0.05

    for cx, cy, target_char, idx in all_cards:
        # Each card's individual progress with offset
        card_t = t + settle_offsets[idx] * 0.5
        card_t = max(0, min(1, card_t))

        # Apply easing
        eased = ease_out_expo(card_t)

        # Determine flip speed: starts fast, slows down
        # When eased < 0.85, still flipping through random chars
        # When eased >= 0.85, settling toward target
        if eased < 0.7:
            # Hyper speed: change every frame
            random.seed(frame_num * 100 + idx * 7 + int(eased * 50))
            display_char = random.choice(CHARS)
            flipping = True
        elif eased < 0.85:
            # Slowing down: change every few frames
            speed = int(3 + (eased - 0.7) * 40)  # Increasing frame skip
            random.seed((frame_num // max(1, speed)) * 100 + idx * 7)
            display_char = random.choice(CHARS)
            flipping = True
        elif eased < 0.95:
            # Almost there: flicker between target and nearby chars
            random.seed(frame_num * 100 + idx * 7)
            if random.random() < (eased - 0.85) * 10:  # Increasing chance of target
                display_char = target_char
            else:
                nearby = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                ti = nearby.find(target_char)
                if ti >= 0:
                    offset = random.choice([-1, 1])
                    display_char = nearby[(ti + offset) % len(nearby)]
                else:
                    display_char = target_char
            flipping = True
        else:
            # Settled
            display_char = target_char
            flipping = False

        draw_flap_card(draw, cx, cy, display_char, font, flipping, eased)

    # Subtitle: fades in during last 30% of animation
    subtitle_alpha = max(0, min(1, (t - 0.7) / 0.3))
    if subtitle_alpha > 0:
        subtitle = 'Your clock is boring. You\'re not. Fix it.'
        bbox = subtitle_font.getbbox(subtitle)
        tw = bbox[2] - bbox[0]
        sx = (W - tw) // 2
        sy = row2_y + CARD_H // 2 + 60

        # Create text with alpha
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        alpha = int(subtitle_alpha * 180)
        overlay_draw.text((sx, sy), subtitle, fill=(*TEXT_COLOR, alpha), font=subtitle_font)
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    return img


if __name__ == "__main__":
    print(f"Generating {TOTAL_FRAMES} flutter frames at {FPS}fps ({DURATION}s)...")
    for i in range(TOTAL_FRAMES):
        img = generate_frame(i)
        path = os.path.join(OUT_DIR, f"flutter_{i:04d}.png")
        img.save(path)
        if (i + 1) % 30 == 0:
            print(f"  Frame {i + 1}/{TOTAL_FRAMES}")
    print(f"Done! {TOTAL_FRAMES} frames saved to {OUT_DIR}")
