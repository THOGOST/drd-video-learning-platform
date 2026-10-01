#!/bin/bash
# مراقبة نشر Vercel: البحث عن علامة الكود الجديد في حزم JS للإنتاج
BASE="https://drd-video-learning-platform.vercel.app"
for i in $(seq 1 12); do
  sleep 30
  HTML=$(curl -s --max-time 30 "$BASE" 2>/dev/null)
  CHUNKS=$(echo "$HTML" | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | head -40)
  FOUND=""
  for C in $CHUNKS; do
    if curl -s --max-time 20 "$BASE$C" 2>/dev/null | grep -q "drive/v3/files"; then
      FOUND="$C"
      break
    fi
  done
  echo "[attempt $i] $(date +%H:%M:%S) chunks=$(echo "$CHUNKS" | wc -l) marker=${FOUND:-NOT_YET}"
  if [ -n "$FOUND" ]; then
    echo "DEPLOYED: marker found in $FOUND"
    exit 0
  fi
done
echo "TIMEOUT: marker not found after 6 minutes"
exit 1
