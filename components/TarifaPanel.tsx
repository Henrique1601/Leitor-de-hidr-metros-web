'use client';

import { useState } from 'react';
import { TarifaConfig, FaixaTarifa, getTarifaConfig, saveTarifaConfig, criarFaixaPadrao, formatarMoeda } from '@/lib/tarifa';

interface TarifaPanelProps {
  onConfigChange: (config: TarifaConfig) => void;
}

export default function TarifaPanel({ onConfigChange }: TarifaPanelProps) {
  const [config, setConfig] = useState<TarifaConfig>(() => getTarifaConfig());
  const [expanded, setExpanded] = useState(false);

  function updateFaixa(id: string, field: keyof FaixaTarifa, value: string | number | null) {
    setConfig((prev) => ({
      ...prev,
      faixas: prev.faixas.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  }

  function addFaixa() {
    const lastMax = config.faixas.length > 0 ? (config.faixas[config.faixas.length - 1].maxM3 ?? 0) + 1 : 0;
    const nova = criarFaixaPadrao();
    nova.minM3 = lastMax;
    nova.maxM3 = lastMax + 10;
    setConfig((prev) => ({ ...prev, faixas: [...prev.faixas, nova] }));
  }

  function removeFaixa(id: string) {
    setConfig((prev) => ({ ...prev, faixas: prev.faixas.filter((f) => f.id !== id) }));
  }

  function handleSave() {
    saveTarifaConfig(config);
    onConfigChange(config);
  }

  const temConfig = config.faixas.length > 0 || config.fixo > 0;

  return (
    <section className="panel" aria-label="Tarifa de agua">
      <div className="panel-title" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        Tarifa de agua {expanded ? '▲' : '▼'}
      </div>
      {expanded && (
        <div className="tarifa-content">
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="tarifa-fixo">Taxa fixa mensal (R$)</label>
            <input
              id="tarifa-fixo"
              type="number"
              min="0"
              step="0.01"
              value={config.fixo || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, fixo: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
              style={{ width: 120 }}
            />
          </div>
          <div className="tarifa-faixas">
            {config.faixas.map((faixa) => (
              <div key={faixa.id} className="tarifa-faixa-row">
                <input
                  type="number"
                  min="0"
                  value={faixa.minM3}
                  onChange={(e) => updateFaixa(faixa.id, 'minM3', parseInt(e.target.value) || 0)}
                  placeholder="Min m³"
                  style={{ width: 70 }}
                  aria-label="Minimo m3"
                />
                <span className="tarifa-sep">a</span>
                <input
                  type="number"
                  min="0"
                  value={faixa.maxM3 ?? ''}
                  onChange={(e) => updateFaixa(faixa.id, 'maxM3', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="∞"
                  style={{ width: 70 }}
                  aria-label="Maximo m3"
                />
                <span className="tarifa-sep">m³</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={faixa.valorPorM3 || ''}
                  onChange={(e) => updateFaixa(faixa.id, 'valorPorM3', parseFloat(e.target.value) || 0)}
                  placeholder="R$/m³"
                  style={{ width: 80 }}
                  aria-label="Valor por metro cubico"
                />
                <button className="history-delete" onClick={() => removeFaixa(faixa.id)} title="Remover faixa">
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={addFaixa} aria-label="Adicionar faixa de tarifa">
              + Adicionar faixa
            </button>
            <button className="primary" onClick={handleSave} aria-label="Salvar configuracao de tarifa">
              Salvar tarifa
            </button>
          </div>
          {temConfig && (
            <div className="tarifa-preview">
              <strong>Exemplo:</strong> Consumo de 25 m³ = {formatarMoeda(25)} (configurado)
            </div>
          )}
        </div>
      )}
    </section>
  );
}
