#!/bin/bash
# Build Tock promo video v2: 9 scene frames + animated flutter ending + hip hop beat
# Scenes 1-9: ~1.22s each = ~11s, then 4s flutter animation = 15s total

FRAMES_DIR="$(dirname "$0")/frames"
FLUTTER_DIR="$FRAMES_DIR/flutter"
AUDIO="$(dirname "$0")/tock_beat.wav"
OUTPUT="$(dirname "$0")/tock_promo.mp4"

D=1.5   # display duration per static frame
XF=0.25 # crossfade duration

# Step 1: Build the flutter sequence as a video clip
echo "Building flutter sequence..."
ffmpeg -y -framerate 30 -i "$FLUTTER_DIR/flutter_%04d.png" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -vf "scale=1284:2778,setsar=1" \
  /tmp/tock_flutter.mp4 2>/dev/null

# Step 2: Build full video with 9 static scenes + flutter ending
echo "Building final video..."
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
  -i /tmp/tock_flutter.mp4 \
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
    [v0][v1]xfade=transition=slideleft:duration=$XF:offset=1.25[xf1];
    [xf1][v2]xfade=transition=fadeblack:duration=$XF:offset=2.5[xf2];
    [xf2][v3]xfade=transition=slideleft:duration=$XF:offset=3.75[xf3];
    [xf3][v4]xfade=transition=fadeblack:duration=$XF:offset=5.0[xf4];
    [xf4][v5]xfade=transition=slideleft:duration=$XF:offset=6.25[xf5];
    [xf5][v6]xfade=transition=fadeblack:duration=$XF:offset=7.5[xf6];
    [xf6][v7]xfade=transition=slideleft:duration=$XF:offset=8.75[xf7];
    [xf7][v8]xfade=transition=fadeblack:duration=$XF:offset=10.0[xf8];
    [xf8][v9]xfade=transition=fadeblack:duration=$XF:offset=11.0[vout]
  " \
  -map "[vout]" -map 10:a \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -t 15 \
  -movflags +faststart \
  "$OUTPUT"

# Cleanup
rm -f /tmp/tock_flutter.mp4

echo ""
echo "Video saved: $OUTPUT"
