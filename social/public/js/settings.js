// settings.js — backup & restore, app settings
import { db } from "./firebase-init.js";
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { addPost } from "./posts.js";

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export async function initSettings() {
  const container = document.getElementById("settings-container");
  if (!container) return;

  container.innerHTML = `
    <!-- Backup Section -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-title">📥 Backup & Recovery</div>

      <div style="margin-bottom:20px">
        <h3 style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Download Backup</h3>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px">
          Export all scheduled posts to a JSON file. Use this to recover if you accidentally delete posts or lose data.
        </p>
        <button class="btn btn-primary" id="backup-btn">
          ⬇️ Download Backup
        </button>
        <div id="backup-status" style="margin-top:8px;font-size:12px"></div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px">
        <h3 style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Restore from Backup</h3>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px">
          Upload a previously downloaded backup JSON file to restore all posts. Existing posts with the same ID will be skipped.
        </p>

        <div class="upload-zone" id="restore-zone">
          <input type="file" id="restore-file-input" accept=".json,application/json">
          <div class="uz-icon">📤</div>
          <div class="uz-label">Drop JSON backup file here or click to browse</div>
          <div class="uz-hint">Select a backup file previously downloaded from this page</div>
        </div>

        <div id="restore-preview" style="margin-top:16px"></div>
      </div>
    </div>

    <!-- About Section -->
    <div class="card">
      <div class="card-title">ℹ️ About</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px">
        <div>
          <div style="color:var(--dim);margin-bottom:4px">Application</div>
          <div style="color:var(--text);font-weight:500">Clockworks Social v2</div>
        </div>
        <div>
          <div style="color:var(--dim);margin-bottom:4px">Backend</div>
          <div style="color:var(--text);font-weight:500">Firebase + VPS Scheduler</div>
        </div>
        <div>
          <div style="color:var(--dim);margin-bottom:4px">Database</div>
          <div style="color:var(--text);font-weight:500">Firestore</div>
        </div>
        <div>
          <div style="color:var(--dim);margin-bottom:4px">Platforms</div>
          <div style="color:var(--text);font-weight:500">Facebook, X (Twitter)</div>
        </div>
      </div>
    </div>
  `;

  // Backup button
  document.getElementById("backup-btn").addEventListener("click", async () => {
    const btn = document.getElementById("backup-btn");
    const status = document.getElementById("backup-status");

    btn.disabled = true;
    btn.textContent = "⏳ Exporting…";
    status.innerHTML = "";

    try {
      // Get all posts
      const postsSnap = await getDocs(collection(db, "posts"));
      const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (!posts.length) {
        status.innerHTML = '<span style="color:var(--yellow)">⚠️ No posts to backup</span>';
        btn.disabled = false;
        btn.textContent = "⬇️ Download Backup";
        return;
      }

      // Convert Timestamps to ISO strings for JSON serialization
      const postsForExport = posts.map(p => ({
        ...p,
        scheduled_at: p.scheduled_at?.toDate?.()?.toISOString?.() || p.scheduled_at,
        created_at: p.created_at?.toDate?.()?.toISOString?.() || p.created_at,
      }));

      // Create JSON blob
      const json = JSON.stringify(postsForExport, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `clockworks-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      status.innerHTML = `<span style="color:var(--green)">✅ Backup downloaded (${posts.length} posts)</span>`;
    } catch (e) {
      status.innerHTML = `<span style="color:var(--red)">❌ Error: ${escHtml(e.message)}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "⬇️ Download Backup";
    }
  });

  // Restore file input
  const restoreZone = document.getElementById("restore-zone");
  const restoreFileInput = document.getElementById("restore-file-input");

  restoreZone.addEventListener("dragover", e => {
    e.preventDefault();
    restoreZone.classList.add("drag");
  });

  restoreZone.addEventListener("dragleave", () => {
    restoreZone.classList.remove("drag");
  });

  restoreZone.addEventListener("drop", e => {
    e.preventDefault();
    restoreZone.classList.remove("drag");
    if (e.dataTransfer.files[0]) readRestoreFile(e.dataTransfer.files[0]);
  });

  restoreFileInput.addEventListener("change", () => {
    if (restoreFileInput.files[0]) readRestoreFile(restoreFileInput.files[0]);
  });

  function readRestoreFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const posts = JSON.parse(e.target.result);
        if (!Array.isArray(posts)) throw new Error("Invalid format: expected array of posts");

        renderRestorePreview(posts);
      } catch (err) {
        document.getElementById("restore-preview").innerHTML =
          `<div class="alert alert-error">Invalid file: ${escHtml(err.message)}</div>`;
      }
    };
    reader.onerror = () => {
      document.getElementById("restore-preview").innerHTML =
        `<div class="alert alert-error">Could not read file</div>`;
    };
    reader.readAsText(file);
  }

  function renderRestorePreview(posts) {
    const previewEl = document.getElementById("restore-preview");

    // Group by platform
    const fbPosts = posts.filter(p => p.platform === "facebook");
    const xPosts = posts.filter(p => p.platform === "x");

    previewEl.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
          <span style="color:var(--green)">✅ Ready to restore</span>
          &nbsp;·&nbsp;
          <span>${posts.length} posts</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:rgba(74,158,255,.08);border:1px solid rgba(74,158,255,.2);border-radius:6px;padding:12px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px">FACEBOOK</div>
            <div style="font-size:18px;font-weight:600;color:var(--fb)">${fbPosts.length}</div>
          </div>
          <div style="background:rgba(231,233,234,.08);border:1px solid rgba(231,233,234,.15);border-radius:6px;padding:12px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px">X</div>
            <div style="font-size:18px;font-weight:600;color:var(--x)">${xPosts.length}</div>
          </div>
        </div>
        <button class="btn btn-success" id="confirm-restore-btn" style="width:100%">
          ✅ Restore ${posts.length} Posts
        </button>
      </div>
    `;

    document.getElementById("confirm-restore-btn").addEventListener("click", async () => {
      const btn = document.getElementById("confirm-restore-btn");
      btn.disabled = true;
      btn.textContent = "⏳ Restoring…";

      let restored = 0, skipped = 0;
      const errors = [];

      try {
        // Get existing post IDs to avoid duplicates
        const existingSnap = await getDocs(collection(db, "posts"));
        const existingIds = new Set(existingSnap.docs.map(d => d.id));

        for (const post of posts) {
          try {
            if (existingIds.has(post.id)) {
              skipped++;
              continue;
            }

            // Convert ISO strings back to dates for Firestore
            const postData = { ...post };
            if (typeof postData.scheduled_at === "string") {
              postData.scheduled_at = new Date(postData.scheduled_at);
            }
            if (typeof postData.created_at === "string") {
              postData.created_at = new Date(postData.created_at);
            }

            // Add to Firestore using addDoc (generates new ID) or set with existing ID
            await addDoc(collection(db, "posts"), postData);
            restored++;
          } catch (e) {
            errors.push(`Post ${post.id}: ${e.message}`);
          }
        }

        previewEl.innerHTML = `
          <div class="alert alert-success">
            ✅ Restore complete!
            <br>Restored: ${restored} posts
            ${skipped ? `<br>Skipped: ${skipped} (already exist)` : ""}
            ${errors.length ? `<br>Errors: ${errors.length}` : ""}
          </div>
        `;
        restoreFileInput.value = "";
      } catch (e) {
        previewEl.innerHTML = `<div class="alert alert-error">❌ Restore failed: ${escHtml(e.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = "✅ Restore Finished";
      }
    });
  }
}
