'use client';

import { memo } from 'react';

interface ProgressBarProps {
  done: number;
  total: number;
}

function ProgressBarInner({ done, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="panel">
      <div className="panel-title">Progresso</div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="progress-label">
        <span>
          {done} de {total} fotos
        </span>
        <span>{pct}%</span>
      </div>
    </section>
  );
}

export default memo(ProgressBarInner);
