let ws = null;

const inputUrl = document.getElementById("video-url");
const btnPaste = document.getElementById("btn-paste");
const btnDownload = document.getElementById("btn-download");
const playlistToggle = document.getElementById("playlist-toggle");

const statusCard = document.getElementById("status-card");
const statusBadge = document.getElementById("status-badge");
const playlistProgress = document.getElementById("playlist-progress");
const statusTitle = document.getElementById("status-title");
const progressBarFill = document.getElementById("progress-bar-fill");
const progressPercent = document.getElementById("progress-percent");
const downloadSpeed = document.getElementById("download-speed");
const downloadEta = document.getElementById("download-eta");
const destinationInfo = document.getElementById("destination-info");
const destinationText = document.getElementById("destination-text");

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    console.log("WebSocket connectat");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  };

  ws.onclose = () => {
    console.log("WebSocket desconnectat, reconnectant en 2 segons...");
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = (err) => {
    console.error("Error WebSocket:", err);
  };
}

function handleServerMessage(data) {
  statusCard.style.display = "flex";

  if (data.type === "start") {
    statusBadge.textContent = "Descarregant";
    statusBadge.className = "status-badge downloading";
    statusTitle.textContent = data.title || "Començant descàrrega...";
    destinationText.textContent = `Destí: ~/${data.destination}`;
    progressBarFill.style.width = "0%";
    progressPercent.textContent = "0%";
    downloadSpeed.textContent = "";
    downloadEta.textContent = "";
    playlistProgress.textContent = data.is_playlist ? "📋 Llista de reproducció" : "";
  } else if (data.type === "progress") {
    if (data.status === "downloading") {
      statusBadge.textContent = "Descarregant";
      statusBadge.className = "status-badge downloading";

      if (data.title) statusTitle.textContent = data.title;

      const pct = data.percent || 0;
      progressBarFill.style.width = `${pct}%`;
      progressPercent.textContent = `${pct}%`;

      if (data.speed) downloadSpeed.textContent = `⚡ ${data.speed}`;
      if (data.eta) downloadEta.textContent = `⏱️ Restant: ${data.eta}`;

      if (data.playlist_index && data.playlist_count) {
        playlistProgress.textContent = `Element ${data.playlist_index} de ${data.playlist_count}`;
      }
    } else if (data.status === "converting") {
      statusBadge.textContent = "Convertint";
      statusBadge.className = "status-badge downloading";
      progressBarFill.style.width = "100%";
      progressPercent.textContent = "100%";
      downloadSpeed.textContent = "⚙️ Processant àudio/vídeo...";
      downloadEta.textContent = "";
    }
  } else if (data.type === "completed") {
    statusBadge.textContent = "Completat";
    statusBadge.className = "status-badge completed";
    progressBarFill.style.width = "100%";
    progressPercent.textContent = "100%";
    downloadSpeed.textContent = "✨ Finalitzat";
    downloadEta.textContent = "";
    destinationText.textContent = `Desat a: ~/${data.destination}`;
    btnDownload.disabled = false;
    btnDownload.innerHTML = "<span>⬇️ Iniciar Descàrrega</span>";
  } else if (data.type === "error") {
    statusBadge.textContent = "Error";
    statusBadge.className = "status-badge error";
    statusTitle.textContent = data.message;
    progressBarFill.style.backgroundColor = "var(--danger)";
    btnDownload.disabled = false;
    btnDownload.innerHTML = "<span>⬇️ Iniciar Descàrrega</span>";
  }
}

// Botó Enganxar
btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputUrl.value = text.trim();
    }
  } catch (err) {
    inputUrl.focus();
  }
});

// Botó Descarregar
btnDownload.addEventListener("click", () => {
  const url = inputUrl.value.trim();
  if (!url) {
    alert("Si us plau, enganxa un enllaç primer.");
    return;
  }

  const selectedFormat = document.querySelector('input[name="format"]:checked').value;
  const isPlaylist = playlistToggle.checked;

  // Actualitzar interfície
  btnDownload.disabled = true;
  btnDownload.innerHTML = "<span>⏳ Preparant descàrrega...</span>";

  statusCard.style.display = "flex";
  statusBadge.textContent = "Analitzant";
  statusBadge.className = "status-badge downloading";
  statusTitle.textContent = "Obtenint dades de l'enllaç...";
  progressBarFill.style.width = "5%";
  progressBarFill.style.backgroundColor = "var(--primary)";
  progressPercent.textContent = "...";
  downloadSpeed.textContent = "";
  downloadEta.textContent = "";
  playlistProgress.textContent = "";

  ws.send(JSON.stringify({
    url: url,
    format: selectedFormat,
    is_playlist: isPlaylist
  }));
});

// Connectar WebSocket a l'inici
connectWebSocket();
