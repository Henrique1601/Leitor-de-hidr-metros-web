'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { parseChat, PhotoIndexRow } from '@/lib/parseChat';
import { groupByApartment, ExtractResult, GroupedRow } from '@/lib/results';
import { getCachedResult, setCachedResult } from '@/lib/cache';
import { acquireSlot, releaseSlot } from '@/lib/rateLimit';
import { getHistory, saveToHistory, deleteFromHistory, getPreviousIndices, HistoryEntry } from '@/lib/history';
import { exportPdf } from '@/lib/exportPdf';
import { copyShareLink, decodeShareUrl } from '@/lib/shareLink';
import InputPanel from '@/components/InputPanel';
import ProgressBar from '@/components/ProgressBar';
import SkeletonLoading from '@/components/SkeletonLoading';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTheme } from '@/components/ThemeProvider';

const ResultsTable = dynamic(() => import('@/components/ResultsTable'), { ssr: false });

const CONCURRENCY = 3;
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
      if (!ctx) return reject(new Error('canvas indisponivel'));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('falha ao carregar imagem'));
    };
    img.src = url;
  });
}

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // silent
  }
}

function fileToKey(f: File): string {
  return f.name + '__' + f.size;
}

function readEntryRecursive(entry: FileSystemEntry, acc: File[]) {
  if (entry.isFile) {
    (entry as FileSystemFileEntry).file((f) => acc.push(f));
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    reader.readEntries((entries) => {
      for (const e of entries) readEntryRecursive(e, acc);
    });
  }
}

function classifyFiles(files: File[], setChatFile: (f: File | null) => void, setPhotoFiles: React.Dispatch<React.SetStateAction<File[]>>) {
  const txt = files.find((f) => f.name.endsWith('.txt'));
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (txt) setChatFile(txt);
  if (images.length > 0) {
    setPhotoFiles((prev) => {
      const existing = new Set(prev.map(fileToKey));
      const merged = [...prev];
      for (const img of images) {
        if (!existing.has(fileToKey(img))) merged.push(img);
      }
      return merged;
    });
  }
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
  const [editingCell, setEditingCell] = useState<{ apt: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [sharedResults, setSharedResults] = useState<GroupedRow[] | null>(null);
  const [historyLabel, setHistoryLabel] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [sharedLabel, setSharedLabel] = useState('');
  const cancelRef = useRef(false);
  const photoMapRef = useRef<Map<string, File>>(new Map());
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = decodeShareUrl(window.location.hash);
    if (payload && payload.rows.length > 0) {
      setSharedResults(payload.rows);
      setSharedLabel(payload.label);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const previousIndices = useMemo(() => {
    if (!selectedHistoryId) return undefined;
    return getPreviousIndices(selectedHistoryId) ?? undefined;
  }, [selectedHistoryId]);

  const groupedRows = useMemo(() => {
    if (sharedResults) return sharedResults;
    return groupByApartment(results, previousIndices);
  }, [results, previousIndices, sharedResults]);

  const photoPreviewMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of photoFiles) {
      m.set(fileToKey(f), URL.createObjectURL(f));
    }
    return m;
  }, [photoFiles]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        readEntryRecursive(entry, files);
      } else {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    setTimeout(() => classifyFiles(files, setChatFile, setPhotoFiles), 0);
  }, [setChatFile, setPhotoFiles]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  async function handleProcess() {
    if (!chatFile || photoFiles.length === 0) return;
    setProcessing(true);
    setResults([]);
    setDone(0);
    cancelRef.current = false;

    const chatText = await chatFile.text();
    const index: PhotoIndexRow[] = parseChat(chatText, dateStart || undefined, dateEnd || undefined);
    photoMapRef.current = new Map(photoFiles.map((f) => [f.name, f]));
    const workload = index.filter((row) => photoMapRef.current.has(row.arquivo));
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
        const file = photoMapRef.current.get(row.arquivo)!;
        const cached = await getCachedResult(file);
        if (cached) {
          setResults((prev) => [
            ...prev,
            { arquivo: cached.arquivo, apartamentosEsperados: cached.apartamentosEsperados, medidores: cached.medidores },
          ]);
          setDone((d) => d + 1);
          continue;
        }
        await acquireSlot();
        try {
          const { base64, mediaType } = await compressImage(file);
          const resp = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arquivo: row.arquivo, apartamentos: row.apartamentos, imageBase64: base64, mediaType }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            setResults((prev) => [
              ...prev,
              { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: data.erro },
            ]);
          } else {
            await setCachedResult(file, {
              arquivo: data.arquivo,
              apartamentosEsperados: data.apartamentosEsperados,
              medidores: data.medidores,
            });
            setResults((prev) => [...prev, data]);
          }
        } catch (e: any) {
          setResults((prev) => [
            ...prev,
            { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: e?.message },
          ]);
        } finally {
          releaseSlot();
        }
        setDone((d) => d + 1);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setProcessing(false);
    if (!cancelRef.current) {
      playDoneSound();
    }
  }

  function handleSaveHistory() {
    if (groupedRows.length === 0) return;
    const label = historyLabel.trim() || new Date().toLocaleDateString('pt-BR');
    saveToHistory(label, groupedRows);
    setHistory(getHistory());
    setHistoryLabel('');
  }

  function handleDeleteHistory(id: string) {
    deleteFromHistory(id);
    setHistory(getHistory());
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
  }

  function handleEdit(apt: string, field: string, currentValue: string) {
    setEditingCell({ apt, field });
    setEditValue(currentValue);
  }

  function commitEdit() {
    if (!editingCell) return;
    setResults((prev) => {
      const updated = prev.map((r) => {
        if (!r.apartamentosEsperados.includes(editingCell.apt)) return r;
        const idx = r.apartamentosEsperados.indexOf(editingCell.apt);
        if (!r.medidores[idx]) return r;
        const parts = editValue.split(',');
        return {
          ...r,
          medidores: r.medidores.map((m, i) =>
            i === idx
              ? {
                  ...m,
                  indiceInteiro: parts[0] || editValue,
                  indiceDecimal: parts[1] || '',
                  confianca: 'alta' as const,
                  observacao: 'Corrigido manualmente',
                }
              : m
          ),
        };
      });
      return updated;
    });
    setEditingCell(null);
  }

  const handleExport = useCallback(() => {
    const rows = groupedRows.map((r) => ({
      Apartamento: r.apartamento,
      Indice: r.indice,
      Consumo: r.consumo,
      Confianca: r.confianca,
      Observacao: r.observacao,
      'Arquivo(s)': r.arquivos,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 45 }, { wch: 45 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leituras');
    XLSX.writeFile(wb, 'leituras_hidrometros_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }, [groupedRows]);

  const handleExportPdf = useCallback(() => {
    exportPdf(groupedRows, sharedLabel || historyLabel || undefined);
  }, [groupedRows, sharedLabel, historyLabel]);

  const handleShare = useCallback(async () => {
    const label = sharedLabel || historyLabel || new Date().toLocaleDateString('pt-BR');
    const ok = await copyShareLink(groupedRows, label);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [groupedRows, sharedLabel, historyLabel]);

  return (
    <ErrorBoundary>
      <button className="theme-toggle" onClick={toggle} title="Alternar tema" aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <main
        className={'shell' + (dragOver ? ' drag-active' : '')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOver && <div className="drag-overlay">Solte os arquivos aqui</div>}

        <div className="hero">
          <span className="hero-mark" />
          <h1>Leitor de Hidrometros</h1>
        </div>
        <p className="subtitle">Fotos do WhatsApp - indice de cada apartamento - planilha, sem digitar nada na mao.</p>

        <InputPanel
          chatFile={chatFile}
          photoFiles={photoFiles}
          dateStart={dateStart}
          dateEnd={dateEnd}
          processing={processing}
          onChatFileChange={setChatFile}
          onPhotoFilesChange={setPhotoFiles}
          onDateStartChange={setDateStart}
          onDateEndChange={setDateEnd}
          onProcess={handleProcess}
          onCancel={handleCancel}
        />

        {processing && total === 0 && <SkeletonLoading />}

        {(processing || total > 0) && <ProgressBar done={done} total={total} />}

        {groupedRows.length > 0 && (
          <>
            {sharedLabel && (
              <div className="shared-banner">
                Resultado compartilhado: <strong>{sharedLabel}</strong>
              </div>
            )}
            <ResultsTable
              groupedRows={groupedRows}
              photoPreviewMap={photoPreviewMap}
              editingCell={editingCell}
              editValue={editValue}
              onEdit={handleEdit}
              onEditValueChange={setEditValue}
              onCommitEdit={commitEdit}
              onCancelEdit={() => setEditingCell(null)}
              onExport={handleExport}
              onExportPdf={handleExportPdf}
              onShare={handleShare}
              shareCopied={shareCopied}
            />
          </>
        )}

        {groupedRows.length > 0 && (
          <section className="panel" aria-label="Historico de leituras">
            <div className="panel-title">Historico</div>
            <div className="history-save">
              <input
                type="text"
                className="inline-edit"
                placeholder="Label (ex: Julho 2026)"
                value={historyLabel}
                onChange={(e) => setHistoryLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveHistory();
                }}
                style={{ flex: 1 }}
                aria-label="Label do periodo"
              />
              <button className="secondary" onClick={handleSaveHistory} aria-label="Salvar leitura no historico">
                Salvar no historico
              </button>
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
                      onClick={() => setSelectedHistoryId(isSelected ? null : entry.id)}
                    >
                      <span className="mono">{entry.label}</span>
                      <span className="history-date">{date}</span>
                      <span>{entry.rows.length}</span>
                      <button
                        className="history-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(entry.id);
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
        )}
      </main>
    </ErrorBoundary>
  );
}
