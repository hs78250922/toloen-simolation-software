// src/components/LayoutManager.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  X, Plus, Trash2, Download, Upload, Check, Pencil,
  FolderOpen, FileJson, Save, AlertTriangle
} from 'lucide-react';
import {
  getLayouts, createLayout, renameLayout, deleteLayout,
  exportLayout, exportAllLayouts, importLayoutsFromFile,
} from '../services/layoutStorage';

export default function LayoutManager({ currentNodes, currentEdges, onSwitch, onClose }) {
  const [store, setStore] = useState(() => getLayouts());
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const refresh = () => setStore(getLayouts());

  // Esc to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = () => {
    const name = (newName || '').trim() || `Layout ${store.layouts.length + 1}`;
    const created = createLayout(name, currentNodes, currentEdges, { activate: true });
    setNewName('');
    setShowNewForm(false);
    refresh();
    onSwitch(created.id);
  };

  const handleActivate = (id) => {
    if (id === store.activeId) return;
    onSwitch(id);
    refresh();
  };

  const handleRenameSave = (id) => {
    const trimmed = editingName.trim();
    if (trimmed) renameLayout(id, trimmed);
    setEditingId(null);
    setEditingName('');
    refresh();
  };

  const handleDelete = (layout) => {
    if (!window.confirm(`Delete layout "${layout.name}"? This cannot be undone.`)) return;
    deleteLayout(layout.id);
    refresh();
    const updated = getLayouts();
    if (updated.activeId) onSwitch(updated.activeId);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importLayoutsFromFile(file);
      setImportStatus({ type: 'success', message: `${count} layout(s) imported` });
      refresh();
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message });
    } finally {
      e.target.value = '';
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl w-[640px] max-w-[94vw] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#3e3e42]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-[#007acc]" /> Layout Manager
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {store.layouts.length} saved layout{store.layouts.length !== 1 ? 's' : ''} • Auto-save is on
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 -mr-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#3e3e42] bg-black/20">
          <button
            onClick={() => setShowNewForm(v => !v)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#007acc] text-white rounded hover:bg-[#0068b0] transition-colors"
          >
            <Plus size={12} /> New Layout
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#3e3e42] text-gray-200 rounded hover:bg-gray-600 transition-colors"
          >
            <Upload size={12} /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={exportAllLayouts}
            disabled={store.layouts.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#3e3e42] text-gray-200 rounded hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download size={12} /> Export All
          </button>
          {importStatus && (
            <span className={`ml-auto text-[10px] ${
              importStatus.type === 'success' ? 'text-[#4ec9b0]' : 'text-[#f44747]'
            }`}>
              {importStatus.type === 'success' ? '✓' : '✗'} {importStatus.message}
            </span>
          )}
        </div>

        {/* New layout form */}
        {showNewForm && (
          <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#007acc]/5">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Name of new layout (duplicates current PFD)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
                placeholder={`Layout ${store.layouts.length + 1}`}
                className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs focus:outline-none focus:border-[#007acc]"
              />
              <button
                onClick={handleCreate}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] bg-[#007acc] text-white rounded hover:bg-[#0068b0]"
              >
                <Save size={12} /> Create
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewName(''); }}
                className="px-3 py-1.5 text-[11px] bg-[#3e3e42] text-gray-300 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Layout list */}
        <div className="flex-1 overflow-y-auto p-2">
          {store.layouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-500 gap-2">
              <AlertTriangle size={24} className="text-[#dcdcaa]" />
              <span>No saved layouts yet.</span>
              <span className="text-[10px]">Click "New Layout" to save the current PFD.</span>
            </div>
          ) : (
            <div className="space-y-1">
              {store.layouts.map(layout => {
                const isActive = layout.id === store.activeId;
                const isEditing = layout.id === editingId;

                return (
                  <div
                    key={layout.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                      isActive
                        ? 'bg-[#007acc]/10 border-[#007acc]/50'
                        : 'bg-[#1e1e1e] border-[#3e3e42] hover:border-[#4e4e52]'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-[#007acc] text-white' : 'bg-[#3e3e42] text-gray-500'
                    }`}>
                      {isActive ? <Check size={12} /> : <FileJson size={12} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleRenameSave(layout.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(layout.id);
                            if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                          }}
                          autoFocus
                          className="w-full px-2 py-0.5 bg-[#1e1e1e] border border-[#007acc] rounded text-white text-xs"
                        />
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-white truncate">
                            {layout.name}
                            {isActive && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#007acc] text-white uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>{(layout.nodes || []).length} equipment</span>
                            <span>•</span>
                            <span>{(layout.edges || []).length} connections</span>
                            <span>•</span>
                            <span>modified {formatDate(layout.updatedAt)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => handleActivate(layout.id)}
                          className="px-2 py-1 text-[10px] bg-[#007acc]/20 text-[#007acc] rounded border border-[#007acc]/40 hover:bg-[#007acc]/30"
                          title="Switch to this layout"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingId(layout.id); setEditingName(layout.name); }}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => exportLayout(layout)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Export this layout"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(layout)}
                        className="p-1 text-gray-400 hover:text-[#f44747]"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#3e3e42] bg-black/20 text-[10px] text-gray-500 flex items-center justify-between rounded-b-lg">
          <span>Layouts are saved locally in your browser (localStorage).</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-[#3e3e42] text-gray-300 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}