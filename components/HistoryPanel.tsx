'use client';

import { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowsLeftRight, Trash, Download, Upload, FileXls, FilePdf, Buildings } from '@phosphor-icons/react';
import type { HistoryEntry } from '@/lib/history';
import { saveToHistory } from '@/lib/history';
import { exportBackup, importBackup } from '@/lib/backup';
import { parseXlsx } from '@/lib/importXlsx';
import { exportComparativo } from '@/lib/exportComparativo';
import type { BuildingState } from '@/lib/building';
import { getActiveBuilding } from '@/lib/building';

interface HistoryPanelProps {
  history: HistoryEntry[];
  selectedHistoryId: string | null;
  historyLabel: string;
  groupedRowsCount: number;
  buildingState: BuildingState;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onLabelChange: (label: string) => void;
  onHistoryChange: () => void;
}

export default function HistoryPanel({
  history,
  selectedHistoryId,
  historyLabel,
  groupedRowsCount,
  buildingState,
  onSelect,
  onDelete,
  onSave,
  onLabelChange,
  onHistoryChange,
}: HistoryPanelProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string>('all');

  const activeBuilding = getActiveBuilding(buildingState);

  const filteredHistory = useMemo(() => {
    if (filterBuilding === 'all') return history;
    if (filterBuilding === 'none') return history.filter((e) => !e.buildingId);
    return history.filter((e) => e.buildingId === filterBuilding);
  }, [history, filterBuilding]);

  const buildingNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const e of history) {
      if (e.buildingId && e.buildingName) names.set(e.buildingId, e.buildingName);
    }
    return names;
  }, [history]);

  const selectedEntry = history.find((e) => e.id === selectedHistoryId);
  const compareEntry = history.find((e) => e.id === compareId);

  function handleCompareToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setCompareId((prev) => (prev === id ? null : id));
  }

  function handleComparativo() {
    if (!selectedEntry || !compareEntry) return;
    const buildingName = selectedEntry.buildingName || compareEntry.buildingName;
    exportComparativo(
      { label: selectedEntry.label, rows: selectedEntry.rows },
      { label: compareEntry.label, rows: compareEntry.rows },
      buildingName
    );
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importBackup(file);
    if (result.errors.length > 0) {
      alert(`Importacao:\n- Importadas: ${result.imported}\n- Ignoradas (duplicadas): ${result.skipped}\n- Erros: ${result.errors.join('\n')}`);
    } else {
      alert(`Importacao concluida: ${result.imported} periodo(s) importado(s), ${result.skipped} ignorado(s) (duplicados)`);
    }
    onHistoryChange();
    if (importRef.current) importRef.current.value = '';
  }

  async function handleImportXlsx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const result = parseXlsx(buffer, historyLabel || file.name.replace(/\.\w+$/, ''));
    if (result.errors.length > 0) {
      alert(`Erros na importacao:\n${result.errors.join('\n')}`);
    }
    if (result.rows.length > 0) {
      saveToHistory(result.label, result.rows);
      onHistoryChange();
      alert(`${result.rows.length} leitura(s) importada(s) de "${result.label}"`);
    }
    if (xlsxRef.current) xlsxRef.current.value = '';
  }

  const showComparativo = selectedEntry && compareEntry && selectedEntry.id !== compareEntry.id;

  return (
    <section className="panel" aria-label="Historico de leituras">
      <div className="panel-title">Historico</div>
      {groupedRowsCount > 0 && (
        <div className="history-save">
          <input
            type="text"
            className="inline-edit"
            placeholder="Label (ex: Julho 2026)"
            value={historyLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            style={{ flex: 1 }}
            aria-label="Label do periodo"
          />
          <button className="secondary" onClick={onSave} aria-label="Salvar leitura no historico">
            Salvar no historico
          </button>
        </div>
      )}
      <div className="history-actions">
        <button className="secondary" onClick={exportBackup} aria-label="Exportar historico como backup">
          <Download size={14} weight="light" /> Exportar backup
        </button>
        <button className="secondary" onClick={() => importRef.current?.click()} aria-label="Importar backup de historico">
          <Upload size={14} weight="light" /> Importar backup
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
          aria-label="Selecionar arquivo de backup"
        />
        <button className="secondary" onClick={() => xlsxRef.current?.click()} aria-label="Importar leituras de planilha">
          <FileXls size={14} weight="light" /> Importar XLSX
        </button>
        <input
          ref={xlsxRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleImportXlsx}
          style={{ display: 'none' }}
          aria-label="Selecionar planilha XLSX ou CSV"
        />
      </div>
      {showComparativo && (
        <div className="history-actions">
          <button className="primary" onClick={handleComparativo} aria-label="Gerar PDF comparativo entre os dois periodos selecionados">
            Comparar {selectedEntry.label} vs {compareEntry.label} (PDF)
          </button>
        </div>
      )}
      {history.length > 0 && (
        <>
          {buildingNames.size > 0 && (
            <div className="history-filter">
              <label className="history-filter-label">
                <Buildings size={14} weight="light" />
                <select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  className="history-filter-select"
                >
                  <option value="all">Todos os predios</option>
                  {Array.from(buildingNames.entries()).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                  <option value="none">Sem predio</option>
                </select>
              </label>
            </div>
          )}
          <div className="history-list">
            <div className="history-item header">
              <span>Periodo</span>
              <span>Predio</span>
              <span>Data</span>
              <span>Apts</span>
              <span title="Selecionar para comparar">Cmp</span>
            </div>
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((entry) => {
                const date = new Date(entry.date).toLocaleDateString('pt-BR');
                const isSelected = selectedHistoryId === entry.id;
                const isCompare = compareId === entry.id;
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={'history-item' + (isSelected ? ' selected' : '') + (isCompare ? ' compare' : '')}
                    onClick={() => onSelect(isSelected ? null : entry.id)}
                  >
                    <span className="mono">{entry.label}</span>
                    <span className="history-building">{entry.buildingName || '—'}</span>
                    <span className="history-date">{date}</span>
                    <span>{entry.rows.length}</span>
                    <button
                      className={'history-compare' + (isCompare ? ' active' : '')}
                      onClick={(e) => handleCompareToggle(e, entry.id)}
                      title="Selecionar para comparar"
                    >
                      {isCompare ? <Check size={14} weight="bold" /> : <ArrowsLeftRight size={14} weight="light" />}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
      {selectedHistoryId && (
        <div className="history-hint">Consumo calculado em relacao ao periodo selecionado acima</div>
      )}
    </section>
  );
}
