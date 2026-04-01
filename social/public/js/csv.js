// csv.js — CSV parse, preview, validate, import to Firestore
import { addPost } from "./posts.js";

// ── CSV parser (proper handling of quoted multiline fields) ───────────────────
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuote = !inQuote;
      continue;
    }
    if (ch === "," && !inQuote) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  // Remove BOM if present
  const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  // Normalize line endings
  const normalized = cleanText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Parse rows while respecting quoted fields (which may contain newlines)
  const rows = [];
  let currentRow = "", inQuote = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    // Handle quotes
    if (ch === '"') {
      if (inQuote && normalized[i + 1] === '"') {
        // Escaped quote ""
        currentRow += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      currentRow += ch;
      continue;
    }

    // Handle newlines (only count as row boundary if not in quotes)
    if (ch === "\n" && !inQuote) {
      if (currentRow.trim()) {
        rows.push(currentRow);
      }
      currentRow = "";
      continue;
    }

    currentRow += ch;
  }

  // Don't forget the last row
  if (currentRow.trim()) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  // Parse header row and normalize for flexible matching
  const headerVals = parseCSVLine(rows[0]).map(h => h.trim());
  const headers = headerVals.map(h => h.toLowerCase().replace(/\s+/g, "_"));

  // Parse data rows
  return rows.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row  = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || "").trim(); });
    return row;
  });
}

function rowToPostData(row, platform) {
  // Try all variations of column names (in case of spaces, case differences, etc.)
  const findValue = (keys) => {
    for (const key of keys) {
      if (row[key] && row[key].trim()) return row[key].trim();
    }
    return "";
  };

  const date = findValue(["scheduled_date", "scheduled_date ", "date", "date "]);
  const time = findValue(["scheduled_time", "scheduled_time ", "time", "time "]);
  const text = findValue(["post_text", "post_text ", "text", "content", "message", "post", "post "]);

  if (!date || !time || !text) {
    return null;
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Validate time format (HH:MM in 24h or 12h)
  if (!/^(\d{1,2}):(\d{2})/.test(time)) return null;

  const data = { platform, text, scheduledDate: date, scheduledTime: time };
  if (platform === "facebook") {
    const link = findValue(["first_comment", "first_comment ", "link", "comment_link", "comment_link "]);
    if (link) data.link = link;
  } else if (platform === "x") {
    const thread = findValue(["thread_tweets", "thread_tweets ", "thread", "replies", "thread_posts", "thread_posts "]);
    if (thread) {
      // Handle both pipe-separated and newline-separated threads
      const separator = thread.includes("|") ? "|" : "\n";
      data.thread = thread.split(separator).map(s => s.trim()).filter(Boolean);
    }
  }
  return data;
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Render ────────────────────────────────────────────────────────────────────
export function initImport() {
  const container = document.getElementById("import-container");
  if (!container) return;

  let currentPlatform = "facebook";
  let parsedRows = [];

  container.innerHTML = `
    <!-- Template downloads -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Download Templates</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn-fb btn-sm" href="templates/facebook-template.csv" download>⬇ Facebook Template</a>
        <a class="btn btn-ghost btn-sm" href="templates/x-template.csv" download>⬇ X Template</a>
      </div>
      <div class="hint" style="margin-top:10px">
        Fill in the template and import below. Date format: YYYY-MM-DD. Time format: HH:MM (24h, Central Time).
        For X threads, separate tweets with a pipe character <code>|</code>.
      </div>
    </div>

    <!-- Upload -->
    <div class="card">
      <div class="card-title">Import CSV</div>

      <!-- Platform tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-fb btn-sm" id="tab-fb" style="opacity:1">🔵 Facebook CSV</button>
        <button class="btn btn-ghost btn-sm" id="tab-x">🐦 X CSV</button>
      </div>

      <div class="upload-zone" id="upload-zone">
        <input type="file" id="csv-file-input" accept=".csv,text/csv">
        <div class="uz-icon">📥</div>
        <div class="uz-label">Drop CSV file here or click to browse</div>
        <div class="uz-hint" id="upload-hint">Importing as: <strong>Facebook</strong></div>
      </div>

      <div id="import-preview" style="margin-top:16px"></div>
    </div>`;

  // Platform tab switching
  const tabFb = document.getElementById("tab-fb");
  const tabX  = document.getElementById("tab-x");
  const hint  = document.getElementById("upload-hint");

  function setTab(p) {
    currentPlatform = p;
    tabFb.className = `btn btn-sm ${p === "facebook" ? "btn-fb" : "btn-ghost"}`;
    tabFb.style.color = "";
    tabFb.style.borderColor = "";
    if (p === "x") {
      tabX.className = "btn btn-sm btn-ghost";
      tabX.style.color = "var(--x)";
      tabX.style.borderColor = "rgba(231,233,234,.25)";
    } else {
      tabX.className = "btn btn-sm btn-ghost";
      tabX.style.color = "";
      tabX.style.borderColor = "";
    }
    hint.innerHTML  = `Importing as: <strong>${p === "facebook" ? "Facebook" : "X"}</strong>`;
    // Re-render preview if we already have rows
    if (parsedRows.length) renderPreview(parsedRows, p);
  }

  tabFb.addEventListener("click", () => setTab("facebook"));
  tabX.addEventListener("click",  () => setTab("x"));

  // File input
  const fileInput  = document.getElementById("csv-file-input");
  const uploadZone = document.getElementById("upload-zone");

  uploadZone.addEventListener("dragover",  e => { e.preventDefault(); uploadZone.classList.add("drag"); });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag"));
  uploadZone.addEventListener("drop", e => {
    e.preventDefault(); uploadZone.classList.remove("drag");
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) readFile(fileInput.files[0]);
  });

  function readFile(file) {
    const reader = new FileReader();
    reader.onload  = e => {
      parsedRows = parseCSV(e.target.result);
      renderPreview(parsedRows, currentPlatform);
    };
    reader.onerror = () => {
      document.getElementById("import-preview").innerHTML =
        `<div class="alert alert-error">Could not read file.</div>`;
    };
    reader.readAsText(file);
  }

  function renderPreview(rows, platform) {
    const previewEl = document.getElementById("import-preview");
    if (!previewEl) return;

    if (!rows.length) {
      previewEl.innerHTML = `<div class="alert alert-error">No rows found. Check that the file has headers and data.</div>`;
      return;
    }

    const items  = rows.map(r => ({ raw: r, data: rowToPostData(r, platform) }));
    const valid  = items.filter(i => i.data !== null);
    const invalid = items.length - valid.length;

    previewEl.innerHTML = `
      <div style="margin-bottom:12px;font-family:'JetBrains Mono',monospace;font-size:12px">
        <span style="color:var(--green)">${valid.length} valid</span>
        ${invalid ? `&nbsp;·&nbsp;<span style="color:var(--red)">${invalid} invalid</span>` : ""}
        &nbsp;·&nbsp;<span style="color:var(--muted)">${items.length} total rows</span>
      </div>
      <div style="overflow-x:auto;margin-bottom:14px">
        <table class="import-table">
          <thead><tr>
            <th><input type="checkbox" class="row-check" id="check-all" checked></th>
            <th>Date</th><th>Time (CT)</th><th>Content</th>
            <th>${platform === "facebook" ? "Link" : "Thread"}</th>
          </tr></thead>
          <tbody>
            ${items.map((item, i) => item.data ? `
              <tr>
                <td><input type="checkbox" class="row-check import-row-check" data-idx="${i}" checked></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap">${escHtml(item.data.scheduledDate)}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap">${escHtml(item.data.scheduledTime)}</td>
                <td><div class="cell-preview">${escHtml(item.data.text)}</div></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">
                  ${platform === "facebook"
                    ? (item.data.link ? `<span style="color:var(--fb)">link</span>` : "—")
                    : (item.data.thread ? `<span style="color:var(--orange)">${item.data.thread.length + 1} tweets</span>` : "—")}
                </td>
              </tr>` : `
              <tr class="row-err">
                <td></td>
                <td colspan="4" style="font-size:11px">
                  ✕ Invalid — ${!item.raw.scheduled_date ? "missing date" : !item.raw.scheduled_time ? "missing time" : !item.raw.post_text ? "missing text" : "invalid format"}
                </td>
              </tr>`
            ).join("")}
          </tbody>
        </table>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-primary" id="confirm-import-btn">✅ Import Selected</button>
        <button class="btn btn-ghost btn-sm" id="clear-import-btn">🔄 Clear</button>
        <span id="import-result" style="font-family:'JetBrains Mono',monospace;font-size:12px"></span>
      </div>`;

    // Select all toggle
    document.getElementById("check-all").addEventListener("change", e => {
      document.querySelectorAll(".import-row-check").forEach(cb => { cb.checked = e.target.checked; });
    });

    document.getElementById("confirm-import-btn").addEventListener("click", async () => {
      const selected = [...document.querySelectorAll(".import-row-check:checked")]
        .map(cb => parseInt(cb.dataset.idx))
        .map(i => items[i]?.data)
        .filter(Boolean);

      const resultEl = document.getElementById("import-result");
      if (!selected.length) {
        resultEl.style.color = "var(--red)";
        resultEl.textContent = "No rows selected.";
        return;
      }

      const btn = document.getElementById("confirm-import-btn");
      btn.disabled = true;
      btn.textContent = `Importing ${selected.length}…`;
      resultEl.textContent = "";

      let imported = 0, failed = 0;
      for (const data of selected) {
        try   { await addPost(data); imported++; }
        catch { failed++; }
      }

      btn.disabled = false;
      btn.textContent = "✅ Import Selected";
      resultEl.style.color = failed ? "var(--yellow)" : "var(--green)";
      resultEl.textContent = `Imported ${imported}${failed ? `, ${failed} failed` : ""}.`;
    });

    // Clear button
    document.getElementById("clear-import-btn").addEventListener("click", () => {
      parsedRows = [];
      fileInput.value = "";
      document.getElementById("import-preview").innerHTML = "";
      document.getElementById("import-result").textContent = "";
    });
  }
}
