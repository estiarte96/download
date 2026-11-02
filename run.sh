#!/usr/bin/env bash

# Anar al directori de l'script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Activar l'entorn virtual
if [ ! -d ".venv" ]; then
    echo "⚙️ Creant entorn virtual..."
    python3 -m venv .venv
    ./.venv/bin/pip install --upgrade pip
    ./.venv/bin/pip install -r requirements.txt
fi

echo "🚀 Iniciant el Descarregador Web..."
echo "🌐 Obrint http://localhost:8000 al navegador..."

# Obrir el navegador automàticament a macOS
sleep 1.5 && open "http://localhost:8000" &

# Executar el servidor uvicorn
exec ./.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000
