// Clockworks Portal assess1 loader: decode bootstrap from _patches, then run.
const patchBase = new URL("./_patches/", import.meta.url);
const bust = "assess1b";
const parts = await Promise.all(Array.from({ length: 7 }, async (_, i) => {
  const r = await fetch(new URL(`assess1-boot-${i}.b64?v=${bust}`, patchBase));
  if (!r.ok) throw new Error("boot part " + i + " " + r.status);
  return (await r.text()).trim();
}));
const src = atob(parts.join(""));
const blobUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
await import(blobUrl);
