// src/services/api.js
const API_BASE = 'http://localhost:8000/api';

export async function startSimulation() {
  try {
    const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
    return await res.json();
  } catch { return { status: 'error', message: 'Backend offline' }; }
}

export async function pauseSimulation() {
  try {
    const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
    return await res.json();
  } catch { return { status: 'error' }; }
}

export async function resetSimulation() {
  try {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    return await res.json();
  } catch { return { status: 'error' }; }
}

export async function setMode(mode) {
  try {
    const res = await fetch(`${API_BASE}/simulation/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return await res.json();
  } catch { return { status: 'error' }; }
}

export async function getHistory(limit = 60) {
  try {
    const res = await fetch(`${API_BASE}/simulation/history?limit=${limit}`);
    const data = await res.json();
    return data.history || [];
  } catch { return []; }
}

export async function getState() {
  try {
    const res = await fetch(`${API_BASE}/simulation/state`);
    return await res.json();
  } catch { return null; }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch { return false; }
}