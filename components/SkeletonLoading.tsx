'use client';

export default function SkeletonLoading() {
  return (
    <section className="panel">
      <div className="panel-title">Carregando</div>
      <div className="skeleton-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell sk-apt" />
            <div className="skeleton-cell sk-idx" />
            <div className="skeleton-cell sk-badge" />
            <div className="skeleton-cell sk-obs" />
          </div>
        ))}
      </div>
    </section>
  );
}
