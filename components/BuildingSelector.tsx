'use client'

import { useState, useRef, useEffect } from 'react'
import { Building, BuildingState, getActiveBuilding, setActiveBuilding, saveBuildings } from '@/lib/building'

interface Props {
  state: BuildingState;
  onChange: (state: BuildingState) => void;
  onManage: () => void;
}

export default function BuildingSelector({ state, onChange, onManage }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = getActiveBuilding(state);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    const next = setActiveBuilding(state, id);
    saveBuildings(next);
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="building-selector" ref={ref}>
      <button
        className="building-selector-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Selecionar prédio"
        aria-expanded={open}
      >
        <span className="building-icon">🏢</span>
        <span className="building-name">{active?.nome ?? 'Nenhum prédio'}</span>
        <span className={`building-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="building-dropdown">
          {state.buildings.length === 0 ? (
            <div className="building-dropdown-empty">
              <span>Nenhum prédio cadastrado</span>
              <button className="primary small" onClick={() => { onManage(); setOpen(false); }}>
                Criar primeiro prédio
              </button>
            </div>
          ) : (
            <>
              {state.buildings.map((b) => (
                <button
                  key={b.id}
                  className={`building-dropdown-item ${b.id === state.activeBuildingId ? 'active' : ''}`}
                  onClick={() => handleSelect(b.id)}
                >
                  <span className="building-item-icon">🏢</span>
                  <span className="building-item-name">{b.nome}</span>
                  {b.id === state.activeBuildingId && <span className="building-item-check">✓</span>}
                </button>
              ))}
              <div className="building-dropdown-divider" />
              <button className="building-dropdown-manage" onClick={() => { onManage(); setOpen(false); }}>
                Gerenciar prédios...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
