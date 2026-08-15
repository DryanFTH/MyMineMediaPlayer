#!/usr/bin/env bash
set -euo pipefail

BINARIES_DIR="src-tauri/binaries"
TARGET_TRIPLE="x86_64-unknown-linux-gnu"
DEST="${BINARIES_DIR}/unrar-${TARGET_TRIPLE}"

UNRAR_VERSION="723"

if [ -f "$DEST" ]; then
  echo "unrar sidecar sudah ada di ${DEST}, skip download."
  echo "Hapus file itu manual kalau mau paksa re-download."
  exit 0
fi

echo "Menyiapkan unrar sidecar untuk Linux (versi ${UNRAR_VERSION})..."

mkdir -p "$BINARIES_DIR"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL -o "${TMP_DIR}/rar.tar.gz" \
  "https://www.rarlab.com/rar/rarlinux-x64-${UNRAR_VERSION}.tar.gz"

tar -xzf "${TMP_DIR}/rar.tar.gz" -C "$TMP_DIR"

cp "${TMP_DIR}/rar/unrar" "$DEST"
chmod +x "$DEST"

echo "Selesai. Sidecar tersedia di: ${DEST}"
