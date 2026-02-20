// ====== CONFIG – put your M3U/M3U8 URL here ======
const STORAGE_M3U = "iptv_m3u_content";

function importFromUsb() {
  const input = document.getElementById("fileInput");
  input.value = ""; // reset
  input.click();
}

document
  .getElementById("fileInput")
  .addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      localStorage.setItem(STORAGE_M3U, text);
      channels = parseM3U(text);
      selectedIndex = 0;
      renderChannelList();
      setStatus("Playlist importée depuis USB");
    };
    reader.readAsText(file);
  });


// ====== STATE ======
let channels = [];
let selectedIndex = 0;
let isPlaying = false;

const channelsListEl = document.getElementById("channels");
const playerEl = document.getElementById("player");
const statusEl = document.getElementById("status");

// ====== HELPERS ======
function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.opacity = msg ? "1" : "0";
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let pendingName = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTM3U")) {
      continue;
    }

    if (line.startsWith("#EXTINF:")) {
      const commaIndex = line.indexOf(",");
      let name = line;
      if (commaIndex !== -1 && commaIndex < line.length - 1) {
        name = line.substring(commaIndex + 1).trim();
      }
      pendingName = name || "Unnamed channel";
    } else if (!line.startsWith("#")) {
      // stream URL
      const url = line;
      if (pendingName) {
        result.push({
          name: pendingName,
          url
        });
        pendingName = null;
      } else {
        result.push({
          name: url,
          url
        });
      }
    }
  }

  return result;
}

function renderChannelList() {
  channelsListEl.innerHTML = "";
  channels.forEach((ch, idx) => {
    const li = document.createElement("li");
    li.dataset.index = String(idx);
    const span = document.createElement("span");
    span.className = "name";
    span.textContent = ch.name || `Channel ${idx + 1}`;
    li.appendChild(span);

    if (idx === selectedIndex) {
      li.classList.add("selected");
    }

    channelsListEl.appendChild(li);
  });
}

function updateSelection(newIndex) {
  if (!channels.length) return;
  if (newIndex < 0) newIndex = channels.length - 1;
  if (newIndex >= channels.length) newIndex = 0;
  selectedIndex = newIndex;
  renderChannelList();
}

function playSelected() {
  if (!channels.length) return;
  const ch = channels[selectedIndex];
  if (!ch) return;

  setStatus(`Playing: ${ch.name}`);
  isPlaying = true;

  try {
    playerEl.src = ch.url;
    const playPromise = playerEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(err => {
        console.error("Play error:", err);
        setStatus("Error starting playback");
      });
    }
  } catch (e) {
    console.error(e);
    setStatus("Error setting video source");
  }
}

function stopPlayback() {
  try {
    playerEl.pause();
    playerEl.src = "";
    isPlaying = false;
    setStatus("Stopped");
  } catch (e) {
    console.error(e);
  }
}

// ====== KEY HANDLING (remote arrows / OK / back) ======
function onKeyDown(e) {
  const key = e.key;

  if (key === "ArrowUp") {
    e.preventDefault();
    updateSelection(selectedIndex - 1);
  } else if (key === "ArrowDown") {
    e.preventDefault();
    updateSelection(selectedIndex + 1);
  } else if (key === "Enter") {
    e.preventDefault();
    playSelected();
  } else if (key === "Escape" || key === "Backspace") {
    // many TVs map "Back" to Escape or Backspace
    e.preventDefault();
    stopPlayback();
  } else if (key === "Enter" && !channels.length) {
    e.preventDefault();
    importFromUsb();
  }
  else if (key === "b" || key === "Blue") {
    e.preventDefault();
    importFromUsb();
  }
}

document.addEventListener("keydown", onKeyDown);

// Click support with the remote pointer / D-pad on list
channelsListEl.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const idx = Number(li.dataset.index || 0);
  selectedIndex = idx;
  renderChannelList();
  playSelected();
});

// ====== LOAD PLAYLIST ======
async function loadPlaylist() {
  const stored = localStorage.getItem(STORAGE_M3U);

  if (stored) {
    channels = parseM3U(stored);
    renderChannelList();
    setStatus("Playlist chargée (local)");
    return;
  }

  setStatus("Appuyez sur OK pour importer la playlist (USB)");
}


window.addEventListener("load", loadPlaylist);
