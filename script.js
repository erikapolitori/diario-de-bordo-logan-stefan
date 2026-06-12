const missionButtons = document.querySelectorAll(".mission-grid button");
const missionNote = document.querySelector("#mission-note");
const saveButton = document.querySelector("#save-button");
const successMessage = document.querySelector("#success-message");
const fileInput = document.querySelector("#file-input");
const previewBox = document.querySelector("#preview-box");
const fileName = document.querySelector("#file-name");
const photoButtons = document.querySelectorAll(".photo-button");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");

function updateMissionNote() {
  const selected = [...missionButtons]
    .filter((button) => button.classList.contains("selected"))
    .map((button) => button.textContent.trim().replace(/^\d+\s*/, ""));

  if (selected.length === 0) {
    missionNote.textContent = "Toque em uma ou mais missoes para marcar sua aventura.";
    return;
  }

  missionNote.textContent = `Missoes escolhidas: ${selected.join(" | ")}`;
}

missionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    updateMissionNote();
  });
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  if (!file) {
    previewBox.hidden = true;
    fileName.textContent = "";
    return;
  }

  previewBox.hidden = false;
  fileName.textContent = file.name;
});

saveButton.addEventListener("click", () => {
  successMessage.hidden = false;
  saveButton.textContent = "Tesouro guardado";
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
}

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
