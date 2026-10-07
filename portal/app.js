// Clockworks Portal app loader (assets3) — concatenates chunk modules then imports.
const PARTS = ["app.p0.js?v=assets3", "app.p1.js?v=assets3", "app.p2.js?v=assets3", "app.p3.js?v=assets3"];
const base = import.meta.url;
let src = "";
for (const name of PARTS) {
  const res = await fetch(new URL(name, base));
  if (!res.ok) throw new Error("Failed to load " + name + ": " + res.status);
  src += await res.text();
}
const blobUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
await import(blobUrl);
