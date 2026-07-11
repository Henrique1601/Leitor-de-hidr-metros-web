'use client';

import { useMemo, useState } from 'react';
import { GroupedRow } from '@/lib/results';
import { getMultiPeriodData, getEvolutionData } from '@/lib/history';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

interface DashboardProps {
  rows: GroupedRow[];
}

const COLORS = ['#3ecfc0', '#e8a33d', '#e85d75', '#5b8def', '#9b6dff', '#3ecf6a', '#ef5b5b', '#dfcf3e'];

export function Dashboard({ rows }: DashboardProps) {
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedApts, setSelectedApts] = useState<string[]>([]);

  const periods = useMemo(() => getMultiPeriodData(5), []);

  const allAvailableApts = useMemo(() =>
    [...new Set(periods.flatMap((p) => p.rows.map((r) => r.apartamento)))],
    [periods]
  );

  const effectiveSelectedApts = selectedApts.length > 0
    ? selectedApts
    : allAvailableApts.slice(0, 8);

  const consumoData = useMemo(() =>
    rows
      .filter((r) => r.consumo !== null)
      .map((r) => ({ name: r.apartamento, consumo: Number(r.consumo) }))
      .sort((a, b) => b.consumo - a.consumo),
    [rows]
  );

  const confiancaData = useMemo(() => {
    const counts = { alta: 0, media: 0, baixa: 0 };
    rows.forEach((r) => {
      if (r.confianca === 'alta') counts.alta++;
      else if (r.confianca === 'media') counts.media++;
      else if (r.confianca === 'baixa') counts.baixa++;
    });
    return [
      { name: 'Alta (>=80%)', value: counts.alta },
      { name: 'Media (50-79%)', value: counts.media },
      { name: 'Baixa (<50%)', value: counts.baixa },
    ].filter((d) => d.value > 0);
  }, [rows]);

  const evolutionData = useMemo(() => {
    if (periods.length < 2 || effectiveSelectedApts.length === 0) return null;
    const evo = getEvolutionData(effectiveSelectedApts, periods);
    const periodLabels = periods.map((p) => p.label);
    return periodLabels.map((label) => {
      const point: Record<string, string | number> = { period: label };
      for (const apt of effectiveSelectedApts) {
        const values = evo.get(apt) ?? [];
        const match = values.find((v) => v.period === label);
        point[apt] = match?.consumo ?? 0;
      }
      return point;
    });
  }, [periods, effectiveSelectedApts]);

  if (rows.length === 0) return null;

  return (
    <div className="dashboard-container">
      <button
        className="secondary dashboard-toggle"
        onClick={() => setShowDashboard((s) => !s)}
        aria-expanded={showDashboard}
        aria-controls="dashboard-panel"
      >
        {showDashboard ? 'Ocultar Graficos' : 'Mostrar Graficos'}
      </button>

      {showDashboard && (
        <div id="dashboard-panel" className="dashboard-panel">
          {consumoData.length > 0 && (
            <div className="dashboard-card">
              <h3>Consumo por Apartamento</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumoData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Bar dataKey="consumo" fill="#3ecfc0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {confiancaData.length > 0 && (
            <div className="dashboard-card">
              <h3>Distribuicao de Confianca</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={confiancaData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {confiancaData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {evolutionData && evolutionData.length >= 2 && (
            <div className="dashboard-card dashboard-card--full">
              <h3>Evolucao do Consumo ({periods.length} periodos)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fill: 'var(--text)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Legend />
                  {effectiveSelectedApts.map((apt, i) => (
                    <Line
                      key={apt}
                      type="monotone"
                      dataKey={apt}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="evolution-apt-selector">
                <span>Apartamentos:</span>
                {(() => {
                  const allApts = [...new Set(periods.flatMap((p) => p.rows.map((r) => r.apartamento)))];
                  return allApts.map((apt) => (
                    <label key={apt} className="apt-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedApts.includes(apt)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedApts((prev) => [...prev, apt]);
                          else setSelectedApts((prev) => prev.filter((a) => a !== apt));
                        }}
                      />
                      {apt}
                    </label>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
