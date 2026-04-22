/**
 * Paint Approval Tool v9.0
 * ─────────────────────────────────────
 * 2 file Excel:
 *   File 1 (trình duyệt)  →  #00FF00
 *   File 2 (đã ban hành)  →  #ffbb00ff
 *   Còn lại               → #FFFFFF
 *
 * Dựa trên v7 đã chứng minh hoạt động.
 * Chiến lược: ẩn hết → hiện+màu → hiện lại phần còn lại
 * ─────────────────────────────────────
 */

var COLOR_GREEN = "#FFBB00";
var COLOR_BLUE = "#00FF00";
var RETRY_MAX = 7;
var RETRY_DELAY = 2000;
var BATCH_CVT = 500;
var BATCH_CLR = 300;
var PAINT_DELAY = 150;

var _api = null;
var _guidsGreen = [];  // file 1
var _guidsBlue = [];  // file 2

/* ═══ UI ═══ */
function log(m, t) { var e = document.getElementById("log"); if (!e) { console.log(m); return; } var s = document.createElement("span"); if (t) s.className = t; s.textContent = m + "\n"; e.appendChild(s); e.scrollTop = e.scrollHeight; console.log("[" + (t || "") + "] " + m); }
function clearLog() { var e = document.getElementById("log"); if (e) e.innerHTML = ""; }
function setStat(id, v) { var e = document.getElementById(id); if (e) e.textContent = (v != null) ? v : "—"; }
function setProgress(p) { var w = document.getElementById("progWrap"), b = document.getElementById("progBar"); if (!w || !b) return; if (p <= 0) { w.classList.remove("on"); b.style.width = "0%"; return; } w.classList.add("on"); b.style.width = Math.min(p, 100) + "%"; }
function lockUI(y) { ["applyBtn", "resetBtn", "saveBtn"].forEach(function (id) { var e = document.getElementById(id); if (e) e.disabled = y; }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function pad2(n) { return String(n).padStart(2, "0"); }
function fmtN(n) { return typeof n === "number" ? n.toLocaleString() : String(n); }
function checkApplyBtn() { document.getElementById("applyBtn").disabled = (!_guidsGreen.length && !_guidsBlue.length); }

/* ═══ UUID ↔ IFC GUID ═══ */
var B64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
function to64(n, d) { var r = []; for (var i = 0; i < d; i++) { r.push(B64.charAt(n % 64)); n = Math.floor(n / 64); } return r.reverse().join(""); }
function from64(s) { var r = 0; for (var i = 0; i < s.length; i++) { var x = B64.indexOf(s.charAt(i)); if (x < 0) return -1; r = r * 64 + x; } return r; }
function uuid2ifc(u) { if (!u) return null; var h = String(u).replace(/-/g, "").toLowerCase(); if (h.length !== 32 || !/^[0-9a-f]{32}$/.test(h)) return null; var n = [parseInt(h.substr(0, 2), 16)]; for (var i = 0; i < 5; i++)n.push(parseInt(h.substr(2 + i * 6, 6), 16)); var r = to64(n[0], 2); for (var i = 1; i < 6; i++)r += to64(n[i], 4); return r; }
function ifc2uuid(c) { if (!c || c.length !== 22) return null; var p = [from64(c.substr(0, 2))]; for (var i = 0; i < 5; i++)p.push(from64(c.substr(2 + i * 4, 4))); if (p.some(function (x) { return x < 0; })) return null; var h = p[0].toString(16).padStart(2, "0"); for (var i = 1; i < 6; i++)h += p[i].toString(16).padStart(6, "0"); return h.substr(0, 8) + "-" + h.substr(8, 4) + "-" + h.substr(12, 4) + "-" + h.substr(16, 4) + "-" + h.substr(20, 12); }
function detectFmt(g) { if (!g) return "x"; var s = String(g).trim(); if (s.length === 36 && /^[0-9a-f]{8}-/i.test(s)) return "uuid"; if (s.length === 32 && /^[0-9a-f]{32}$/i.test(s)) return "nd"; if (s.length === 22) return "ifc"; return "x"; }

/* ═══ API ═══ */
async function getAPI() { if (_api) return _api; _api = await TrimbleConnectWorkspace.connect(window.parent, function (e, d) { console.log("[T]", e, d); }); log("Đã kết nối Trimble API.", "ok"); return _api; }

/* ═══ Excel ═══ */
function readWB(f) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function (e) { try { ok(XLSX.read(e.target.result, { type: "array" })); } catch (err) { no(err); } }; r.onerror = no; r.readAsArrayBuffer(f); }); }

function extractGuids(wb, label) {
  if (!wb || !wb.SheetNames || !wb.SheetNames.length) throw new Error("Excel không có sheet.");
  var sn = wb.SheetNames[0];
  var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
  if (!rows.length) throw new Error("Sheet trống.");
  var keys = Object.keys(rows[0]);
  var gk = keys.find(function (k) { return k.trim().toUpperCase() === "GUID"; });
  if (!gk) { gk = keys[0]; log('  ⚠ Dùng cột đầu: "' + gk + '"', "warn"); }
  var seen = {}, out = [];
  rows.forEach(function (r) { var g = String(r[gk] || "").trim(); if (g && !seen[g]) { seen[g] = true; out.push(g); } });
  log('  [' + label + '] Sheet "' + sn + '": ' + out.length + ' GUID', "info");
  return out;
}

/* ═══ Model ═══ */
async function getModelIds() {
  var api = await getAPI();
  for (var a = 1; a <= RETRY_MAX; a++) {
    var raw;
    try { raw = await api.viewer.getObjects(); } catch (e) { if (a < RETRY_MAX) { await sleep(RETRY_DELAY); continue; } throw e; }
    if (!Array.isArray(raw) || !raw.length) { if (a < RETRY_MAX) { await sleep(RETRY_DELAY); continue; } throw new Error("Viewer trống."); }
    var total = 0, mids = [];
    raw.forEach(function (g) { if (!g || !g.modelId) return; if (mids.indexOf(g.modelId) === -1) mids.push(g.modelId); if (Array.isArray(g.objects)) total += g.objects.length; else if (Array.isArray(g.objectRuntimeIds)) total += g.objectRuntimeIds.length; else if (Array.isArray(g.ids)) total += g.ids.length; });
    if (!mids.length) { if (a < RETRY_MAX) { await sleep(RETRY_DELAY); continue; } throw new Error("Không thấy modelId."); }
    return { modelIds: mids, total: total };
  }
}

/* ═══ Convert GUIDs → runtimeIds ═══ */
function flat(v) { if (v == null) return []; if (typeof v === "number") return [v]; if (Array.isArray(v)) { var o = []; v.forEach(function (x) { if (typeof x === "number") o.push(x); else if (Array.isArray(x)) x.forEach(function (y) { if (typeof y === "number") o.push(y); }); }); return o; } return []; }

async function batchConvert(api, mid, guids) {
  var out = [];
  for (var i = 0; i < guids.length; i += BATCH_CVT) {
    var c = guids.slice(i, i + BATCH_CVT); var r;
    try { r = await api.viewer.convertToObjectRuntimeIds(mid, c); } catch (e) { for (var k = 0; k < c.length; k++)out.push(null); continue; }
    if (!Array.isArray(r)) { for (var k = 0; k < c.length; k++)out.push(null); continue; }
    out = out.concat(r);
  }
  return out;
}

/** Thử cả UUID và IFC format, trả về Map<modelId, number[]> */
async function convertAll(api, modelIds, guids, label) {
  var result = new Map();
  if (!guids.length) return result;

  var uuids = [], ifcs = [], others = [];
  guids.forEach(function (g) { var f = detectFmt(g); if (f === "uuid" || f === "nd") uuids.push(g); else if (f === "ifc") ifcs.push(g); else others.push(g); });
  var u2i = uuids.map(uuid2ifc).filter(Boolean);
  var i2u = ifcs.map(ifc2uuid).filter(Boolean);

  for (var mi = 0; mi < modelIds.length; mi++) {
    var mid = modelIds[mi]; var all = [];
    async function tryL(list, lbl) {
      if (!list.length) return;
      var conv = await batchConvert(api, mid, list); var hit = 0;
      for (var i = 0; i < list.length; i++) { var ids = flat(conv[i]); if (ids.length) { hit++; all = all.concat(ids); } }
      if (hit > 0) log("  [" + label + "/" + lbl + "] " + hit + " GUIDs matched", "ok");
    }
    await tryL(uuids, "UUID"); await tryL(ifcs, "IFC"); await tryL(u2i, "U→I"); await tryL(i2u, "I→U"); await tryL(others, "RAW");
    if (all.length) { var u = {}; all.forEach(function (id) { u[id] = 1; }); result.set(mid, Object.keys(u).map(Number)); }
  }
  return result;
}

/* ═══ Paint batch ═══ */
async function paintBatch(api, mid, ids, state) {
  for (var i = 0; i < ids.length; i += BATCH_CLR) {
    var chunk = ids.slice(i, i + BATCH_CLR);
    try { await api.viewer.setObjectState({ modelObjectIds: [{ modelId: mid, objectRuntimeIds: chunk }] }, state); } catch (e) { }
    if (i + BATCH_CLR < ids.length) await sleep(PAINT_DELAY);
  }
}

/* ═══════════════════════════════════════
   MAIN — v9
   Chiến lược:
   1. Reset
   2. Lấy modelIds và đối tượng
   3. Map GUIDs
   4. Đổi toàn bộ model sang TRẮNG (#FFFFFF)
   5. Tô XANH LÁ (trình duyệt)
   6. Tô CAM/VÀNG (đã ban hành)
═══════════════════════════════════════ */
async function applyColors() {
  lockUI(true); clearLog(); setProgress(5);
  try {
    if (!_guidsGreen.length && !_guidsBlue.length) throw new Error("Chưa có file nào.");
    var api = await getAPI();

    // 1. Reset
    log("Reset...", "info");
    try { await api.viewer.setObjectState(undefined, { color: "reset", visible: "reset" }); } catch (e) { }
    await sleep(500);
    setProgress(10);

    // 2. Get models
    var rawObjects;
    try { rawObjects = await api.viewer.getObjects(); } catch (e) { }
    var mi = await getModelIds();
    setStat("s-total", fmtN(mi.total));
    setProgress(18);

    // 3. Convert GUIDs
    log("Map GUIDs...", "info");
    var greenMap = await convertAll(api, mi.modelIds, _guidsGreen, "🟢");
    var blueMap = await convertAll(api, mi.modelIds, _guidsBlue, "🔵");

    var greenTotal = 0, blueTotal = 0;
    greenMap.forEach(function (ids) { greenTotal += ids.length; });
    blueMap.forEach(function (ids) { blueTotal += ids.length; });
    setStat("s-green", fmtN(greenTotal));
    setStat("s-blue", fmtN(blueTotal));

    if (greenTotal === 0 && blueTotal === 0) {
      log("✗ Không match object nào!", "err");
      setProgress(0); lockUI(false); checkApplyBtn(); return;
    }
    setProgress(35);

    // 4. Đổi màu toàn bộ model sang TRẮNG (#FFFFFF)
    log("Đổi màu toàn bộ model sang Trắng (#FFFFFF)...", "info");
    if (rawObjects && rawObjects.length) {
      for (var o = 0; o < rawObjects.length; o++) {
        var obj = rawObjects[o];
        var runtimeIds = obj.objectRuntimeIds || obj.ids || obj.objects;
        if (obj.modelId && runtimeIds && runtimeIds.length > 0) {
          await paintBatch(api, obj.modelId, runtimeIds, { visible: true, color: "#FFFFFF" });
        }
      }
    }
    await sleep(800);
    setProgress(42);

    // 5. Tô MÀU CAM (trình duyệt)
    if (greenTotal > 0) {
      log("━━━ Tô MÀU CAM (trình duyệt): " + fmtN(greenTotal) + " ━━━", "info");
      for (var i = 0; i < mi.modelIds.length; i++) {
        var mid = mi.modelIds[i];
        var ids = greenMap.get(mid);
        if (!ids || !ids.length) continue;
        await paintBatch(api, mid, ids, { visible: true, color: COLOR_GREEN });
        log("  ▪ " + fmtN(ids.length) + " objects trình duyệt (cam)", "ok");
      }
    }
    setProgress(58);
    await sleep(300);

    // 6. Tô XANH LÁ (đã ban hành)
    if (blueTotal > 0) {
      log("━━━ Tô XANH LÁ (đã ban hành): " + fmtN(blueTotal) + " ━━━", "info");
      for (var i = 0; i < mi.modelIds.length; i++) {
        var mid = mi.modelIds[i];
        var ids = blueMap.get(mid);
        if (!ids || !ids.length) continue;
        await paintBatch(api, mid, ids, { visible: true, color: COLOR_BLUE });
        log("  ▪ " + fmtN(ids.length) + " objects đã ban hành (xanh lá)", "ok");
      }
    }
    setProgress(100);
    await sleep(500);

    log("", "info");
    log("✓ HOÀN TẤT!", "ok");
    if (greenTotal) log("  🟠 Trình duyệt: " + fmtN(greenTotal) + " cấu kiện", "ok");
    if (blueTotal) log("  🟢 Đã ban hành: " + fmtN(blueTotal) + " cấu kiện", "ok");
    log("  ⚪ Còn lại: Trắng (#FFFFFF)", "info");
    setTimeout(function () { setProgress(0); }, 2000);

  } catch (err) {
    log("✗ " + (err && err.message ? err.message : String(err)), "err"); setProgress(0);
  } finally { lockUI(false); checkApplyBtn(); }
}

/* ═══ Reset ═══ */
async function resetViewer() {
  lockUI(true); clearLog(); setProgress(10);
  try {
    var api = await getAPI(); try { await api.viewer.setObjectState(undefined, { color: "reset", visible: "reset" }); } catch (e) { } await api.viewer.reset();
    setStat("s-total", "—"); setStat("s-green", "—"); setStat("s-blue", "—");
    setProgress(100); log("✓ Reset OK.", "ok"); setTimeout(function () { setProgress(0); }, 1000);
  }
  catch (e) { log("✗ " + (e && e.message ? e.message : String(e)), "err"); setProgress(0); }
  finally { lockUI(false); checkApplyBtn(); }
}

/* ═══ Save View ═══ */
async function saveView() {
  try {
    var api = await getAPI(); var inp = document.getElementById("viewName"); var name = inp ? inp.value.trim() : "";
    if (!name) { var n = new Date(); name = "Approval " + n.getFullYear() + "-" + pad2(n.getMonth() + 1) + "-" + pad2(n.getDate()) + " " + pad2(n.getHours()) + ":" + pad2(n.getMinutes()); if (inp) inp.value = name; }
    var c = await api.view.createView({ name: name, description: "Paint Approval Tool v9.0 | Le Van Thao" });
    if (!c || !c.id) throw new Error("No view ID."); await api.view.updateView({ id: c.id }); await api.view.selectView(c.id);
    log('✓ View: "' + name + '"', "ok");
  } catch (e) { log("✗ " + (e && e.message ? e.message : String(e)), "err"); }
}

/* ═══ File Events ═══ */
async function handleFile(fileInput, fnameId, label, setGuids) {
  var f = fileInput.files && fileInput.files[0];
  if (!f) return;
  document.getElementById(fnameId).textContent = f.name;
  log('Đang đọc [' + label + '] "' + f.name + '"...', "info");
  try {
    var wb = await readWB(f);
    var guids = extractGuids(wb, label);
    setGuids(guids);
    checkApplyBtn();
    if (guids.length > 0) log('  ✓ ' + guids.length + ' GUID sẵn sàng.', "ok");
    else log("  ⚠ Không thấy GUID.", "warn");
  } catch (e) {
    log("  ✗ " + (e && e.message ? e.message : String(e)), "err");
    setGuids([]); checkApplyBtn();
  }
}

document.getElementById("file1").addEventListener("change", function () {
  handleFile(this, "fname1", "Trình duyệt", function (g) { _guidsGreen = g; });
});
document.getElementById("file2").addEventListener("change", function () {
  handleFile(this, "fname2", "Đã ban hành", function (g) { _guidsBlue = g; });
});

document.getElementById("applyBtn").addEventListener("click", applyColors);
document.getElementById("resetBtn").addEventListener("click", resetViewer);
document.getElementById("saveBtn").addEventListener("click", saveView);
