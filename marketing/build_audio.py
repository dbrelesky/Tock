#!/usr/bin/env python3
"""Build a 15-second hip hop beat with split-flap click sounds for Tock promo video."""
import struct
import wave
import math
import random
import os

SAMPLE_RATE = 44100
DURATION = 15.0
BPM = 90
BEAT_SEC = 60.0 / BPM  # ~0.667s per beat
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)

def clamp(v):
    return max(-1.0, min(1.0, v))

def mix(samples_list):
    """Mix multiple sample arrays together."""
    length = max(len(s) for s in samples_list)
    out = [0.0] * length
    for s in samples_list:
        for i in range(len(s)):
            out[i] += s[i]
    return [clamp(x) for x in out]

def silence(duration_sec):
    return [0.0] * int(SAMPLE_RATE * duration_sec)

def sine(freq, duration_sec, volume=0.5, fade_out=True):
    n = int(SAMPLE_RATE * duration_sec)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = 1.0
        if fade_out:
            env = max(0, 1.0 - (i / n) ** 0.5)
        samples.append(volume * env * math.sin(2 * math.pi * freq * t))
    return samples

def noise_burst(duration_sec, volume=0.3, decay=True):
    """Short noise burst for hi-hats / snare texture."""
    n = int(SAMPLE_RATE * duration_sec)
    samples = []
    for i in range(n):
        env = 1.0
        if decay:
            env = max(0, 1.0 - (i / n))
        samples.append(volume * env * (random.random() * 2 - 1))
    return samples

def kick(volume=0.7):
    """808-style kick drum - pitch sweep from 150Hz to 40Hz."""
    dur = 0.25
    n = int(SAMPLE_RATE * dur)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        progress = i / n
        freq = 150 * (1 - progress) + 40 * progress
        env = max(0, 1.0 - progress ** 0.6)
        samples.append(volume * env * math.sin(2 * math.pi * freq * t))
    return samples

def snare(volume=0.5):
    """Snare with tonal body + noise."""
    dur = 0.15
    tone = sine(200, dur, volume * 0.6, fade_out=True)
    noise = noise_burst(dur, volume * 0.7, decay=True)
    return mix([tone, noise])

def hihat(volume=0.25, open_hat=False):
    dur = 0.08 if not open_hat else 0.2
    return noise_burst(dur, volume, decay=True)

def flap_click(volume=0.6):
    """Split-flap mechanical click sound."""
    dur = 0.06
    n = int(SAMPLE_RATE * dur)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        progress = i / n
        env = max(0, 1.0 - progress ** 0.3)
        # Sharp attack with multiple frequencies for metallic quality
        val = (
            0.4 * math.sin(2 * math.pi * 2500 * t) +
            0.3 * math.sin(2 * math.pi * 4000 * t) +
            0.2 * (random.random() * 2 - 1) +
            0.1 * math.sin(2 * math.pi * 800 * t)
        )
        samples.append(volume * env * val)
    return samples

def bass_note(freq, duration_sec, volume=0.4):
    """Sub bass with slight distortion."""
    n = int(SAMPLE_RATE * duration_sec)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        progress = i / n
        env = 1.0
        if progress > 0.7:
            env = max(0, 1.0 - (progress - 0.7) / 0.3)
        val = math.sin(2 * math.pi * freq * t)
        # Soft clip for warmth
        val = math.tanh(val * 1.5)
        samples.append(volume * env * val)
    return samples

def place_at(target, source, offset_samples):
    """Place source samples into target at given offset."""
    for i, s in enumerate(source):
        idx = offset_samples + i
        if 0 <= idx < len(target):
            target[idx] += s

def build_beat():
    """Build the full 15-second track."""
    track = [0.0] * TOTAL_SAMPLES

    total_beats = int(DURATION / BEAT_SEC)

    # === DRUM PATTERN ===
    for beat in range(total_beats):
        beat_pos = int(beat * BEAT_SEC * SAMPLE_RATE)

        # Kick on 1 and 3 (of each 4-beat bar)
        bar_beat = beat % 4
        if bar_beat == 0 or bar_beat == 2:
            place_at(track, kick(0.7), beat_pos)

        # Snare on 2 and 4
        if bar_beat == 1 or bar_beat == 3:
            place_at(track, snare(0.45), beat_pos)

        # Hi-hats on every 8th note
        for sub in range(2):
            hat_pos = beat_pos + int(sub * BEAT_SEC * SAMPLE_RATE / 2)
            is_open = (bar_beat == 1 and sub == 1)
            place_at(track, hihat(0.2, open_hat=is_open), hat_pos)

    # === BASS LINE ===
    bass_notes = [55, 55, 65.41, 73.42]  # A1, A1, C2, D2
    for beat in range(total_beats):
        beat_pos = int(beat * BEAT_SEC * SAMPLE_RATE)
        bar_beat = beat % 4
        if bar_beat == 0:
            note = bass_notes[(beat // 4) % len(bass_notes)]
            place_at(track, bass_note(note, BEAT_SEC * 1.8, 0.35), beat_pos)

    # === MELODY (simple dark piano-ish) ===
    melody_freqs = [
        (0, 440), (0.5, 0), (1, 523.25), (1.5, 0),
        (2, 392), (3, 349.23), (3.5, 330),
    ]
    for bar in range(int(total_beats / 4)):
        bar_start = bar * 4 * BEAT_SEC
        # Only play melody on even bars for groove
        if bar % 2 == 0:
            for offset_beats, freq in melody_freqs:
                if freq == 0:
                    continue
                pos = int((bar_start + offset_beats * BEAT_SEC) * SAMPLE_RATE)
                place_at(track, sine(freq, 0.2, 0.15, fade_out=True), pos)

    # === SPLIT-FLAP CLICKS (timed to scene changes) ===
    # Scene changes happen roughly every 1.5 seconds
    # Flap clicks: rapid cascade of 4-6 clicks
    click_times = [0.3, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5, 12.0, 13.5]
    for ct in click_times:
        # Cascade: 4-6 rapid clicks
        num_clicks = random.randint(4, 6)
        for c in range(num_clicks):
            click_offset = ct + c * 0.04  # 40ms apart
            pos = int(click_offset * SAMPLE_RATE)
            vol = 0.5 * (1.0 - c * 0.08)  # Decay slightly
            place_at(track, flap_click(vol), pos)

    # === AIRLINE CHIME at the very start ===
    chime_g = sine(784, 0.4, 0.25, fade_out=True)
    chime_c = sine(1047, 0.5, 0.25, fade_out=True)
    place_at(track, chime_g, 0)
    place_at(track, chime_c, int(0.3 * SAMPLE_RATE))

    # === FINAL IMPACT at end ===
    impact_pos = int(14.0 * SAMPLE_RATE)
    place_at(track, kick(0.9), impact_pos)
    # Big reverb tail
    for delay in range(5):
        d = int((14.05 + delay * 0.08) * SAMPLE_RATE)
        place_at(track, kick(0.4 * (1 - delay * 0.18)), d)

    # Normalize
    peak = max(abs(x) for x in track)
    if peak > 0:
        track = [x / peak * 0.85 for x in track]

    return track

def write_wav(filename, samples):
    """Write samples to WAV file."""
    with wave.open(filename, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        data = b''
        for s in samples:
            val = int(clamp(s) * 32767)
            data += struct.pack('<h', val)
        wav.writeframes(data)

if __name__ == '__main__':
    print("Building hip hop beat with split-flap clicks...")
    track = build_beat()
    out_path = os.path.join(os.path.dirname(__file__), 'tock_beat.wav')
    write_wav(out_path, track)
    print(f"Audio saved: {out_path}")
    print(f"Duration: {DURATION}s | BPM: {BPM} | Sample rate: {SAMPLE_RATE}")
