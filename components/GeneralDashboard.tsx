'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Buildings, ChartBar } from '@phosphor-icons/react';
import { getHistory } from '@/lib/history';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#3ecfc0', '#e8a33d', '#e85d75', '#5b8def', '#9b6dff', '#3ecf6a', '#ef5b5b', '#dfcf3e'];

interface BuildingSummary {
  id: string;
  name: string;
  readings: number;
  totalConsumo: number;
  avgConsumo: number;
  aptsComLeitura: number;
  ultimaLeitura: string;
}

export function GeneralDashboard() {
  const [showDashboard, setShowDashboard] = useState(false);

  const history = useMemo(() => getHistory(), []);

  const buildingSummaries = useMemo<BuildingSummary[]>(() => {
    const map = new Map<string, { name: string; entries: typeof history }>();

    for (const entry of history) {
      const bid = entry.buildingId || 'unknown';
      const bname = entry.buildingName || 'Sem predio';
      if (!map.has(bid)) map.set(bid, { name: bname, entries: [] });
      map.get(bid)!.entries.push(entry);
    }

    return Array.from(map.entries()).map(([id, { name, entries }]) => {
      const latest = entries[0];
      const rows = latest?.rows || [];
      const withConsumo = rows.filter((r) => r.consumo !== null && r.consumo !== undefined);
      const totalConsumo = withConsumo.reduce((s, r) => s + Number(r.consumo), 0);
      return {
        id,
        name,
        readings: entries.length,
        totalConsumo: Math.round(totalConsumo * 100) / 100,
        avgConsumo: withConsumo.length > 0 ? Math.round((totalConsumo / withConsumo.length) * 100) / 100 : 0,
        aptsComLeitura: rows.length,
        ultimaLeitura: latest?.label || (latest ? new Date(latest.date).toLocaleDateString('pt-BR') : '-'),
      };
    }).sort((a, b) => b.readings - a.readings);
  }, [history]);

  const barData = useMemo(() =>
    buildingSummaries.map((b) => ({
      name: b.name.length > 16 ? b.name.slice(0, 14) + '...' : b.name,
      leituras: b.readings,
      'Media m3': b.avgConsumo,
    })),
    [buildingSummaries]
  );

  if (buildingSummaries.length === 0) return null;

  return (
    <div className="dashboard-container">
      <button
        className="secondary dashboard-toggle"
        onClick={() => setShowDashboard((s) => !s)}
        aria-expanded={showDashboard}
        aria-controls="general-dashboard-panel"
      >
        <Buildings size={16} weight="light" />
        {showDashboard ? 'Ocultar Dashboard Geral' : 'Dashboard Geral'}
      </button>

      <AnimatePresence>
        {showDashboard && (
          <motion.div
            id="general-dashboard-panel"
            className="dashboard-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {buildingSummaries.length > 0 && (
              <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
              >
                <h3>Leituras por Predio</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text)' }}
                    />
                    <Legend />
                    <Bar dataKey="leituras" fill="#3ecfc0" radius={[4, 4, 0, 0]} name="Leituras" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {buildingSummaries.length > 0 && (
              <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <h3>Consumo Medio por Predio (m3)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text)' }}
                    />
                    <Bar dataKey="Media m3" fill="#e8a33d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            <motion.div
              className="dashboard-card dashboard-card--full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <h3>Resumo Geral</h3>
              <div className="general-summary-grid">
                {buildingSummaries.map((b, i) => (
                  <div key={b.id} className="general-summary-item" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
                    <strong>{b.name}</strong>
                    <span className="general-stat">{b.readings} leitura{b.readings !== 1 ? 'es' : ''}</span>
                    <span className="general-stat">{b.aptsComLeitura} apartamento{b.aptsComLeitura !== 1 ? 's' : ''}</span>
                    <span className="general-stat">Media: {b.avgConsumo} m3</span>
                    <span className="general-stat dim">Ultima: {b.ultimaLeitura}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
