#!/bin/bash
# Assemble the final film: 8 narration takes over 8 screen-capture segments.
#
#   ./assemble.sh            build pf-precheck.mp4
#   ./assemble.sh --check    report what is present and what is missing
#
# Each segment's video is padded or trimmed to match its narration take, so audio
# and picture stay locked without hand-syncing. Narration is loudness-normalised
# to broadcast level and a short tail of silence is added so the last word does
# not clip against the end of the file.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
VO="$DIR/vo"
SEG="$DIR/segments"
WORK="$DIR/.work"
OUT="$DIR/pf-precheck.mp4"
TAKES=(1 2 3 4 5 6 7 8)

dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }

if [ "${1:-}" = "--check" ]; then
  total=0; missing=0
  printf "  %-6s %-12s %-12s\n" "take" "narration" "screen"
  for n in "${TAKES[@]}"; do
    a="$VO/take$n.wav"; v="$SEG/seg$n.mp4"
    if [ -f "$a" ]; then ad=$(printf "%.1fs" "$(dur "$a")"); total=$(echo "$total + $(dur "$a")" | bc); else ad="MISSING"; missing=1; fi
    if [ -f "$v" ]; then vd=$(printf "%.1fs" "$(dur "$v")"); else vd="MISSING"; missing=1; fi
    printf "  %-6s %-12s %-12s\n" "$n" "$ad" "$vd"
  done
  printf "\n  narration total: %.1fs  (cap 120s)\n" "$total"
  [ "$missing" = 1 ] && echo "  -> something is missing, cannot assemble yet" || echo "  -> ready to assemble"
  exit 0
fi

rm -rf "$WORK"; mkdir -p "$WORK"
parts=()

for n in "${TAKES[@]}"; do
  a="$VO/take$n.wav"; v="$SEG/seg$n.mp4"
  [ -f "$a" ] || { echo "missing narration: take$n.wav"; exit 1; }
  [ -f "$v" ] || { echo "missing screen capture: seg$n.mp4"; exit 1; }

  ad=$(dur "$a")
  # 0.35s of air after each line so segments do not run into each other
  seglen=$(echo "$ad + 0.35" | bc)

  # Video: trim or freeze-extend to exactly seglen.
  ffmpeg -hide_banner -loglevel error -y -i "$v" \
    -vf "tpad=stop_mode=clone:stop_duration=20,scale=1920:-2,format=yuv420p" \
    -t "$seglen" -an -c:v libx264 -preset veryfast -crf 20 -r 30 \
    "$WORK/v$n.mp4"

  # Audio: normalise, pad to the same length.
  ffmpeg -hide_banner -loglevel error -y -i "$a" \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11,apad" -t "$seglen" \
    -ar 48000 -ac 2 -c:a aac -b:a 192k "$WORK/a$n.m4a"

  ffmpeg -hide_banner -loglevel error -y -i "$WORK/v$n.mp4" -i "$WORK/a$n.m4a" \
    -c:v copy -c:a copy -shortest "$WORK/part$n.mp4"

  parts+=("$WORK/part$n.mp4")
  printf "  part %s built  (%.1fs)\n" "$n" "$seglen"
done

: > "$WORK/list.txt"
for p in "${parts[@]}"; do echo "file '$p'" >> "$WORK/list.txt"; done

ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$WORK/list.txt" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart "$OUT"

echo
printf "  FINAL: %s  (%.1fs)\n" "$(basename "$OUT")" "$(dur "$OUT")"
awk -v d="$(dur "$OUT")" 'BEGIN{ if (d>120) print "  WARNING: over the 2 minute cap, trim a segment."; else printf "  under the 120s cap with %.1fs to spare.\n", 120-d }'
