// src/services/layoutStorage.js
const STORAGE_KEY = 'unit600_layouts_v1';
const LEGACY_KEY = 'unit600_pfd_layout_v2';
const DEFAULT_ID = 'default';
const BASE_IDS = ['H-6001', 'R-6001', 'E-6001', 'T-6002', 'T-6003'];

/** Live values (primary/secondary/status) must not be persisted for base equipment. */
export function stripLiveData(nodes) {
  return nodes.map(n => {
    if (!BASE_IDS.includes(n.id)) return n;
    const { primary, secondary, status, ...cleanData } = n.data; // eslint-disable-line
    return { ...n, data: cleanData };
  });
}

/** Read entire store: { activeId, layouts: [...] } */
export function getLayouts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    // Migration from v2 (single-layout key)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const { nodes = [], edges = [] } = JSON.parse(legacy);
      const migrated = {
        activeId: DEFAULT_ID,
        layouts: [{
          id: DEFAULT_ID,
          name: 'Default Layout',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodes: stripLiveData(nodes),
          edges,
        }],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch (err) {
    console.error('Failed to load layouts:', err);
  }
  return { activeId: DEFAULT_ID, layouts: [] };
}

function persist(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getActiveLayout() {
  const store = getLayouts();
  return store.layouts.find(l => l.id === store.activeId) || null;
}

export function createLayout(name, nodes, edges, { activate = true } = {}) {
  const store = getLayouts();
  const id = `layout_${Date.now()}`;
  const layout = {
    id,
    name: name || `Layout ${store.layouts.length + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: stripLiveData(nodes),
    edges,
  };
  store.layouts.push(layout);
  if (activate) store.activeId = id;
  persist(store);
  return layout;
}

export function updateLayout(id, nodes, edges) {
  const store = getLayouts();
  const idx = store.layouts.findIndex(l => l.id === id);
  if (idx === -1) return null;
  store.layouts[idx].nodes = stripLiveData(nodes);
  store.layouts[idx].edges = edges;
  store.layouts[idx].updatedAt = new Date().toISOString();
  persist(store);
  return store.layouts[idx];
}

export function deleteLayout(id) {
  const store = getLayouts();
  store.layouts = store.layouts.filter(l => l.id !== id);
  if (store.activeId === id) {
    store.activeId = store.layouts[0]?.id || null;
  }
  persist(store);
  return store;
}

export function renameLayout(id, newName) {
  const store = getLayouts();
  const idx = store.layouts.findIndex(l => l.id === id);
  if (idx === -1) return null;
  store.layouts[idx].name = newName;
  store.layouts[idx].updatedAt = new Date().toISOString();
  persist(store);
  return store.layouts[idx];
}

export function setActiveLayoutId(id) {
  const store = getLayouts();
  store.activeId = id;
  persist(store);
}

/** Download a single layout as JSON */
export function exportLayout(layout) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${layout.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download all layouts as one JSON bundle */
export function exportAllLayouts() {
  const store = getLayouts();
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `unit600_layouts_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import from a File object. Returns number of imported layouts. */
export function importLayoutsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.layouts;
        if (!Array.isArray(incoming)) throw new Error('Invalid layout file');

        const store = getLayouts();
        const existingIds = new Set(store.layouts.map(l => l.id));
        let count = 0;

        incoming.forEach(l => {
          if (!l.nodes || !Array.isArray(l.nodes)) return;
          const id = existingIds.has(l.id)
            ? `layout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            : l.id;
          store.layouts.push({
            id,
            name: l.name || `Imported ${count + 1}`,
            createdAt: l.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: l.nodes,
            edges: l.edges || [],
          });
          existingIds.add(id);
          count++;
        });

        persist(store);
        resolve(count);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}