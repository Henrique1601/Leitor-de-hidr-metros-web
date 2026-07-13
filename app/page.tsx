'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { parseChat, PhotoIndexRow } from '@/lib/parseChat';
import { groupByApartment, ExtractResult, GroupedRow } from '@/lib/results';
import { getCachedResult, setCachedResult } from '@/lib/cache';
import { acquireSlot, releaseSlot } from '@/lib/rateLimit';
import { getHistory, saveToHistory, deleteFromHistory, getPreviousIndices, HistoryEntry } from '@/lib/history';
import { getTarifaConfig, TarifaConfig, calcularTarifa } from '@/lib/tarifa';
import { loadColumns, saveColumns, ColumnDef } from '@/lib/columns';
import { extractLocal } from '@/lib/tesseractClient';
import { exportPdf } from '@/lib/exportPdf';
import { copyShareLink, decodeShareUrl } from '@/lib/shareLink';
import InputPanel from '@/components/InputPanel';
import ManualEntryPanel, { ManualEntry } from '@/components/ManualEntryPanel';
import HistoryPanel from '@/components/HistoryPanel';
import TarifaPanel from '@/components/TarifaPanel';
import ProgressBar from '@/components/ProgressBar';
import SkeletonLoading from '@/components/SkeletonLoading';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTheme } from '@/components/ThemeProvider';
import { Dashboard } from '@/components/Dashboard';
import ThemeSettingsPanel from '@/components/ThemeSettingsPanel';

const ResultsTable = dynamic(() => import('@/components/ResultsTable'), { ssr: false });

const CONCURRENCY = 2;
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
      const newImages: File[] = [];
      const candidatesByKey = new Map<string, File[]>();
      for (const img of images) {
        const key = fileToKey(img);
        if (!existing.has(key)) {
          const group = candidatesByKey.get(key) || [];
          group.push(img);
          candidatesByKey.set(key, group);
        }
      }
      for (const group of candidatesByKey.values()) {
        if (group.length === 1) {
          newImages.push(group[0]);
        } else {
          newImages.push(group[0]);
        }
      }
      return [...prev, ...newImages];
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
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState<number | null>(null);
  const [manualEntryEnabled, setManualEntryEnabled] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [tarifaConfig, setTarifaConfig] = useState<TarifaConfig>({ faixas: [], fixo: 0 });
  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumns());
  const cancelRef = useRef(false);
  const photoMapRef = useRef<Map<string, File>>(new Map());
  const { theme, resolvedTheme, settings, updateSettings } = useTheme();

  useEffect(() => {
    setHistory(getHistory());
    setTarifaConfig(getTarifaConfig());
  }, []);

  useEffect(() => {
    saveColumns(columns);
  }, [columns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('manualEntryEnabled');
    if (saved !== null) setManualEntryEnabled(saved === 'true');
    const savedOffline = localStorage.getItem('offlineMode');
    if (savedOffline !== null) setOfflineMode(savedOffline === 'true');
    const savedEntries = localStorage.getItem('manualEntries');
    if (savedEntries) {
      try { setManualEntries(JSON.parse(savedEntries)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manualEntryEnabled', String(manualEntryEnabled));
    }
  }, [manualEntryEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('offlineMode', String(offlineMode));
    }
  }, [offlineMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manualEntries', JSON.stringify(manualEntries));
    }
  }, [manualEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = decodeShareUrl(window.location.hash);
    if (payload && payload.rows.length > 0) {
      setSharedResults(payload.rows);
      setSharedLabel(payload.label);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const previousIndices = useMemo(() => {
    if (!selectedHistoryId) return undefined;
    return getPreviousIndices(selectedHistoryId) ?? undefined;
  }, [selectedHistoryId]);

  const groupedRows = useMemo(() => {
    const ocrRows = sharedResults ? sharedResults : groupByApartment(results, previousIndices);
    if (manualEntries.length === 0) return ocrRows;

    const manualResults: ExtractResult[] = manualEntries.map((e) => ({
      arquivo: `manual_${e.id}`,
      apartamentosEsperados: [e.apartamento],
      medidores: [{ posicao: 1, indiceInteiro: e.indice, indiceDecimal: '', confianca: 'alta' as const, observacao: 'Digitado manualmente' }],
    }));
    const allResults = [...results, ...manualResults];
    return groupByApartment(allResults, previousIndices);
  }, [results, previousIndices, sharedResults, manualEntries]);

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

    if (workload.length === 0) {
      setProcessing(false);
      setResults([]);
      alert(
        index.length === 0
          ? 'Nenhuma foto encontrada no chat. Verifique se o formato do arquivo .txt e compativel (WhatsApp, Telegram ou iMessage).'
          : `Encontradas ${index.length} fotos no chat, mas nenhuma corresponde aos arquivos enviados. Envie as fotos .jpg/.png junto com o arquivo .txt do chat.`
      );
      return;
    }

    let cursor = 0;
    async function worker() {
      while (cursor < workload.length && !cancelRef.current) {
        const row = workload[cursor];
        cursor += 1;
        console.log(`[worker] Processando ${cursor}/${workload.length}: ${row.arquivo}`);
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
          console.log(`[worker] Imagem comprimida: ${row.arquivo} (${base64.length} bytes base64)`);

          if (offlineMode) {
            console.log(`[worker] Modo offline: processando ${row.arquivo} localmente`);
            const data = await extractLocal(base64, mediaType, row.apartamentos);
            data.arquivo = row.arquivo;
            setResults((prev) => [...prev, data]);
          } else {
            let resp: Response;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 25000);
              resp = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arquivo: row.arquivo, apartamentos: row.apartamentos, imageBase64: base64, mediaType }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              console.log(`[worker] Resposta API: ${row.arquivo} status=${resp.status}`);
            } catch (fetchErr: any) {
              const msg = fetchErr?.name === 'AbortError'
                ? 'Timeout: servidor demorou mais de 25s para responder'
                : `Falha de rede: ${fetchErr?.message}`;
              console.error(`[worker] Erro de rede: ${row.arquivo}`, msg);
              setResults((prev) => [
                ...prev,
                { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: msg },
              ]);
              setDone((d) => d + 1);
              releaseSlot();
              continue;
            }
            const data = await resp.json();
            if (!resp.ok) {
              const isQuota = data.erro?.includes('429') || data.erro?.includes('quota') || data.erro?.includes('Cota');
              console.error(`[worker] Erro API: ${row.arquivo}`, data.erro);
              if (isQuota) {
                setQuotaExhausted(true);
                setQuotaResetTime(Date.now() + 60 * 60 * 1000);
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Leitor de Hidrometros', { body: 'Cota do Gemini esgotada. Tente novamente mais tarde.' });
                }
              }
              setResults((prev) => [
                ...prev,
                { arquivo: row.arquivo, apartamentosEsperados: row.apartamentos, medidores: [], erro: data.erro },
              ]);
            } else {
              console.log(`[worker] Sucesso: ${row.arquivo} (${data.medidores?.length || 0} medidores)`);
              await setCachedResult(file, {
                arquivo: data.arquivo,
                apartamentosEsperados: data.apartamentosEsperados,
                medidores: data.medidores,
              });
              setResults((prev) => [...prev, data]);
            }
          }
        } catch (e: any) {
          console.error(`[worker] Excecao: ${row.arquivo}`, e);
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
    console.log(`[worker] Processamento finalizado. Total: ${workload.length}`);
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

  function handleAddManualEntry(entry: ManualEntry) {
    setManualEntries((prev) => [...prev, entry]);
  }

  function handleRemoveManualEntry(id: string) {
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
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
    const rows = groupedRows.map((r) => {
      const cleaned = r.consumo.replace(/[^\d\-\.]/g, '');
      const consumo = parseFloat(cleaned);
      const valor = !isNaN(consumo) && consumo > 0 && tarifaConfig.faixas.length > 0 ? calcularTarifa(consumo, tarifaConfig) : 0;
      return {
        Apartamento: r.apartamento,
        Bloco: r.bloco,
        Indice: r.indice,
        Consumo: r.consumo,
        Valor: valor > 0 ? `R$ ${valor.toFixed(2).replace('.', ',')}` : '',
        Confianca: r.confianca,
        Observacao: r.observacao,
        Validacao: r.validacao || '',
        'Arquivo(s)': r.arquivos,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 45 }, { wch: 40 }, { wch: 45 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leituras');
    XLSX.writeFile(wb, 'leituras_hidrometros_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }, [groupedRows, tarifaConfig]);

  const handleExportCsv = useCallback(() => {
    const header = 'Apartamento,Indice,Consumo,Confianca,Observacao,Validacao,Arquivo(s)';
    const csvRows = groupedRows.map((r) =>
      [r.apartamento, r.indice, r.consumo, r.confianca, `"${r.observacao.replace(/"/g, '""')}"`, `"${(r.validacao || '').replace(/"/g, '""')}"`, `"${r.arquivos.replace(/"/g, '""')}"`].join(',')
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leituras_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      <ThemeSettingsPanel />
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
          manualEntryEnabled={manualEntryEnabled}
          offlineMode={offlineMode}
          onChatFileChange={setChatFile}
          onPhotoFilesChange={setPhotoFiles}
          onDateStartChange={setDateStart}
          onDateEndChange={setDateEnd}
          onProcess={handleProcess}
          onCancel={handleCancel}
          onManualEntryToggle={setManualEntryEnabled}
          onOfflineModeToggle={setOfflineMode}
        />

        <ManualEntryPanel
          enabled={manualEntryEnabled}
          entries={manualEntries}
          onAdd={handleAddManualEntry}
          onRemove={handleRemoveManualEntry}
        />

        <TarifaPanel onConfigChange={setTarifaConfig} />

        {quotaExhausted && (
          <div className="quota-warning visible" role="alert">
            Cota do Gemini esgotada. As proximas imagens serao processadas por OCR local (Tesseract).
            {quotaResetTime && ` Reset estimado: ${new Date(quotaResetTime).toLocaleTimeString('pt-BR')}.`}
          </div>
        )}

        {processing && total === 0 && <SkeletonLoading />}

        {(processing || total > 0) && <ProgressBar done={done} total={total} />}

        {groupedRows.length > 0 && (
          <>
            {sharedLabel && (
              <div className="shared-banner">
                Resultado compartilhado: <strong>{sharedLabel}</strong>
              </div>
            )}
            <Dashboard rows={groupedRows} />
            <ResultsTable
              groupedRows={groupedRows}
              tarifaConfig={tarifaConfig}
              photoPreviewMap={photoPreviewMap}
              editingCell={editingCell}
              editValue={editValue}
              columns={columns}
              onColumnsChange={setColumns}
              onEdit={handleEdit}
              onEditValueChange={setEditValue}
              onCommitEdit={commitEdit}
              onCancelEdit={() => setEditingCell(null)}
              onExport={handleExport}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              onShare={handleShare}
              shareCopied={shareCopied}
            />
          </>
        )}

        {groupedRows.length > 0 && (
          <HistoryPanel
            history={history}
            selectedHistoryId={selectedHistoryId}
            historyLabel={historyLabel}
            groupedRowsCount={groupedRows.length}
            onSelect={setSelectedHistoryId}
            onDelete={handleDeleteHistory}
            onSave={handleSaveHistory}
            onLabelChange={setHistoryLabel}
            onHistoryChange={() => setHistory(getHistory())}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
