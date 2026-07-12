'use client';

import { useMemo } from 'react';
import type { GroupedRow } from '@/lib/results';

interface ResultsTableProps {
  groupedRows: GroupedRow[];
  photoPreviewMap: Map<string, string>;
  editingCell: { apt: string; field: string } | null;
  editValue: string;
  onEdit: (apt: string, field: string, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onShare: () => void;
  shareCopied: boolean;
}

export default function ResultsTable({
  groupedRows,
  photoPreviewMap,
  editingCell,
  editValue,
  onEdit,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onExport,
  onExportPdf,
  onExportCsv,
  onShare,
  shareCopied,
}: ResultsTableProps) {
  const reviewCount = useMemo(
    () => groupedRows.filter((r) => r.confianca === 'baixa' || r.observacao.includes('DIVERGENCIA')).length,
    [groupedRows]
  );

  return (
    <section className="panel" aria-label="Resultados por apartamento">
      <div className="panel-title">Resultado por apartamento</div>
      <div className="table-wrap" role="region" aria-label="Tabela de leituras" tabIndex={0}>
        <table aria-label="Leituras de hidrometros por apartamento">
          <thead>
            <tr>
              <th>Ape</th>
              <th>Indice</th>
              <th>Consumo</th>
              <th>Confianca</th>
              <th>Observacao</th>
              <th className="th-validacao">Validacao</th>
              <th className="th-preview">Foto</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((r) => {
              const isDanger =
                r.observacao.includes('DIVERGENCIA') || (r.confianca === 'baixa' && r.observacao.includes('nao foi possivel'));
              const isLow = r.confianca === 'baixa' || r.confianca === 'media';
              const rowClass = isDanger ? 'danger' : isLow ? 'low' : '';
              const isEditing = editingCell?.apt === r.apartamento && editingCell?.field === 'indice';
              const firstFile = r.arquivos.split(', ')[0] || '';
              const thumbUrl = photoPreviewMap.get(firstFile);
              return (
                <tr key={r.apartamento} className={rowClass}>
                  <td className="mono">{r.apartamento}</td>
                  <td
                    className="mono editable"
                    onDoubleClick={() => onEdit(r.apartamento, 'indice', r.indice)}
                    title="Duplo clique para editar"
                  >
                    {isEditing ? (
                      <input
                        className="inline-edit"
                        value={editValue}
                        onChange={(e) => onEditValueChange(e.target.value)}
                        onBlur={onCommitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCommitEdit();
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        autoFocus
                      />
                    ) : (
                      r.indice || '---'
                    )}
                  </td>
                  <td className="mono">
                    {r.consumo ? (
                      <span className={r.consumo.startsWith('⚠') ? 'consumo-negativo' : 'consumo'}>{r.consumo}</span>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td>
                    <span className={'badge ' + r.confianca.toLowerCase()}>{r.confianca}</span>
                  </td>
                  <td>{r.observacao || '---'}</td>
                  <td className="td-validacao">
                    {r.validacao && (
                      <span className="badge-validacao" title={r.validacao}>
                        {r.validacao.includes('critico') || r.validacao.includes('🔴') ? '🔴' : '⚠️'}
                      </span>
                    )}
                  </td>
                  <td className="td-preview">
                    {thumbUrl && (
                      <div className="thumb-wrap">
                        <img src={thumbUrl} alt="" className="thumb" loading="lazy" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="footer-actions">
        <span className="stat">
          <strong>{groupedRows.length}</strong> apartamentos · <strong>{reviewCount}</strong> para revisar
        </span>
        <div className="export-buttons">
          <button className="secondary" onClick={onExport} aria-label="Exportar resultados como planilha Excel">
            Exportar XLSX
          </button>
          <button className="secondary" onClick={onExportPdf} aria-label="Exportar resultados como documento PDF">
            Exportar PDF
          </button>
          <button className="secondary" onClick={onExportCsv} aria-label="Exportar resultados como arquivo CSV">
            Exportar CSV
          </button>
          <button className="secondary" onClick={onShare} aria-label={shareCopied ? 'Link copiado para area de transferencia' : 'Copiar link compartilhavel'}>
            {shareCopied ? 'Link copiado!' : 'Compartilhar'}
          </button>
        </div>
      </div>
    </section>
  );
}
