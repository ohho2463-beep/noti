#!/usr/bin/env bash
set -euo pipefail
# Example: build and run locally with Docker (set env before run).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker build -f deploy/Dockerfile -t noti:latest .
echo "Built noti:latest. Run example:"
echo "  docker run --rm -p 3000:3000 \\"
echo "    -e NEXT_PUBLIC_SUPABASE_URL=... \\"
echo "    -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \\"
echo "    -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \\"
echo "    noti:latest"
