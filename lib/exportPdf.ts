import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GroupedRow } from './results';

export function exportPdf(rows: GroupedRow[], label?: string) {
  const doc = new jsPDF({ orientation: rows.length > 20 ? 'landscape' : 'portrait' });

  doc.setFontSize(16);
  doc.text('Leitura de Hidrometros', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const subtitle = label ? `${label} — ${dateStr}` : dateStr;
  doc.text(subtitle, 14, 28);

  const tableRows = rows.map((r) => [
    r.apartamento,
    r.indice || '—',
    r.consumo || '—',
    r.confianca,
    r.observacao || '—',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['Ape', 'Indice', 'Consumo', 'Confianca', 'Observacao']],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw).toLowerCase();
        if (val === 'baixa') data.cell.styles.textColor = [220, 38, 38];
        else if (val === 'media') data.cell.styles.textColor = [234, 179, 8];
      }
    },
  });

  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Pagina ${i}/${pageCount} — Gerado em ${dateStr}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const filename = `leituras_${label ? label.replace(/\s+/g, '_') + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
