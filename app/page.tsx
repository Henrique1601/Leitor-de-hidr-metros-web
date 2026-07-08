'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { parseChat, PhotoIndexRow } from '@/lib/parseChat';
import { groupByApartment, ExtractResult } from '@/lib/results';

const CONCURRENCY = 4;
const MAX_DIM = 1600;

function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas indisponível'));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Home() {
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<ExtractResult[]>([]);
  const cancelRef = useRef(false);

  const groupedRows = useMemo(() => groupByApartment(results), [results]);

  async function handleProcess() {
    if (!chatFile || photoFiles.length === 0) return;
    setProcessing(true);
    setResults([]);
    setDone(0);
    cancelRef.current = false;

    const chatText = await chatFile.text();
    const index: PhotoIndexRow[] = parseChat(chatText, dateStart || undefined, dateEnd || undefined);
    const photoMap = new Map(photoFiles.map((f) => [f.name, f]));
    const workload = index.filter((row) => photoMap.has(row.arquivo));
    setTotal(workload.length);

    let cursor = 0;
    async function worker() {
      while (cursor < workload.length && !cancelRef.current) {
        const row = workload[cursor];
        cursor += 1;
        if (row.flags.includes('sem_acesso')) {
          setResults((prev) => [
            ...prev,
            { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], semAcesso: true },
          ]);
          setDone((d) => d + 1);
          continue;
        }
        const file = photoMap.get(row.arquivo)!;
        try {
          const { base64, mediaType } = await compressImage(file);
          const resp = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              arquivo: row.arquivo,
              apartamentos: row.apartamentos,
              imageBase64: base64,
              mediaType,
            }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            setResults((prev) => [
              ...prev,
              { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: data.erro },
            ]);
          } else {
            setResults((prev) => [...prev, data]);
          }
        } catch (e: any) {
          setResults((prev) => [
            ...prev,
            { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: e?.message },
          ]);
        }
        setDone((d) => d + 1);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setProcessing(false);
  }

  function handleExport() {
    const rows = groupedRows.map((r) => ({
      Apartamento: r.apartamento,
      Índice: r.indice,
      Confiança: r.confianca,
      Observação: r.observacao,
      'Arquivo(s)': r.arquivos,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 45 }, { wch: 45 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leituras');
    XLSX.writeFile(wb, `leituras_hidrometros_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const reviewCount = groupedRows.filter(
    (r) => r.confianca === 'baixa' || r.observacao.includes('DIVERGÊNCIA')
  ).length;

  return (
    <main className="shell">
      <div className="hero">
        <span className="hero-mark" />
        <h1>Leitor de Hidrômetros</h1>
      </div>
      <p className="subtitle">Fotos do WhatsApp → índice de cada apartamento → planilha, sem digitar nada na mão.</p>

      <section className="panel">
        <div className="panel-title">Entrada</div>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="dropzone">
            <div>
              <label>Conversa exportada (.txt, com mídia)</label>
              <div className="hint">{chatFile ? chatFile.name : 'Nenhum arquivo selecionado'}</div>
            </div>
            <input type="file" accept=".txt" onChange={(e) => setChatFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="dropzone">
            <div>
              <label>Pasta de fotos</label>
              <div className="hint">{photoFiles.length ? `${photoFiles.length} arquivo(s)` : 'Nenhuma pasta selecionada'}</div>
            </div>
            <input
              type="file"
              multiple
              // @ts-ignore - atributo não tipado, mas suportado pelos navegadores
              webkitdirectory=""
              onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
            />
          </div>
        </div>
        <div className="row" style={{ marginBottom: 20 }}>
          <div className="field">
            <label>Data inicial (opcional)</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </div>
          <div className="field">
            <label>Data final (opcional)</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </div>
        </div>
        <button className="primary" onClick={handleProcess} disabled={!chatFile || photoFiles.length === 0 || processing}>
          {processing ? 'Processando…' : 'Processar fotos'}
        </button>
      </section>

      {(processing || total > 0) && (
        <section className="panel">
          <div className="panel-title">Progresso</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-label">
            <span>{done} de {total} fotos</span>
            <span>{pct}%</span>
          </div>
        </section>
      )}

      {groupedRows.length > 0 && (
        <section className="panel">
          <div className="panel-title">Resultado por apartamento</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Apê</th>
                  <th>Índice</th>
                  <th>Confiança</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((r) => {
                  const rowClass = r.observacao.includes('DIVERGÊNCIA') || r.confianca === 'baixa' && r.observacao.includes('não foi possível')
                    ? 'danger'
                    : r.confianca === 'baixa' || r.confianca === 'media'
                    ? 'low'
                    : '';
                  return (
                    <tr key={r.apartamento} className={rowClass}>
                      <td className="mono">{r.apartamento}</td>
                      <td className="mono">{r.indice || '—'}</td>
                      <td><span className={`badge ${r.confianca.toLowerCase()}`}>{r.confianca}</span></td>
                      <td>{r.observacao || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="footer-actions">
            <span className="stat"><strong>{groupedRows.length}</strong> apartamentos · <strong>{reviewCount}</strong> para revisar</span>
            <button className="secondary" onClick={handleExport}>Exportar XLSX</button>
          </div>
        </section>
      )}
    </main>
  );
}
