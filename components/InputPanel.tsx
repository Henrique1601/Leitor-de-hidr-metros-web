'use client';

interface InputPanelProps {
  chatFile: File | null;
  photoFiles: File[];
  dateStart: string;
  dateEnd: string;
  processing: boolean;
  onChatFileChange: (file: File | null) => void;
  onPhotoFilesChange: (files: File[]) => void;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;
  onProcess: () => void;
  onCancel: () => void;
}

export default function InputPanel({
  chatFile,
  photoFiles,
  dateStart,
  dateEnd,
  processing,
  onChatFileChange,
  onPhotoFilesChange,
  onDateStartChange,
  onDateEndChange,
  onProcess,
  onCancel,
}: InputPanelProps) {
  const canProcess = chatFile && photoFiles.length > 0 && !processing;

  return (
    <section className="panel">
      <div className="panel-title">Entrada</div>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="dropzone">
          <div>
            <label>Conversa exportada (.txt, com midia)</label>
            <div className="hint">{chatFile ? chatFile.name : 'Nenhum arquivo selecionado'}</div>
          </div>
          <input type="file" accept=".txt" onChange={(e) => onChatFileChange(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="dropzone">
          <div>
            <label>Pasta de fotos</label>
            <div className="hint">{photoFiles.length ? photoFiles.length + ' arquivo(s)' : 'Nenhuma pasta selecionada'}</div>
          </div>
          <input
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory=""
            onChange={(e) => onPhotoFilesChange(Array.from(e.target.files ?? []))}
          />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Data inicial (opcional)</label>
          <input type="date" value={dateStart} onChange={(e) => onDateStartChange(e.target.value)} />
        </div>
        <div className="field">
          <label>Data final (opcional)</label>
          <input type="date" value={dateEnd} onChange={(e) => onDateEndChange(e.target.value)} />
        </div>
      </div>
      <div className="button-row">
        <button className="primary" onClick={onProcess} disabled={!canProcess}>
          {processing ? 'Processando...' : 'Processar fotos'}
        </button>
        {processing && (
          <button className="danger" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </section>
  );
}
