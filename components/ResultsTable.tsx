'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, X, Drop, List, ArrowClockwise, CheckCircle, Hourglass } from '@phosphor-icons/react';
import type { GroupedRow } from '@/lib/results';
import type { ColumnDef } from '@/lib/columns';
import { TarifaConfig, calcularTarifa, formatarMoeda } from '@/lib/tarifa';
import { BuildingState, getActiveBuilding } from '@/lib/building';

type ConfFilter = 'todos' | 'alta' | 'media' | 'baixa' | 'pendente';

interface ResultsTableProps {
  groupedRows: GroupedRow[];
  tarifaConfig: TarifaConfig;
  photoPreviewMap: Map<string, string>;
  editingCell: { apt: string; field: string } | null;
  editValue: string;
  columns: ColumnDef[];
  buildingState: BuildingState;
  onColumnsChange: (columns: ColumnDef[]) => void;
  onEdit: (apt: string, field: string, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onShare: () => void;
  shareCopied: boolean;
  onExportChanged?: () => void;
  onReprocess?: (apt: string) => void;
  onReprocessLowConfidence?: () => void;
  onTogglePending?: (apt: string) => void;
  reprocessing?: Set<string>;
}

export default function ResultsTable({
  groupedRows,
  tarifaConfig,
  photoPreviewMap,
  editingCell,
  editValue,
  columns,
  buildingState,
  onColumnsChange,
  onEdit,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onExport,
  onExportPdf,
  onExportCsv,
  onShare,
  shareCopied,
  onExportChanged,
  onReprocess,
  onReprocessLowConfidence,
  onTogglePending,
  reprocessing,
}: ResultsTableProps) {
  const [showColPicker, setShowColPicker] = useState(false);
  const [confFilter, setConfFilter] = useState<ConfFilter>('todos');
  const hasActiveBuilding = !!getActiveBuilding(buildingState);

  const reviewCount = useMemo(
    () => groupedRows.filter((r) => r.confianca === 'baixa' || r.observacao.includes('DIVERGENCIA')).length,
    [groupedRows]
  );

  const lowCount = useMemo(
    () => groupedRows.filter((r) => r.confianca === 'baixa').length,
    [groupedRows]
  );

  const abnormalSet = useMemo(() => {
    const consumos = groupedRows
      .map((r) => {
        const cleaned = r.consumo.replace(/[^\d\-\.]/g, '');
        return parseFloat(cleaned);
      })
      .filter((v) => !isNaN(v) && v > 0);
    if (consumos.length < 3) return new Set<string>();
    const sorted = [...consumos].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const threshold = median * 2;
    return new Set(
      groupedRows
        .filter((r) => {
          const cleaned = r.consumo.replace(/[^\d\-\.]/g, '');
          const v = parseFloat(cleaned);
          return !isNaN(v) && v >= threshold;
        })
        .map((r) => r.apartamento)
    );
  }, [groupedRows]);

  const filteredRows = useMemo(() => {
    if (confFilter === 'todos') return groupedRows;
    if (confFilter === 'pendente') return groupedRows.filter((r) => r.pendente);
    return groupedRows.filter((r) => r.confianca === confFilter);
  }, [groupedRows, confFilter]);

  const vis = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const c of columns) m[c.id] = c.visible;
    if (hasActiveBuilding) m['bloco'] = true;
    return m;
  }, [columns, hasActiveBuilding]);

  function toggleCol(id: string) {
    onColumnsChange(columns.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  const filterButtons: { key: ConfFilter; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: groupedRows.length },
    { key: 'alta', label: 'Alta', count: groupedRows.filter((r) => r.confianca === 'alta').length },
    { key: 'media', label: 'Media', count: groupedRows.filter((r) => r.confianca === 'media').length },
    { key: 'baixa', label: 'Baixa', count: groupedRows.filter((r) => r.confianca === 'baixa').length },
    { key: 'pendente', label: 'Pendente', count: groupedRows.filter((r) => r.pendente).length },
  ];

  return (
    <section className="panel" aria-label="Resultados por apartamento">
      <div className="panel-title">Resultado por apartamento</div>

      <div className="conf-filter-row">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            className={`conf-filter-btn ${confFilter === f.key ? 'active' : ''}`}
            onClick={() => setConfFilter(f.key)}
          >
            {f.label}
            <span className="conf-filter-count">{f.count}</span>
          </button>
        ))}
        {onReprocessLowConfidence && lowCount > 0 && (
          <button
            className="secondary reprocess-all-btn"
            onClick={onReprocessLowConfidence}
            title={`Reprocessar ${lowCount} foto(s) com confianca baixa`}
          >
            <ArrowClockwise size={14} weight="light" />
            Reprocessar baixas ({lowCount})
          </button>
        )}
      </div>

      <div className="col-picker-wrap">
        <button
          className="secondary col-picker-btn"
          onClick={() => setShowColPicker(!showColPicker)}
          aria-label="Mostrar ou esconder colunas"
        >
          <List size={14} weight="light" />
          Colunas
        </button>
        <AnimatePresence>
          {showColPicker && (
            <motion.div
              className="col-picker-dropdown"
              role="menu"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {columns.map((c) => (
                <label key={c.id} className="col-picker-item">
                  <input
                    type="checkbox"
                    checked={c.visible}
                    onChange={() => toggleCol(c.id)}
                    disabled={c.id === 'ape'}
                  />
                  <span>{c.header}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="table-wrap" role="region" aria-label="Tabela de leituras" tabIndex={0}>
        <table aria-label="Leituras de hidrometros por apartamento">
          <thead>
            <tr>
              {vis.ape && <th>Ape</th>}
              {vis.bloco && <th>Bloco</th>}
              {vis.indice && <th>Indice</th>}
              {vis.consumo && <th>Consumo</th>}
              {vis.alerta && <th className="th-validacao">Alerta</th>}
              {vis.valor && <th className="th-valor">Valor</th>}
              {vis.confianca && <th>Confianca</th>}
              {vis.observacao && <th>Observacao</th>}
              {vis.validacao && <th className="th-validacao">Validacao</th>}
              {vis.foto && <th className="th-preview">Foto</th>}
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const isDanger =
                r.observacao.includes('DIVERGENCIA') || (r.confianca === 'baixa' && r.observacao.includes('nao foi possivel'));
              const isLow = r.confianca === 'baixa' || r.confianca === 'media';
              const rowClass = r.pendente ? 'pendente' : isDanger ? 'danger' : isLow ? 'low' : '';
              const isEditing = editingCell?.apt === r.apartamento && editingCell?.field === 'indice';
              const firstFile = r.arquivos.split(', ')[0] || '';
              const thumbUrl = photoPreviewMap.get(firstFile);
              const isReprocessing = reprocessing?.has(r.apartamento);
              return (
                <tr key={r.apartamento} className={rowClass}>
                  {vis.ape && <td className="mono">{r.apartamento}</td>}
                  {vis.bloco && <td className="mono">{r.bloco}</td>}
                  {vis.indice && (
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
                  )}
                  {vis.consumo && (
                    <td className="mono">
                      {r.consumo ? (
                        <span className={r.consumo.startsWith('⚠') ? 'consumo-negativo' : 'consumo'}>{r.consumo}</span>
                      ) : (
                        '---'
                      )}
                    </td>
                  )}
                  {vis.alerta && (
                    <td className="td-validacao">
                      {abnormalSet.has(r.apartamento) && (
                        <span className="badge-alerta" title="Consumo anormal — 2x acima da media (possivel vazamento)">
                          <Drop size={14} weight="fill" className="icon-warn" />
                        </span>
                      )}
                    </td>
                  )}
                  {vis.valor && (
                    <td className="td-valor mono">
                      {r.consumo && tarifaConfig.faixas.length > 0 ? (() => {
                        const cleaned = r.consumo.replace(/[^\d\-\.]/g, '');
                        const consumo = parseFloat(cleaned);
                        if (isNaN(consumo) || consumo <= 0) return '---';
                        return formatarMoeda(calcularTarifa(consumo, tarifaConfig));
                      })() : '---'}
                    </td>
                  )}
                  {vis.confianca && (
                    <td>
                      <span className={'badge ' + r.confianca.toLowerCase()}>{r.confianca}</span>
                    </td>
                  )}
                  {vis.observacao && <td>{r.observacao || '---'}</td>}
                  {vis.validacao && (
                    <td className="td-validacao">
                      {r.validacao && (
                        <span className="badge-validacao" title={r.validacao}>
                          <Warning
                            size={16}
                            weight="fill"
                            className={r.validacao.includes('critico') ? 'icon-danger' : 'icon-warn'}
                          />
                        </span>
                      )}
                    </td>
                  )}
                  {vis.foto && (
                    <td className="td-preview">
                      {thumbUrl && (
                        <div className="thumb-wrap">
                          <img src={thumbUrl} alt="" className="thumb" loading="lazy" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="td-actions">
                    {onTogglePending && (
                      <button
                        className={`action-btn ${r.pendente ? 'pending-active' : ''}`}
                        onClick={() => onTogglePending(r.apartamento)}
                        title={r.pendente ? 'Marcar como lido' : 'Marcar como pendente'}
                      >
                        {r.pendente ? <Hourglass size={14} weight="fill" /> : <CheckCircle size={14} weight="light" />}
                      </button>
                    )}
                    {onReprocess && firstFile && (
                      <button
                        className="action-btn"
                        onClick={() => onReprocess(r.apartamento)}
                        disabled={isReprocessing}
                        title="Reprocessar foto deste apartamento"
                      >
                        <ArrowClockwise size={14} weight="light" className={isReprocessing ? 'spin' : ''} />
                      </button>
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
          <strong>{groupedRows.length}</strong> apartamentos · <strong>{reviewCount}</strong> para revisar{abnormalSet.size > 0 && <> · <strong>{abnormalSet.size}</strong> consumo anormal</>}
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
          {onExportChanged && (
            <button className="secondary" onClick={onExportChanged} aria-label="Exportar apenas apartamentos que mudaram">
              Alterados
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
