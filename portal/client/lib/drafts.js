// Intake-only device drafts. No invite tokens, codes, signatures, or credentials are stored.
const database = () => new Promise((resolve,reject) => {
  const request = indexedDB.open('cw-client-intake-drafts',1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function transact(mode, run) {
  const db = await database();
  try { return await new Promise((resolve,reject) => {
    const tx = db.transaction('drafts',mode), request=run(tx.objectStore('drafts'));
    tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  }); } finally {db.close();}
}
export const putDraft = (key,value) => transact('readwrite',store=>store.put(value,key));
export const removeDraft = key => transact('readwrite',store=>store.delete(key));
export const clearDrafts = () => transact('readwrite',store=>store.clear()).catch(()=>{});
export async function getDraft(key) {
  const draft = await transact('readonly',store=>store.get(key));
  if(draft && draft.expiresAt > Date.now()) return draft;
  if(draft) await removeDraft(key);
  return null;
}
