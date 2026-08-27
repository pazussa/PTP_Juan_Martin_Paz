#!/usr/bin/env bash
# Instalación en Linux o macOS: ./setup-linux-mac.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "✖ Node.js no está instalado. Instala Node.js 22 LTS desde https://nodejs.org/"
  echo "  (o con tu gestor de paquetes), abre una terminal nueva y repite este comando."
  echo
  exit 1
fi

node scripts/setup.js
