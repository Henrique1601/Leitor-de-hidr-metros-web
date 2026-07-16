'use client'

import { useState } from 'react'
import { X, Trash } from '@phosphor-icons/react'
import { Building, Bloco, Andar, BuildingState, createBuildingLocal, updateBuildingLocal, deleteBuildingApi, createBuildingApi, updateBuildingApi, seedBuildings, totalApts, generateApts, fetchBuildings } from '@/lib/building'

interface Props {
  state: BuildingState;
  onChange: (state: BuildingState) => void;
  onClose: () => void;
}

type View = 'list' | 'edit';

export default function BuildingManager({ state, onChange, onClose }: Props) {
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<Building | null>(null);
  const [draft, setDraft] = useState<Building | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeedNamed(namedSeed: string) {
    setSeeding(true);
    try {
      const res = await fetch('/api/buildings/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namedSeed }),
      });
      const data = await res.json();
      if (data.ok) {
        const buildings = await fetchBuildings();
        const activeId = buildings.length > 0 ? buildings[0].id : null;
        onChange({ buildings, activeBuildingId: activeId });
      }
    } catch { /* ignore */ }
    setSeeding(false);
  }

  function handleNew() {
    const b = createBuildingLocal('Novo Prédio');
    setEditing(b);
    setDraft(b);
    setView('edit');
  }

  function handleEdit(building: Building) {
    setEditing(building);
    setDraft({ ...building, blocos: building.blocos.map((bl) => ({ ...bl, andares: bl.andares.map((a) => ({ ...a, apts: [...a.apts] })) })) });
    setView('edit');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este prédio?')) return;
    try {
      await deleteBuildingApi(id);
    } catch { /* ignore */ }
    const buildings = state.buildings.filter((b) => b.id !== id);
    const activeBuildingId = state.activeBuildingId === id ? (buildings[0]?.id ?? null) : state.activeBuildingId;
    onChange({ buildings, activeBuildingId });
  }

  async function handleSave() {
    if (!draft) return;
    const isNew = !state.buildings.find((b) => b.id === draft.id);
    try {
      if (isNew) {
        await createBuildingApi(draft.nome, draft.blocos);
      } else {
        await updateBuildingApi(draft, { blocos: draft.blocos, nome: draft.nome });
      }
    } catch { /* ignore */ }
    let buildings: Building[];
    if (isNew) {
      buildings = [...state.buildings, draft];
    } else {
      buildings = state.buildings.map((b) => (b.id === draft.id ? draft : b));
    }
    const activeBuildingId = state.activeBuildingId ?? (isNew ? draft.id : state.activeBuildingId);
    onChange({ buildings, activeBuildingId });
    setView('list');
    setEditing(null);
    setDraft(null);
  }

  function handleCancel() {
    setView('list');
    setEditing(null);
    setDraft(null);
  }

  function updateDraft(patch: Partial<Building>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
  }

  function addBloco() {
    if (!draft) return;
    const bloco: Bloco = { id: crypto.randomUUID(), nome: String.fromCharCode(65 + draft.blocos.length), andares: [] };
    updateDraft({ blocos: [...draft.blocos, bloco] });
  }

  function removeBloco(blocoId: string) {
    if (!draft) return;
    updateDraft({ blocos: draft.blocos.filter((b) => b.id !== blocoId) });
  }

  function updateBloco(blocoId: string, patch: Partial<Bloco>) {
    if (!draft) return;
    updateDraft({ blocos: draft.blocos.map((b) => (b.id === blocoId ? { ...b, ...patch } : b)) });
  }

  function addAndar(blocoId: string) {
    if (!draft) return;
    const bloco = draft.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    const nextNum = bloco.andares.length > 0 ? Math.max(...bloco.andares.map((a) => a.numero)) + 1 : 1;
    const andar: Andar = { numero: nextNum, apts: generateApts(nextNum, 4, bloco.nome) };
    updateBloco(blocoId, { andares: [...bloco.andares, andar] });
  }

  function removeAndar(blocoId: string, andarNum: number) {
    if (!draft) return;
    const bloco = draft.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    updateBloco(blocoId, { andares: bloco.andares.filter((a) => a.numero !== andarNum) });
  }

  function updateAndarApts(blocoId: string, andarNum: number, quantidade: number) {
    if (!draft) return;
    const bloco = draft.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    const andar = bloco.andares.find((a) => a.numero === andarNum);
    if (!andar) return;
    const apts = generateApts(andarNum, Math.max(1, quantidade), bloco.nome);
    updateBloco(blocoId, { andares: bloco.andares.map((a) => (a.numero === andarNum ? { ...a, apts } : a)) });
  }

  return (
    <div className="building-manager-overlay" onClick={onClose}>
      <div className="building-manager" onClick={(e) => e.stopPropagation()}>
        <div className="building-manager-header">
          <h2>{view === 'list' ? 'Gerenciar Prédios' : (editing?.id && state.buildings.find((b) => b.id === editing.id) ? 'Editar Prédio' : 'Novo Prédio')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="building-manager-body">
          {view === 'list' ? (
            <div className="building-list">
              {state.buildings.length === 0 ? (
                <div className="building-list-empty">
                  <p>Nenhum prédio cadastrado.</p>
                  <p>Crie seu primeiro prédio para começar a gerenciar condomínios.</p>
                </div>
              ) : (
                state.buildings.map((b) => (
                  <div key={b.id} className={`building-card ${b.id === state.activeBuildingId ? 'active' : ''}`}>
                    <div className="building-card-info">
                      <h3>{b.nome}</h3>
                      <span className="building-card-meta">
                        {b.blocos.length} {b.blocos.length === 1 ? 'bloco' : 'blocos'} · {totalApts(b)} {totalApts(b) === 1 ? 'apartamento' : 'apartamentos'}
                      </span>
                    </div>
                    <div className="building-card-actions">
                      <button className="secondary small" onClick={() => handleEdit(b)}>Editar</button>
                      <button className="danger small" onClick={() => handleDelete(b.id)}>Excluir</button>
                    </div>
                  </div>
                ))
              )}
              <button className="primary" onClick={handleNew} disabled={seeding}>+ Novo prédio</button>
              <div className="building-dropdown-divider" style={{ margin: '8px 0' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prédios prontos:</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="secondary small" onClick={() => handleSeedNamed('luxor')} disabled={seeding}>Luxor &amp; Lutecia</button>
                <button className="secondary small" onClick={() => handleSeedNamed('acquaplay')} disabled={seeding}>Acquaplay</button>
              </div>
            </div>
          ) : draft && (
            <div className="building-form">
              <label>
                Nome do prédio
                <input
                  type="text"
                  value={draft.nome}
                  onChange={(e) => updateDraft({ nome: e.target.value })}
                  placeholder="Ex: Condomínio Vista Verde"
                />
              </label>

              <div className="building-blocos">
                {draft.blocos.map((bloco) => (
                  <div key={bloco.id} className="building-bloco">
                    <div className="building-bloco-header">
                      <input
                        type="text"
                        value={bloco.nome}
                        onChange={(e) => updateBloco(bloco.id, { nome: e.target.value })}
                        className="building-bloco-name"
                        placeholder="Nome do bloco"
                      />
                      <button className="icon-btn danger" onClick={() => removeBloco(bloco.id)} aria-label="Remover bloco">
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>

                    <div className="building-andares">
                      {bloco.andares.map((andar) => (
                        <div key={andar.numero} className="building-andar">
                          <span className="building-andar-label">Andar {andar.numero}</span>
                          <label className="building-andar-apts">
                            Apts:
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={andar.apts.length}
                              onChange={(e) => updateAndarApts(bloco.id, andar.numero, parseInt(e.target.value) || 1)}
                            />
                          </label>
                          <span className="building-andar-preview">
                            {andar.apts.slice(0, 3).join(', ')}{andar.apts.length > 3 ? '...' : ''}
                          </span>
                          <button className="icon-btn danger small" onClick={() => removeAndar(bloco.id, andar.numero)} aria-label={`Remover andar ${andar.numero}`}>
                            <X size={14} weight="bold" />
                          </button>
                        </div>
                      ))}
                      <button className="secondary small" onClick={() => addAndar(bloco.id)}>+ Andar</button>
                    </div>
                  </div>
                ))}
                <button className="secondary" onClick={addBloco}>+ Bloco</button>
              </div>
            </div>
          )}
        </div>

        {view === 'edit' && (
          <div className="building-manager-footer">
            <button className="secondary" onClick={handleCancel}>Cancelar</button>
            <button className="primary" onClick={handleSave}>Salvar</button>
          </div>
        )}
      </div>
    </div>
  );
}
