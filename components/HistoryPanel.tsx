'use client';

import { useRef } from 'react';
import type { HistoryEntry } from '@/lib/history';
import { saveToHistory } from '@/lib/history';
import { exportBackup, importBackup } from '@/lib/backup';
import { parseXlsx } from '@/lib/importXlsx';

interface HistoryPanelProps {
  history: HistoryEntry[];
  selectedHistoryId: string | null;
  historyLabel: string;
  groupedRowsCount: number;
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
  onSelect,
  onDelete,
  onSave,
  onLabelChange,
  onHistoryChange,
}: HistoryPanelProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

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
          Exportar backup
        </button>
        <button className="secondary" onClick={() => importRef.current?.click()} aria-label="Importar backup de historico">
          Importar backup
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
          Importar XLSX
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
      {history.length > 0 && (
        <div className="history-list">
          <div className="history-item header">
            <span>Periodo</span>
            <span>Data</span>
            <span>Apts</span>
            <span></span>
          </div>
          {history.map((entry) => {
            const date = new Date(entry.date).toLocaleDateString('pt-BR');
            const isSelected = selectedHistoryId === entry.id;
            return (
              <div
                key={entry.id}
                className={'history-item' + (isSelected ? ' selected' : '')}
                onClick={() => onSelect(isSelected ? null : entry.id)}
              >
                <span className="mono">{entry.label}</span>
                <span className="history-date">{date}</span>
                <span>{entry.rows.length}</span>
                <button
                  className="history-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  title="Remover"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      {selectedHistoryId && (
        <div className="history-hint">Consumo calculado em relacao ao periodo selecionado acima</div>
      )}
    </section>
  );
}
