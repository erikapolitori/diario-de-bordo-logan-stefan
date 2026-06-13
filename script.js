const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyVD_WThtsGPZQz-dptPakpYNCJxdkV7Np77luxXIrZqoBlGaCNLyfZmoRoHpP4EwPj/exec";
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const STORAGE_PREFIX = "diarioLoganStefan";

const missionButtons = document.querySelectorAll(".mission-grid button");
const missionNote = document.querySelector("#mission-note");
const memoryForm = document.querySelector(".memory-form");
const saveButton = document.querySelector("#save-button");
const successMessage = document.querySelector("#success-message");
const fileInput = document.querySelector("#file-input");
const previewBox = document.querySelector("#preview-box");
const fileList = document.querySelector("#file-list");
const uploadStatus = document.querySelector("#upload-status");
const suggestedMessage = document.querySelector("#suggested-message");
const photoButtons = document.querySelectorAll(".photo-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const missionCelebration = document.querySelector("#mission-celebration");
let celebrationTimer;

const googleScriptReady = GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");
const messageSuggestions = [
  "Capitão Logan e Imediato Stefan, que essa aventura seja sempre lembrada com muito amor.",
  "Que o mar da vida traga muitas aventuras lindas para vocês dois.",
  "Hoje a tripulação inteira celebrou a alegria de ver vocês crescendo.",
  "Logan, continue comandando sonhos. Stefan, continue encantando a tripulação.",
  "Que esse dia vire um tesouro guardado para sempre no coração da família.",
  "Foi uma honra embarcar nessa aventura com o Capitão Logan e o Imediato Stefan.",
  "Que a amizade, a coragem e a alegria acompanhem vocês por todos os mares.",
  "Essa festa foi uma ilha cheia de amor, risadas e memórias preciosas.",
  "Logan e Stefan, vocês são o verdadeiro tesouro dessa tripulação.",
  "Que nunca faltem aventuras, abraços apertados e gargalhadas pelo caminho.",
  "Hoje cada sorriso virou uma moeda de ouro no Baú de Memórias.",
  "Que o Capitão e seu Imediato naveguem sempre cercados de amor.",
  "A tripulação veio registrar: esse dia foi especial demais.",
  "Que vocês cresçam sabendo o quanto são amados por todos nós.",
  "Uma grande aventura merece grandes lembranças. Essa é uma delas.",
  "Que a infância de vocês seja cheia de mapas, sonhos e tesouros felizes.",
  "O melhor tesouro dessa festa foi ver a alegria de vocês.",
  "Que Logan e Stefan sigam navegando juntos por muitas histórias bonitas.",
  "Hoje o Diário de Bordo ganhou uma memória cheia de carinho.",
  "Que essa aventura seja só o começo de muitas comemorações incríveis.",
];
let lastSuggestionIndex = -1;

function getParticipantId() {
  const existingId = localStorage.getItem(`${STORAGE_PREFIX}:participantId`);

  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(`${STORAGE_PREFIX}:participantId`, newId);
  return newId;
}

const participantId = getParticipantId();

function getCompletedMissionIds() {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:missions`) || "[]");
  } catch {
    return [];
  }
}

function saveCompletedMissionIds(missionIds) {
  localStorage.setItem(`${STORAGE_PREFIX}:missions`, JSON.stringify([...new Set(missionIds)]));
}

function getSelectedMissions() {
  return [...missionButtons]
    .filter((button) => button.classList.contains("selected"))
    .map((button) => button.textContent.trim().replace(/^\d+\s*/, ""));
}

function getSelectedMissionIds() {
  return [...missionButtons]
    .filter((button) => button.classList.contains("selected"))
    .map((button) => button.dataset.mission);
}

function syncMissionButtons() {
  const completedMissionIds = getCompletedMissionIds();

  missionButtons.forEach((button) => {
    button.classList.toggle("selected", completedMissionIds.includes(button.dataset.mission));
  });

  updateMissionNote();
}

function updateMissionNote() {
  const selected = getSelectedMissions();
  const total = missionButtons.length;

  if (selected.length === 0) {
    missionNote.textContent = `0 de ${total} missões completas. Você pode fazer uma de cada vez.`;
    return;
  }

  missionNote.textContent = `${selected.length} de ${total} missões completas: ${selected.join(" | ")}`;
}

function showRandomSuggestion() {
  let nextIndex = Math.floor(Math.random() * messageSuggestions.length);

  if (messageSuggestions.length > 1) {
    while (nextIndex === lastSuggestionIndex) {
      nextIndex = Math.floor(Math.random() * messageSuggestions.length);
    }
  }

  lastSuggestionIndex = nextIndex;
  suggestedMessage.textContent = `"${messageSuggestions[nextIndex]}"`;
}

function showMissionCelebration() {
  clearTimeout(celebrationTimer);
  missionCelebration.hidden = false;

  celebrationTimer = setTimeout(() => {
    missionCelebration.hidden = true;
  }, 5200);
}

function setStatus(message, isError = false) {
  uploadStatus.hidden = false;
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle("error", isError);
}

function clearStatus() {
  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("error");
}

function formatFileSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Não consegui conferir a duração do vídeo ${file.name}.`));
    };
    video.src = url;
  });
}

async function validateFiles(files) {
  for (const file of files) {
    if (file.type.startsWith("image/") && file.size > MAX_PHOTO_SIZE) {
      throw new Error(`A foto "${file.name}" tem ${formatFileSize(file.size)}. O limite é 10 MB por foto.`);
    }

    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_SIZE) {
        throw new Error(`O vídeo "${file.name}" tem ${formatFileSize(file.size)}. Para o Google Drive funcionar bem, o limite é 25 MB por vídeo.`);
      }

      const duration = await getVideoDuration(file);

      if (duration > MAX_VIDEO_SECONDS) {
        throw new Error(`O vídeo "${file.name}" tem mais de 2 minutos.`);
      }
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      throw new Error(`O arquivo "${file.name}" não parece ser foto nem vídeo.`);
    }
  }
}

function renderSelectedFiles() {
  const files = [...fileInput.files];
  fileList.innerHTML = "";

  if (files.length === 0) {
    previewBox.hidden = true;
    return;
  }

  previewBox.hidden = false;

  files.forEach((file) => {
    const item = document.createElement("li");
    item.textContent = `${file.name} - ${formatFileSize(file.size)}`;
    fileList.appendChild(item);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error(`Não consegui ler o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function sendToGoogle(payload) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "O Google Drive não aceitou o envio.");
  }

  return result;
}

async function uploadFile(file, guestName, message, missions, missionIds, index) {
  const base64 = await fileToBase64(file);

  const result = await sendToGoogle({
    action: "uploadFile",
    participantId,
    guestName,
    message,
    missions,
    missionIds,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    index,
    base64,
  });

  return result.file;
}

async function saveMemory(event) {
  event.preventDefault();
  clearStatus();
  successMessage.hidden = true;

  if (!googleScriptReady) {
    setStatus("Falta configurar o link do Google Apps Script no arquivo script.js.", true);
    return;
  }

  const formData = new FormData(memoryForm);
  const guestName = formData.get("nome").trim();
  const message = formData.get("mensagem").trim();
  const files = [...fileInput.files];
  const missions = getSelectedMissions();
  const missionIds = getSelectedMissionIds();
  const previousCompletedCount = getCompletedMissionIds().length;

  if (!guestName) {
    setStatus("Escreva seu nome antes de guardar o tesouro.", true);
    return;
  }

  if (files.length === 0 && !message) {
    setStatus("Envie pelo menos uma foto, um vídeo ou uma mensagem.", true);
    return;
  }

  try {
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";

    setStatus("Conferindo os arquivos escolhidos...");
    await validateFiles(files);

    const uploadedFiles = [];

    for (const [index, file] of files.entries()) {
      setStatus(`Enviando ${index + 1} de ${files.length}: ${file.name}`);
      uploadedFiles.push(await uploadFile(file, guestName, message, missions, missionIds, index + 1));
    }

    setStatus("Salvando o registro na planilha...");

    await sendToGoogle({
      action: "saveMemory",
      participantId,
      guestName,
      message,
      missions,
      missionIds,
      completedCount: missionIds.length,
      totalMissions: missionButtons.length,
      files: uploadedFiles,
    });

    saveCompletedMissionIds(missionIds);
    memoryForm.reset();
    renderSelectedFiles();
    syncMissionButtons();
    showRandomSuggestion();
    clearStatus();
    successMessage.hidden = false;
    saveButton.textContent = "Tesouro guardado";

    if (previousCompletedCount < missionButtons.length && missionIds.length === missionButtons.length) {
      showMissionCelebration();
    }
  } catch (error) {
    setStatus(error.message || "Não consegui guardar esse tesouro agora.", true);
    saveButton.textContent = "Guardar tesouro";
  } finally {
    saveButton.disabled = false;
  }
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
}

missionButtons.forEach((button, index) => {
  button.dataset.mission = button.dataset.mission || `missao-${index + 1}`;

  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    updateMissionNote();
  });
});

fileInput.addEventListener("change", renderSelectedFiles);
memoryForm.addEventListener("submit", saveMemory);
syncMissionButtons();
showRandomSuggestion();

photoButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const image = button.querySelector("img");

    lightboxImage.src = button.dataset.full;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = button.dataset.caption;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  });
});

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lightbox.hidden) {
    closeLightbox();
  }
});
