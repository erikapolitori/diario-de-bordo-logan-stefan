const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyVD_WThtsGPZQz-dptPakpYNCJxdkV7Np77luxXIrZqoBlGaCNLyfZmoRoHpP4EwPj/exec";

const missionButtons = document.querySelectorAll(".mission-grid button");
const missionNote = document.querySelector("#mission-note");
const memoryForm = document.querySelector(".memory-form");
const saveButton = document.querySelector("#save-button");
const successMessage = document.querySelector("#success-message");
const fileInput = document.querySelector("#file-input");
const previewBox = document.querySelector("#preview-box");
const fileList = document.querySelector("#file-list");
const uploadStatus = document.querySelector("#upload-status");
const photoButtons = document.querySelectorAll(".photo-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");

const googleScriptReady = GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");

function updateMissionNote() {
  const selected = getSelectedMissions();

  if (selected.length === 0) {
    missionNote.textContent = "Toque em uma ou mais missoes para marcar sua aventura.";
    return;
  }

  missionNote.textContent = `Missoes escolhidas: ${selected.join(" | ")}`;
}

function getSelectedMissions() {
  return [...missionButtons]
    .filter((button) => button.classList.contains("selected"))
    .map((button) => button.textContent.trim().replace(/^\d+\s*/, ""));
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
      reject(new Error(`Nao consegui conferir a duracao do video ${file.name}.`));
    };
    video.src = url;
  });
}

async function validateFiles(files) {
  for (const file of files) {
    if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
      throw new Error(`A foto "${file.name}" tem ${formatFileSize(file.size)}. O limite e 10 MB por foto.`);
    }

    if (file.type.startsWith("video/")) {
      const duration = await getVideoDuration(file);

      if (duration > 120) {
        throw new Error(`O video "${file.name}" tem mais de 2 minutos.`);
      }
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      throw new Error(`O arquivo "${file.name}" nao parece ser foto nem video.`);
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
    reader.onerror = () => reject(new Error(`Nao consegui ler o arquivo ${file.name}.`));
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
    throw new Error(result.error || "O Google Drive nao aceitou o envio.");
  }

  return result;
}

async function uploadFile(file, guestName, message, missions, index) {
  const base64 = await fileToBase64(file);

  const result = await sendToGoogle({
    action: "uploadFile",
    guestName,
    message,
    missions,
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

  if (!guestName) {
    setStatus("Escreva seu nome antes de guardar o tesouro.", true);
    return;
  }

  if (files.length === 0 && !message) {
    setStatus("Envie pelo menos uma foto, um video ou uma mensagem.", true);
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
      uploadedFiles.push(await uploadFile(file, guestName, message, missions, index + 1));
    }

    setStatus("Salvando o registro na planilha...");

    await sendToGoogle({
      action: "saveMemory",
      guestName,
      message,
      missions,
      files: uploadedFiles,
    });

    memoryForm.reset();
    renderSelectedFiles();
    clearStatus();
    successMessage.hidden = false;
    saveButton.textContent = "Tesouro guardado";
  } catch (error) {
    setStatus(error.message || "Nao consegui guardar esse tesouro agora.", true);
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

missionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    updateMissionNote();
  });
});

fileInput.addEventListener("change", renderSelectedFiles);
memoryForm.addEventListener("submit", saveMemory);

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
