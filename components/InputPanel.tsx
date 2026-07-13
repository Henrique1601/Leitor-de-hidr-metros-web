'use client';

import { memo, useMemo } from 'react';
import { BuildingState, getActiveBuilding, totalApts } from '@/lib/building';

interface InputPanelProps {
  chatFile: File | null;
  photoFiles: File[];
  dateStart: string;
  dateEnd: string;
  processing: boolean;
  manualEntryEnabled: boolean;
  offlineMode: boolean;
  buildingState: BuildingState;
  onChatFileChange: (file: File | null) => void;
  onPhotoFilesChange: (files: File[]) => void;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;
  onProcess: () => void;
  onCancel: () => void;
  onManualEntryToggle: (enabled: boolean) => void;
  onOfflineModeToggle: (enabled: boolean) => void;
}

function InputPanelInner({
  chatFile,
  photoFiles,
  dateStart,
  dateEnd,
  processing,
  manualEntryEnabled,
  offlineMode,
  buildingState,
  onChatFileChange,
  onPhotoFilesChange,
  onDateStartChange,
  onDateEndChange,
  onProcess,
  onCancel,
  onManualEntryToggle,
  onOfflineModeToggle,
}: InputPanelProps) {
  const canProcess = useMemo(() => chatFile && photoFiles.length > 0 && !processing, [chatFile, photoFiles, processing]);
  const activeBuilding = getActiveBuilding(buildingState);

  return (
    <section className="panel" aria-label="Entrada de dados">
      <div className="panel-title">Entrada</div>
      {activeBuilding && (
        <div className="building-context-bar">
          <span className="building-context-icon">🏢</span>
          <span className="building-context-text">
            {activeBuilding.nome}{' '}
            <span className="building-context-detail">
              · {activeBuilding.blocos.length} {activeBuilding.blocos.length === 1 ? 'bloco' : 'blocos'} · {totalApts(activeBuilding)} {totalApts(activeBuilding) === 1 ? 'apartamento' : 'apartamentos'}
            </span>
          </span>
        </div>
      )}
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="dropzone">
          <div>
            <label htmlFor="chat-file">Conversa exportada (.txt, com midia)</label>
            <div className="hint">{chatFile ? chatFile.name : 'Nenhum arquivo selecionado'}</div>
          </div>
          <input id="chat-file" type="file" accept=".txt" onChange={(e) => onChatFileChange(e.target.files?.[0] ?? null)} aria-describedby="chat-hint" />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="dropzone">
          <div>
            <label htmlFor="photo-files">Pasta de fotos</label>
            <div className="hint" id="photo-hint">{photoFiles.length ? photoFiles.length + ' arquivo(s)' : 'Nenhuma pasta selecionada'}</div>
          </div>
          <input
            id="photo-files"
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory=""
            onChange={(e) => onPhotoFilesChange(Array.from(e.target.files ?? []))}
            aria-describedby="photo-hint"
          />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 20 }}>
        <div className="field">
          <label htmlFor="date-start">Data inicial (opcional)</label>
          <input id="date-start" type="date" value={dateStart} onChange={(e) => onDateStartChange(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="date-end">Data final (opcional)</label>
          <input id="date-end" type="date" value={dateEnd} onChange={(e) => onDateEndChange(e.target.value)} />
        </div>
      </div>
      <div className="button-row">
        <button className="primary" onClick={onProcess} disabled={!canProcess} aria-label={processing ? 'Processando fotos...' : 'Processar fotos'}>
          {processing ? 'Processando...' : offlineMode ? 'Processar offline' : 'Processar fotos'}
        </button>
        {processing && (
          <button className="danger" onClick={onCancel} aria-label="Cancelar processamento">
            Cancelar
          </button>
        )}
        <label className="toggle-label" title="Ativar entrada manual de indices">
          <span className="toggle-switch">
            <input
              type="checkbox"
              checked={manualEntryEnabled}
              onChange={(e) => onManualEntryToggle(e.target.checked)}
              aria-label="Ativar entrada manual"
            />
            <span className="toggle-track" />
          </span>
          <span className="toggle-text">Entrada manual</span>
        </label>
        <label className="toggle-label" title="Modo offline — processa fotos localmente sem enviar para API">
          <span className="toggle-switch">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => onOfflineModeToggle(e.target.checked)}
              aria-label="Modo offline"
            />
            <span className="toggle-track" />
          </span>
          <span className="toggle-text">Offline</span>
        </label>
      </div>
    </section>
  );
}

export default memo(InputPanelInner);
