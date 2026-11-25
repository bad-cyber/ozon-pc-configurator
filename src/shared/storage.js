import { STORAGE_KEYS } from './constants.js';

const extApi = typeof browser !== 'undefined' ? browser : chrome;

export async function loadCurrentBuild() {
  const res = await extApi.storage.local.get(STORAGE_KEYS.CURRENT_BUILD);
  return res[STORAGE_KEYS.CURRENT_BUILD] || {
    buildName: 'Моя сборка ПК',
    selected: {}
  };
}

export async function saveCurrentBuild(buildData) {
  await extApi.storage.local.set({
    [STORAGE_KEYS.CURRENT_BUILD]: {
      buildName: buildData.buildName || 'Моя сборка ПК',
      selected: buildData.selected || {},
      updatedAt: Date.now()
    }
  });
}

export async function loadSavedBuildsList() {
  const res = await extApi.storage.local.get(STORAGE_KEYS.SAVED_BUILDS);
  const list = res[STORAGE_KEYS.SAVED_BUILDS];
  return Array.isArray(list) ? list : [];
}

export async function saveBuildToLibrary(buildData) {
  const list = await loadSavedBuildsList();
  const entry = {
    id: `build-${Date.now()}`,
    buildName: String(buildData.buildName || 'Без названия').trim(),
    selected: structuredClone(buildData.selected || {}),
    savedAt: Date.now()
  };
  const updated = [entry, ...list].slice(0, 30);
  await extApi.storage.local.set({ [STORAGE_KEYS.SAVED_BUILDS]: updated });
  return updated;
}

export async function deleteBuildFromLibrary(buildId) {
  const list = await loadSavedBuildsList();
  const updated = list.filter((item) => item.id !== buildId);
  await extApi.storage.local.set({ [STORAGE_KEYS.SAVED_BUILDS]: updated });
  return updated;
}
