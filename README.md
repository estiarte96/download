# 📥 Descarregador Multimèdia Web (yt-dlp)

Una interfície web intuïtiva i moderna basada en **yt-dlp** per descarregar vídeos, música i llistes de reproducció completes.

---

## ✨ Característiques

* **Vídeo i Àudio**:
  * 🎬 **MP4** (Vídeo estàndard d'alta qualitat).
  * 🌐 **WEBM** (Format d'alta eficiència).
  * 🎵 **MP3** (Extracció d'àudio a 192 kbps).
* **Organització intel·ligent**:
  * Si descarregues un **sol arxiu**: es desa directament a `~/Downloads`.
  * Si descarregues una **llista de reproducció**: crea automàticament una carpeta amb el nom de la llista dins de `~/Downloads` i numera els fitxers.
* **Progrés en temps real**:
  * Barra de progrés amb percentatge.
  * Velocitat de descàrrega i temps restant (ETA).
  * Comptador d'elements en llistes de reproducció (Ex: *Element 3 de 15*).

---

## 🚀 Com executar-lo

Només cal executar l'script d'arrencada des del terminal:

```bash
./run.sh
```

Aquest script:
1. Activa l'entorn de Python.
2. Inicia el servidor local a `http://localhost:8000`.
3. Obre automàticament la pàgina al teu navegador.

---

## 🛠️ Requisits

* **Python 3.9+**
* **ffmpeg** (recomanat per a la conversió d'àudio a MP3 i fusió de fluxos d'alta qualitat).

---

## 📦 Instal·lació manual (opcional)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```
