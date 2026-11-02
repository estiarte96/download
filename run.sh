#!/usr/bin/env bash

# Anar al directori del projecte
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Assegurar les rutes al PATH
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Comprovar o crear entorn virtual amb Python 3.12 mitjançant uv
if [ ! -d ".venv" ]; then
    echo "⚙️ Configurant l'entorn virtual amb Python 3.12..."
    if command -v uv >/dev/null 2>&1; then
        uv venv --python 3.12 .venv
        uv pip install --python .venv/bin/python yt-dlp fastapi "uvicorn[standard]"
    else
        python3 -m venv .venv
        ./.venv/bin/pip install --upgrade pip
        ./.venv/bin/pip install -r requirements.txt
    fi
fi

echo "🚀 Iniciant el Descarregador Web..."
echo "🌐 Obrint http://localhost:8000 al navegador..."

# Obrir el navegador automàticament a macOS
(sleep 1.5 && open "http://localhost:8000") &

# Executar el servidor uvicorn
exec ./.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000
