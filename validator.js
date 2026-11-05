// src/services/validator.js

export function validateFlowsheet(nodes, edges, results) {
  const issues = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Set(edges.map(e => e.target));
  const outgoing = new Set(edges.map(e => e.source));

  // ۱. بررسی تجهیزات قطع‌شده (Disconnected Nodes)
  nodes.forEach(n => {
    const isStream = n.data.simType === 'Stream';
    
    if (!isStream) {
      if (!incoming.has(n.id) && !outgoing.has(n.id)) {
        issues.push({
          id: `disc-${n.id}`,
          severity: 'error',
          nodeId: n.id,
          message: `Equipment ${n.id} is completely disconnected. Add an inlet or outlet stream.`,
        });
      } else if (!incoming.has(n.id)) {
        issues.push({
          id: `no-in-${n.id}`,
          severity: 'warning',
          nodeId: n.id,
          message: `Equipment ${n.id} has no inlet stream. Results may be invalid.`,
        });
      }
    } else {
      // جریان‌ها باید حداقل یک اتصال داشته باشند
      if (!incoming.has(n.id) && !outgoing.has(n.id)) {
        issues.push({
          id: `disc-stream-${n.id}`,
          severity: 'warning',
          nodeId: n.id,
          message: `Stream ${n.id} is floating. Connect it to equipment.`,
        });
      }
    }
  });

  // ۲. بررسی نتایج شبیه‌سازی (اگر Propagation انجام شده باشد)
  if (results) {
    Object.entries(results).forEach(([id, res]) => {
      const node = nodeMap.get(id);
      if (!node) return;

      // فشار منفی یا صفر
      if (res.P_out !== undefined && res.P_out <= 0) {
        issues.push({
          id: `p-neg-${id}`,
          severity: 'error',
          nodeId: id,
          message: `Equipment ${id} has non-positive outlet pressure (${res.P_out.toFixed(2)} barg). Check upstream pressure.`,
        });
      }

      // دمای غیرمنطقی
      if (res.T_out !== undefined) {
        if (res.T_out > 1000) {
          issues.push({
            id: `t-high-${id}`,
            severity: 'error',
            nodeId: id,
            message: `Equipment ${id} outlet temperature (${res.T_out.toFixed(1)}°C) exceeds safe limits (>1000°C).`,
          });
        } else if (res.T_out < -50) {
          issues.push({
            id: `t-low-${id}`,
            severity: 'error',
            nodeId: id,
            message: `Equipment ${id} outlet temperature (${res.T_out.toFixed(1)}°C) is below physical limits (<-50°C).`,
          });
        }
      }

      // دبی صفر یا منفی
      if (res.flow_out !== undefined && res.flow_out <= 0) {
        issues.push({
          id: `f-zero-${id}`,
          severity: 'warning',
          nodeId: id,
          message: `Equipment ${id} has zero or negative flow. Check upstream feed.`,
        });
      }
    });
  }

  return issues;
}