'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CaretLeft, CaretRight, MagnifyingGlass, MagnifyingGlassMinus } from '@phosphor-icons/react';

interface LightboxProps {
  images: { src: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const prev = useCallback(() => {
    if (index > 0) { setIndex((i) => i - 1); setZoom(1); }
  }, [index]);

  const next = useCallback(() => {
    if (index < images.length - 1) { setIndex((i) => i + 1); setZoom(1); }
  }, [index, images.length]);

  const toggleZoom = useCallback(() => {
    setZoom((z) => z === 1 ? 2 : 1);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleZoom(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next, toggleZoom]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (touchDeltaX.current < -50) next();
    else if (touchDeltaX.current > 50) prev();
    touchDeltaX.current = 0;
  }

  const img = images[index];

  return (
    <motion.div
      className="lightbox-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="lightbox-toolbar">
        <span className="lightbox-counter">{index + 1} / {images.length}</span>
        <button className="lightbox-btn" onClick={(e) => { e.stopPropagation(); toggleZoom(); }} aria-label="Zoom">
          {zoom > 1 ? <MagnifyingGlassMinus size={20} /> : <MagnifyingGlass size={20} />}
        </button>
        <button className="lightbox-btn" onClick={onClose} aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      {index > 0 && (
        <button className="lightbox-nav lightbox-nav--prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Foto anterior">
          <CaretLeft size={28} weight="bold" />
        </button>
      )}

      <AnimatePresence mode="popLayout">
        <motion.img
          key={index}
          className="lightbox-img"
          src={img.src}
          alt={img.alt}
          style={{ transform: `scale(${zoom})` }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: zoom }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </AnimatePresence>

      {index < images.length - 1 && (
        <button className="lightbox-nav lightbox-nav--next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Proxima foto">
          <CaretRight size={28} weight="bold" />
        </button>
      )}
    </motion.div>
  );
}
