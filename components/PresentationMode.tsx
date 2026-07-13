'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  enabled: boolean
  onToggle: () => void
  children: React.ReactNode
}

export default function PresentationMode({ enabled, onToggle, children }: Props) {
  useEffect(() => {
    if (enabled) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [enabled])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'F11' || (e.key === 'Escape' && enabled)) {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [enabled, onToggle])

  if (!enabled) return null

  return (
    <motion.div
      className="presentation-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="presentation-topbar">
        <span className="presentation-badge">MODO APRESENTAÇÃO</span>
        <button className="presentation-exit" onClick={onToggle}>
          ✕ Sair (Esc)
        </button>
      </div>
      <div className="presentation-content">
        {children}
      </div>
    </motion.div>
  )
}

export function PresentationToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      className={`presentation-toggle ${enabled ? 'active' : ''}`}
      onClick={onToggle}
      title={enabled ? 'Sair do modo apresentação' : 'Modo apresentação (projetor)'}
      aria-label={enabled ? 'Sair do modo apresentação' : 'Entrar no modo apresentação'}
    >
      {enabled ? '✕' : '🖥️'}
    </button>
  )
}
