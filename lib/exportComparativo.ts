import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GroupedRow } from './results';

interface PeriodoComparacao {
  label: string;
  rows: GroupedRow[];
}

export function exportComparativo(periodo1: PeriodoComparacao, periodo2: PeriodoComparacao) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('Comparacao de Leituras', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`${periodo1.label}  vs  ${periodo2.label}  —  Gerado em ${dateStr}`, 14, 26);

  const map1 = new Map(periodo1.rows.map((r) => [r.apartamento, r]));
  const map2 = new Map(periodo2.rows.map((r) => [r.apartamento, r]));
  const allApts = Array.from(new Set([...map1.keys(), ...map2.keys()])).sort();

  const tableRows: (string | number)[][] = [];

  for (const apt of allApts) {
    const r1 = map1.get(apt);
    const r2 = map2.get(apt);
    const indice1 = r1?.indice || '—';
    const indice2 = r2?.indice || '—';
    const consumo = r1?.consumo || '—';
    const conf1 = r1?.confianca || 'N/A';
    const conf2 = r2?.confianca || 'N/A';

    tableRows.push([apt, indice1, conf1, indice2, conf2, consumo]);
  }

  autoTable(doc, {
    startY: 32,
    head: [
      [periodo1.label, '', '', periodo2.label, '', ''],
      ['Ape', 'Indice', 'Conf.', 'Indice', 'Conf.', 'Consumo'],
    ],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      if (data.section === 'head' && data.row.index === 0 && (data.column.index === 1 || data.column.index === 4)) {
        data.cell.styles.textColor = [30, 41, 59];
        data.cell.styles.fillColor = [226, 232, 240];
      }
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw).toLowerCase();
        if (val === 'baixa') data.cell.styles.textColor = [220, 38, 38];
        else if (val === 'media') data.cell.styles.textColor = [234, 179, 8];
      }
      if (data.section === 'body' && data.column.index === 4) {
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
      `Pagina ${i}/${pageCount} — Comparativo ${periodo1.label} vs ${periodo2.label}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const filename = `comparativo_${periodo1.label.replace(/\s+/g, '_')}_vs_${periodo2.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
