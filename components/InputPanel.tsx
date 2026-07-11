'use client';

import { memo, useMemo } from 'react';

interface InputPanelProps {
  chatFile: File | null;
  photoFiles: File[];
  dateStart: string;
  dateEnd: string;
  processing: boolean;
  manualEntryEnabled: boolean;
  onChatFileChange: (file: File | null) => void;
  onPhotoFilesChange: (files: File[]) => void;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;
  onProcess: () => void;
  onCancel: () => void;
  onManualEntryToggle: (enabled: boolean) => void;
}

function InputPanelInner({
  chatFile,
  photoFiles,
  dateStart,
  dateEnd,
  processing,
  manualEntryEnabled,
  onChatFileChange,
  onPhotoFilesChange,
  onDateStartChange,
  onDateEndChange,
  onProcess,
  onCancel,
  onManualEntryToggle,
}: InputPanelProps) {
  const canProcess = useMemo(() => chatFile && photoFiles.length > 0 && !processing, [chatFile, photoFiles, processing]);

  return (
    <section className="panel" aria-label="Entrada de dados">
      <div className="panel-title">Entrada</div>
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
          {processing ? 'Processando...' : 'Processar fotos'}
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
      </div>
    </section>
  );
}

export default memo(InputPanelInner);
