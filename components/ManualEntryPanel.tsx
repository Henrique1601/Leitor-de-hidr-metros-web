'use client';

import { memo, useState } from 'react';

export interface ManualEntry {
  id: string;
  apartamento: string;
  indice: string;
}

interface ManualEntryPanelProps {
  enabled: boolean;
  entries: ManualEntry[];
  onAdd: (entry: ManualEntry) => void;
  onRemove: (id: string) => void;
}

function ManualEntryPanelInner({ enabled, entries, onAdd, onRemove }: ManualEntryPanelProps) {
  const [apt, setApt] = useState('');
  const [indice, setIndice] = useState('');

  if (!enabled) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = apt.trim();
    const i = indice.trim();
    if (!a || !i) return;
    onAdd({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), apartamento: a, indice: i });
    setApt('');
    setIndice('');
  }

  return (
    <section className="panel" aria-label="Entrada manual de indices">
      <div className="panel-title">Entrada manual</div>
      <p className="hint" style={{ marginBottom: 12 }}>
        Digite o numero do apartamento e o indice do hidrometro. Estes dados serao adicionados aos resultados junto com as leituras por OCR.
      </p>
      <form className="manual-entry-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="manual-apt">Apartamento</label>
          <input
            id="manual-apt"
            type="text"
            placeholder="ex: 101"
            value={apt}
            onChange={(e) => setApt(e.target.value)}
            className="mono"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="manual-idx">Indice</label>
          <input
            id="manual-idx"
            type="text"
            placeholder="ex: 12345"
            value={indice}
            onChange={(e) => setIndice(e.target.value)}
            className="mono"
            required
          />
        </div>
        <button type="submit" className="primary" style={{ alignSelf: 'flex-end' }}>
          Adicionar
        </button>
      </form>
      {entries.length > 0 && (
        <div className="manual-entries-list">
          {entries.map((e) => (
            <div key={e.id} className="manual-entry-row">
              <span className="mono">{e.apartamento}</span>
              <span className="mono">{e.indice}</span>
              <button
                type="button"
                className="history-delete"
                onClick={() => onRemove(e.id)}
                title="Remover"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(ManualEntryPanelInner);
