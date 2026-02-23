#!/bin/bash
# Build Tock promo video: 10 frames with crossfade transitions + hip hop beat
# Each scene ~1.5s, crossfade ~0.3s, total ~15s

FRAMES_DIR="$(dirname "$0")/frames"
AUDIO="$(dirname "$0")/tock_beat.wav"
OUTPUT="$(dirname "$0")/tock_promo.mp4"

# Scene durations (seconds each frame is shown before transition starts)
# 10 scenes, ~1.5s each = 15s total
# With 0.3s crossfades overlapping, we need slightly longer per scene
D=1.8   # display duration per frame
XF=0.3  # crossfade duration

ffmpeg -y \
  -loop 1 -t $D -i "$FRAMES_DIR/frame01_intro.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame02_gorilla.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame03_rapid_flip.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame04_dj_cat.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame05_world_board.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame06_space_dog.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame07_macro.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame08_grandma.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame09_title.png" \
  -loop 1 -t $D -i "$FRAMES_DIR/frame10_endcard.png" \
  -i "$AUDIO" \
  -filter_complex "
    [0:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v0];
    [1:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v1];
    [2:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v2];
    [3:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v3];
    [4:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v4];
    [5:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v5];
    [6:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v6];
    [7:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v7];
    [8:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v8];
    [9:v]scale=1284:2778,setsar=1,fps=30,format=yuv420p[v9];
    [v0][v1]xfade=transition=slideleft:duration=$XF:offset=1.5[xf1];
    [xf1][v2]xfade=transition=fadeblack:duration=$XF:offset=3.0[xf2];
    [xf2][v3]xfade=transition=slideleft:duration=$XF:offset=4.5[xf3];
    [xf3][v4]xfade=transition=fadeblack:duration=$XF:offset=6.0[xf4];
    [xf4][v5]xfade=transition=slideleft:duration=$XF:offset=7.5[xf5];
    [xf5][v6]xfade=transition=fadeblack:duration=$XF:offset=9.0[xf6];
    [xf6][v7]xfade=transition=slideleft:duration=$XF:offset=10.5[xf7];
    [xf7][v8]xfade=transition=fadeblack:duration=$XF:offset=12.0[xf8];
    [xf8][v9]xfade=transition=fade:duration=$XF:offset=13.5[vout]
  " \
  -map "[vout]" -map 10:a \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -t 15 \
  -movflags +faststart \
  "$OUTPUT"

echo ""
echo "Video saved: $OUTPUT"
