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
const btnOpenFolder = document.getElementById("btn-open-folder");
const connectionStatus = document.getElementById("connection-status");

let currentDestinationPath = "";

function updateConnectionIndicator(connected) {
  if (!connectionStatus) return;
  if (connected) {
    connectionStatus.textContent = "● Servidor connectat";
    connectionStatus.style.color = "#22c55e";
  } else {
    connectionStatus.textContent = "○ Connectant amb el servidor...";
    connectionStatus.style.color = "#eab308";
  }
}

btnOpenFolder.addEventListener("click", async () => {
  if (!currentDestinationPath) return;
  try {
    await fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentDestinationPath })
    });
  } catch (err) {
    console.error("Error en obrir carpeta:", err);
  }
});

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    console.log("WebSocket connectat");
    updateConnectionIndicator(true);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  };

  ws.onclose = () => {
    console.log("WebSocket desconnectat, reconnectant en 2 segons...");
    updateConnectionIndicator(false);
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = (err) => {
    console.error("Error WebSocket:", err);
    updateConnectionIndicator(false);
  };
}

function handleServerMessage(data) {
  statusCard.style.display = "flex";

  if (data.type === "start") {
    statusBadge.textContent = "Descarregant";
    statusBadge.className = "status-badge downloading";
    statusTitle.textContent = data.title || "Començant descàrrega...";
    destinationText.textContent = `Destí: ~/${data.destination}`;
    currentDestinationPath = data.destination_path || "";
    btnOpenFolder.style.display = "none";
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
    currentDestinationPath = data.destination_path || "";
    btnOpenFolder.style.display = "inline-block";
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

// Gestionar la tecla Enter a l'input
inputUrl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnDownload.click();
  }
});

// Botó Enganxar amb millor compatibilitat
btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputUrl.value = text.trim();
      inputUrl.focus();
    }
  } catch (err) {
    // Si el navegador bloqueja l'accés al porta-retalls automàtic
    inputUrl.focus();
    inputUrl.select();
  }
});

// Botó Descarregar
btnDownload.addEventListener("click", () => {
  const url = inputUrl.value.trim();
  if (!url) {
    alert("Si us plau, enganxa un enllaç primer.");
    inputUrl.focus();
    return;
  }

  const selectedFormat = document.querySelector('input[name="format"]:checked').value;
  const isPlaylist = playlistToggle.checked;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    statusCard.style.display = "flex";
    statusBadge.textContent = "Error";
    statusBadge.className = "status-badge error";
    statusTitle.textContent = "El servidor s'està connectant. Espera 2 segons i torna a provar-ho.";
    connectWebSocket();
    return;
  }

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

