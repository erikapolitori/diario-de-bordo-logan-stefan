const ROOT_FOLDER_NAME = "Diario de Bordo Logan e Stefan";
const SPREADSHEET_NAME = "Registros - Diario de Bordo Logan e Stefan";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);

    if (payload.action === "uploadFile") {
      return jsonResponse(uploadFile(payload));
    }

    if (payload.action === "saveMemory") {
      return jsonResponse(saveMemory(payload));
    }

    throw new Error("Acao desconhecida.");
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error.message || "Erro inesperado.",
    });
  }
}

function uploadFile(payload) {
  const root = getOrCreateFolder(ROOT_FOLDER_NAME);
  const guestFolder = getOrCreateFolder(getGuestFolderName(payload), root);
  const bytes = Utilities.base64Decode(payload.base64);
  const blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
  const file = guestFolder.createFile(blob);

  file.setDescription(
    [
      "Diario de Bordo Logan e Stefan",
      "ID do tripulante: " + (payload.participantId || ""),
      "Convidado: " + (payload.guestName || ""),
      "Mensagem: " + (payload.message || ""),
      "Missoes: " + (payload.missions || []).join(", "),
    ].join("\n")
  );

  return {
    ok: true,
    file: {
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      folder: guestFolder.getName(),
      mimeType: payload.mimeType,
      size: payload.size,
    },
  };
}

function saveMemory(payload) {
  const sheet = getOrCreateSheet();
  const files = payload.files || [];

  sheet.appendRow([
    new Date(),
    payload.participantId || "",
    payload.guestName || "",
    payload.message || "",
    (payload.missions || []).join(" | "),
    (payload.missionIds || []).join(" | "),
    payload.completedCount || 0,
    payload.totalMissions || "",
    files.map((file) => file.name).join(" | "),
    files.map((file) => file.url).join(" | "),
    getGuestFolderName(payload),
  ]);

  return {
    ok: true,
  };
}

function getGuestFolderName(payload) {
  const name = safeName(payload.guestName || "Tripulante");
  const participantId = String(payload.participantId || "sem-id").slice(0, 8);
  return name + " - " + participantId;
}

function getOrCreateFolder(name, parent) {
  const container = parent || DriveApp;
  const folders = container.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
}

function getOrCreateSheet() {
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  let spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    const root = getOrCreateFolder(ROOT_FOLDER_NAME);
    const file = DriveApp.getFileById(spreadsheet.getId());
    root.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  const sheet = spreadsheet.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Data e horario",
      "ID do tripulante",
      "Nome",
      "Mensagem",
      "Missoes",
      "IDs das missoes",
      "Missoes completas",
      "Total de missoes",
      "Arquivos",
      "Links",
      "Pasta no Drive",
    ]);
  }

  return sheet;
}

function safeName(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Tripulante";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
