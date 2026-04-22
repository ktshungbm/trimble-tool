let API = null;
let excelRows = [];

const typeColors = {
  "Ban Hành": "#008001",
  "RFI": "#FFA500"
};

function log(msg) {
  document.getElementById("log").textContent += msg + "\n";
}

async function initAPI() {
  if (API) return API;

  API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {
    console.log("Trimble event:", event, data);
  });

  log("Đã kết nối Trimble API.");
  return API;
}

function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRows(rows) {
  return rows
    .map(r => ({
      guid: String(r.GUID || "").trim()
    }))
    .filter(r => r.guid);
}

async function getLoadedModelId() {
  const api = await initAPI();

  try {
    const viewerObjects = await api.viewer.getObjects();
    if (Array.isArray(viewerObjects) && viewerObjects.length) {
      const modelIds = [...new Set(viewerObjects.map(x => x.modelId).filter(Boolean))];
      if (modelIds.length) {
        return modelIds[0];
      }
    }

    if (
      viewerObjects &&
      Array.isArray(viewerObjects.modelObjectIds) &&
      viewerObjects.modelObjectIds.length
    ) {
      const modelIds = [...new Set(viewerObjects.modelObjectIds.map(x => x.modelId).filter(Boolean))];
      if (modelIds.length) {
        return modelIds[0];
      }
    }
  } catch (err) {
    log("getObjects fallback: " + (err?.message || String(err)));
  }

  const models = await api.viewer.getModels();

  if (!models || !models.length) {
    throw new Error("Không tìm thấy model đang load.");
  }

  return models[0].id;
}

async function colorAllWhite() {
  const api = await initAPI();
  try {
    const modelId = await getLoadedModelId();
    const viewerObjects = await api.viewer.getObjects();
    if (viewerObjects && viewerObjects.length) {
      log("Đang reset toàn bộ model qua màu #FFFFFF...");
      for (const obj of viewerObjects) {
        if (obj.modelId && obj.objectRuntimeIds && obj.objectRuntimeIds.length > 0) {
          await api.viewer.setObjectState(
            { modelObjectIds: [{ modelId: obj.modelId, objectRuntimeIds: obj.objectRuntimeIds }] },
            { color: "#FFFFFF" }
          );
        }
      }
      log("Đã đổi màu model sang #FFFFFF.");
    }
  } catch(err) {
    log("Không thể tự động đổi màu model (có thể chưa load): " + (err?.message || String(err)));
  }
}

// Khi nhấn vào Extension (load file), đổi màu
window.onload = async () => {
    try {
        await initAPI();
        await colorAllWhite();
    } catch (e) {
        console.error(e);
    }
};

async function colorByExcel() {
  const api = await initAPI();

  if (!excelRows.length) {
    log("Chưa có dữ liệu Excel.");
    return;
  }

  const modelId = await getLoadedModelId();
  const rows = normalizeRows(excelRows);
  const fileType = document.getElementById("fileType").value;
  const targetColor = typeColors[fileType] || "#008001";

  log("ModelId: " + modelId);
  log(`Bắt đầu xử lý cho file loại: ${fileType}`);

  const guids = rows.map(r => r.guid);
  
  let runtimeIds;
  try {
    runtimeIds = await api.viewer.convertToObjectRuntimeIds(modelId, guids);
  } catch (err) {
    log("Lỗi convert list GUID: " + (err?.message || JSON.stringify(err) || String(err)));
    throw err;
  }

  let matched = 0;
  let unmatched = 0;
  const validIds = [];

  for (let i = 0; i < rows.length; i++) {
    const runtimeId = runtimeIds[i];
    if (runtimeId === undefined || runtimeId === null) {
      unmatched++;
      continue;
    }
    validIds.push(runtimeId);
    matched++;
  }

  log("Match: " + matched);
  log("Không match: " + unmatched);

  if (validIds.length > 0) {
    await api.viewer.setObjectState(
      {
        modelObjectIds: [
          {
            modelId: modelId,
            objectRuntimeIds: validIds
          }
        ]
      },
      {
        color: targetColor
      }
    );
    log(`Đã tô ${validIds.length} object -> ${targetColor}`);

    // Auto save View
    try {
      const viewName = `Update ${fileType} - ${new Date().toLocaleString()}`;
      // Cố gắng save view thông qua API
      if (api.view && api.view.createView) {
        await api.view.createView({ name: viewName });
        log("Đã auto save View: " + viewName);
      } else if (api.views && api.views.createView) {
        await api.views.createView({ name: viewName });
        log("Đã auto save View: " + viewName);
      } else {
        log("API không hỗ trợ save view tự động.");
      }
    } catch(err) {
      log("Lỗi khi tự động save View: " + (err?.message || String(err)));
    }
  }

  log("Hoàn tất tô màu.");
}

document.getElementById("readBtn").addEventListener("click", async () => {
  try {
    const pass = prompt("Nhập Pass quyền admin để up file (Ban Hành/RFI):");
    if (!pass || pass !== "admin") {
      alert("Mật khẩu không đúng hoặc đã bị hủy!");
      return;
    }

    const file = document.getElementById("fileInput").files[0];
    if (!file) {
      log("Chưa chọn file Excel.");
      return;
    }

    document.getElementById("log").textContent = "";
    await initAPI();

    // Reset màu về trắng trước khi tô đè lên (tùy chọn)
    await colorAllWhite();

    excelRows = await readExcel(file);
    log(`Đọc xong ${excelRows.length} dòng.`);
    
    await colorByExcel();
  } catch (err) {
    console.error(err);
    log("Lỗi: " + (err?.message || JSON.stringify(err) || String(err)));
  }
});
