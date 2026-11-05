// src/services/pdfReport.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

export async function generateReport({ liveState, runMode, alarmHistory, isSimulating, options }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ============ صفحه عنوان ============
  doc.setDrawColor(0, 122, 204);
  doc.setLineWidth(2);
  doc.line(15, 25, pageW - 15, 25);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('UNIT 600', pageW / 2, 42, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Disproportionation Process', pageW / 2, 50, { align: 'center' });
  doc.text('Status & Performance Report', pageW / 2, 57, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(15, 63, pageW - 15, 63);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 72, { align: 'center' });

  const modeColor = runMode === 'EOR' ? [244, 71, 71] : [78, 201, 176];
  doc.setDrawColor(...modeColor);
  doc.setFillColor(...modeColor);
  doc.roundedRect(pageW / 2 - 20, 78, 40, 8, 2, 2, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`MODE: ${runMode}`, pageW / 2, 83.5, { align: 'center' });

  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (options.operator) {
    doc.text(`Operator: ${options.operator}`, pageW / 2, 93, { align: 'center' });
  }
  doc.text(`Simulation Status: ${isSimulating ? 'RUNNING' : 'PAUSED'}`, pageW / 2, 99, { align: 'center' });

  // هشدار کلی
  const activeAlarms = alarmHistory.filter(a => !a.clearedAt);
  const criticalCount = activeAlarms.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlarms.filter(a => a.severity === 'warning').length;

  const statusY = 115;
  doc.setFillColor(criticalCount > 0 ? 244 : warningCount > 0 ? 220 : 78,
                   criticalCount > 0 ? 71  : warningCount > 0 ? 220 : 201,
                   criticalCount > 0 ? 71  : warningCount > 0 ? 170 : 176);
  doc.roundedRect(20, statusY, pageW - 40, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const statusText = criticalCount > 0
    ? `CRITICAL: ${criticalCount} active alarm(s)`
    : warningCount > 0
    ? `WARNING: ${warningCount} active alarm(s)`
    : 'ALL SYSTEMS NORMAL';
  doc.text(statusText, pageW / 2, statusY + 11.5, { align: 'center' });

  // ============ بخش ۱: وضعیت فرآیند ============
  if (liveState && options.includeState) {
    doc.addPage();
    let y = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 204);
    doc.text('1. Current Process State', 15, y);
    y += 3;
    doc.setDrawColor(0, 122, 204);
    doc.setLineWidth(0.4);
    doc.line(15, y, pageW - 15, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Parameter', 'Value', 'Unit', 'Target']],
      body: [
        ['Reactor Inlet Temperature', liveState.reactor_inlet_temp_C?.toFixed(2) ?? '—', '°C', '375 – 480'],
        ['Reactor Outlet Temperature', liveState.reactor_outlet_temp_C?.toFixed(2) ?? '—', '°C', '≤ 480'],
        ['Toluene Conversion', liveState.conversion_wt?.toFixed(2) ?? '—', 'wt%', '47 – 48'],
        ['H2/F Ratio', liveState.h2f_ratio?.toFixed(3) ?? '—', 'mol/mol', '≥ 4.00'],
        ['Catalyst Activity', ((liveState.catalyst_activity ?? 0) * 100).toFixed(1), '%', '—'],
        ['Benzene Production', (liveState.benzene_kg_h ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), 'kg/h', '~54,435'],
        ['Xylenes Production', (liveState.xylenes_kg_h ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), 'kg/h', '~25,687'],
        ['Total Fuel Duty', liveState.total_fuel_MW?.toFixed(2) ?? '—', 'MW', '~33.6'],
        ['Process Time', liveState.time?.toFixed(0) ?? '—', 'min', '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 122, 204], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      columnStyles: {
        1: { fontStyle: 'bold', halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center', textColor: [120, 120, 120] },
      },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ============ بخش ۲: بالانس انرژی ============
    if (options.includeEnergy) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(78, 201, 176);
      doc.text('2. Energy Balance', 15, y);
      y += 3;
      doc.setDrawColor(78, 201, 176);
      doc.line(15, y, pageW - 15, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Equipment', 'Service', 'Duty (MW)', 'Type']],
        body: [
          ['H-6001', 'Reactor Heater', liveState['H-6001_MW']?.toFixed(3) ?? '—', 'Fuel'],
          ['H-6002', 'C7/C8 Reboiler', liveState['H-6002_MW']?.toFixed(2) ?? '—', 'Fuel'],
          ['E-6001', 'Feed/Effluent Exchanger', liveState['E-6001_MW']?.toFixed(2) ?? '—', 'Recovery'],
          ['E-6009 A/B', 'T-6003 Overhead → T-6002 Reboiler', liveState['E-6009_MW']?.toFixed(2) ?? '—', 'Recovery'],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [78, 201, 176], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 249] },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'center' },
        },
      });

      y = doc.lastAutoTable.finalY + 4;

      // خلاصه انرژی
      const totalFuel = liveState.total_fuel_MW ?? 0;
      const totalRecovery = (liveState['E-6001_MW'] ?? 0) + (liveState['E-6009_MW'] ?? 0);
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`• Total Fuel Consumption: ${totalFuel.toFixed(2)} MW`, 20, y);
      y += 5;
      doc.text(`• Total Heat Recovery: ${totalRecovery.toFixed(2)} MW`, 20, y);
      y += 5;
      const sec = liveState.benzene_kg_h > 0
        ? (totalFuel * 3600 / liveState.benzene_kg_h).toFixed(3)
        : '—';
      doc.text(`• Specific Energy Consumption: ${sec} GJ/ton benzene`, 20, y);
      y += 8;
    }

    // ============ بخش ۳: تاریخچه هشدارها ============
    if (alarmHistory.length > 0 && options.includeAlarms) {
      if (y > pageH - 60) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(244, 71, 71);
      doc.text('3. Alarm History', 15, y);
      y += 3;
      doc.setDrawColor(244, 71, 71);
      doc.line(15, y, pageW - 15, y);
      y += 6;

      const recent = alarmHistory.slice(-40).reverse();
      autoTable(doc, {
        startY: y,
        head: [['Time', 'Severity', 'Tag', 'Message', 'Duration', 'Status']],
        body: recent.map(a => [
          a.raisedAt,
          a.severity.toUpperCase(),
          a.tag || '—',
          a.message,
          a.duration ? `${a.duration.toFixed(0)}s` : '—',
          a.clearedAt ? 'Cleared' : 'ACTIVE',
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [244, 71, 71], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 24, fontStyle: 'bold' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.section === 'body') {
            const sev = data.cell.raw.toLowerCase();
            if (sev.includes('critical')) {
              data.cell.styles.textColor = [244, 71, 71];
            } else if (sev.includes('warning')) {
              data.cell.styles.textColor = [200, 160, 0];
            } else {
              data.cell.styles.textColor = [0, 122, 204];
            }
          }
          if (data.column.index === 5 && data.section === 'body' && data.cell.raw === 'ACTIVE') {
            data.cell.styles.textColor = [244, 71, 71];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // ============ بخش ۴: تصویر PFD ============
  if (options.includePFD) {
    const pfdEl = document.getElementById('pfd-canvas');
    if (pfdEl) {
      try {
        const dataUrl = await toPng(pfdEl, {
          backgroundColor: '#111111',
          quality: 0.95,
          pixelRatio: 2,
        });
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 122, 204);
        doc.text('4. Process Flow Diagram (PFD)', 15, 15);
        doc.setDrawColor(0, 122, 204);
        doc.setLineWidth(0.4);
        doc.line(15, 18, pageW - 15, 18);

        const imgW = pageW - 20;
        const ratio = (pageH - 40) / imgW;
        const imgH = Math.min(ratio * imgW, pageH - 40);
        doc.addImage(dataUrl, 'PNG', 10, 25, imgW, imgH);
      } catch (err) {
        console.error('PFD capture failed:', err);
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(200, 0, 0);
        doc.text('PFD Screenshot — capture failed', 15, 20);
        doc.setFontSize(9);
        doc.text(`Error: ${err.message}`, 15, 28);
      }
    }
  }

  // ============ بخش ۵: یادداشت‌ها ============
  if (options.notes && options.notes.trim()) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('5. Operator Notes', 15, 20);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(15, 23, pageW - 15, 23);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(options.notes, pageW - 30);
    let noteY = 32;
    lines.forEach(line => {
      if (noteY > pageH - 20) { doc.addPage(); noteY = 20; }
      doc.text(line, 15, noteY);
      noteY += 6;
    });
  }

  // ============ پانویس در همه صفحات ============
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Unit 600 Report — Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
    doc.text(
      new Date().toISOString().slice(0, 10),
      pageW - 15,
      pageH - 8,
      { align: 'right' }
    );
  }

  return doc;
}

export function downloadReport(doc, filename) {
  doc.save(filename);
}