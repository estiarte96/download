import os
import sys
import asyncio
import json
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import yt_dlp

# Assegurem que les rutes comunes de ffmpeg estan al PATH
HOME_DIR = Path.home()
LOCAL_BIN = HOME_DIR / ".local" / "bin"
OPT_HOMEBREW = Path("/opt/homebrew/bin")
USR_LOCAL_BIN = Path("/usr/local/bin")

current_path = os.environ.get("PATH", "")
extra_paths = [str(LOCAL_BIN), str(OPT_HOMEBREW), str(USR_LOCAL_BIN)]
os.environ["PATH"] = os.pathsep.join(extra_paths + [current_path])

app = FastAPI(title="Descarregador Web")

# Servir fitxers estàtics
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def get_index():
    return FileResponse(static_dir / "index.html")


def clean_filename(title: str) -> str:
    """Neteja el nom de carpeta/fitxer de caràcters no permesos."""
    return re.sub(r'[\\/*?:"<>|]', "", title).strip()


class DownloadManager:
    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.loop = asyncio.get_running_loop()

    def send_ws(self, data: dict):
        """Envia un missatge JSON al WebSocket de forma segura des de fils secundaris."""
        asyncio.run_coroutine_threadsafe(self.ws.send_json(data), self.loop)

    def progress_hook(self, d: dict):
        status = d.get("status")
        if status == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            percent = (downloaded / total * 100) if total > 0 else 0
            
            # Info extra
            speed_str = d.get("_speed_str", "").strip()
            eta_str = d.get("_eta_str", "").strip()
            filename = Path(d.get("filename", "")).name

            info_dict = d.get("info_dict", {})
            playlist_index = info_dict.get("playlist_index")
            playlist_count = info_dict.get("playlist_count") or info_dict.get("n_entries")
            title = info_dict.get("title") or filename

            self.send_ws({
                "type": "progress",
                "status": "downloading",
                "percent": round(percent, 1),
                "downloaded": downloaded,
                "total": total,
                "speed": speed_str,
                "eta": eta_str,
                "title": title,
                "playlist_index": playlist_index,
                "playlist_count": playlist_count
            })

        elif status == "finished":
            self.send_ws({
                "type": "progress",
                "status": "converting",
                "title": Path(d.get("filename", "")).name,
                "message": "Processant i convertint format..."
            })

    def run_download(self, url: str, format_choice: str, is_playlist_allowed: bool):
        downloads_base = HOME_DIR / "Downloads"
        downloads_base.mkdir(exist_ok=True)

        ydl_opts_info = {
            "extract_flat": "in_playlist" if not is_playlist_allowed else False,
            "quiet": True,
            "no_warnings": True,
        }

        # Comprovem primer si és una playlist
        with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
            except Exception as e:
                self.send_ws({"type": "error", "message": f"Error en analitzar l'enllaç: {str(e)}"})
                return

        is_playlist = False
        playlist_title = "Llista_de_reproduccio"

        if info:
            if "_type" in info and info["_type"] == "playlist":
                is_playlist = True
                playlist_title = clean_filename(info.get("title") or "Llista_de_reproduccio")
            elif "entries" in info and len(list(info.get("entries") or [])) > 1:
                is_playlist = True
                playlist_title = clean_filename(info.get("title") or "Llista_de_reproduccio")

        if not is_playlist_allowed:
            is_playlist = False

        # Configurem la carpeta de destí
        if is_playlist:
            target_folder = downloads_base / playlist_title
            target_folder.mkdir(exist_ok=True)
            out_template = str(target_folder / "%(playlist_index)02d - %(title)s.%(ext)s")
            destination_description = f"Downloads/{playlist_title}"
        else:
            target_folder = downloads_base
            out_template = str(target_folder / "%(title)s.%(ext)s")
            destination_description = "Downloads"

        self.send_ws({
            "type": "start",
            "is_playlist": is_playlist,
            "destination": destination_description,
            "destination_path": str(target_folder),
            "title": info.get("title") or "Descàrrega"
        })

        # Configuració del format
        ydl_opts = {
            "outtmpl": out_template,
            "progress_hooks": [self.progress_hook],
            "ignoreerrors": True,
            "no_color": True,
        }

        if format_choice == "mp3":
            ydl_opts.update({
                "format": "bestaudio/best",
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }],
            })
        elif format_choice == "webm":
            ydl_opts.update({
                "format": "bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best",
                "merge_output_format": "webm",
            })
        else:  # mp4 per defecte
            ydl_opts.update({
                "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "merge_output_format": "mp4",
            })

        if not is_playlist:
            ydl_opts["noplaylist"] = True

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            self.send_ws({
                "type": "completed",
                "message": "Descàrrega completada amb èxit!",
                "destination": destination_description,
                "destination_path": str(target_folder)
            })
        except Exception as e:
            self.send_ws({
                "type": "error",
                "message": f"Error durant la descàrrega: {str(e)}"
            })


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    manager = DownloadManager(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            url = req.get("url", "").strip()
            format_choice = req.get("format", "mp4")
            is_playlist = req.get("is_playlist", True)

            if not url:
                await websocket.send_json({"type": "error", "message": "Si us plau, enganxa un enllaç vàlid."})
                continue

            # Executem la descàrrega en un fil secundari per no bloquejar el bucle d'esdeveniments
            await asyncio.to_thread(manager.run_download, url, format_choice, is_playlist)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass

