'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ONBOARDING_KEY = 'hidrometro-onboarding-seen'

interface Step {
  title: string
  body: string
  icon: string
}

const STEPS: Step[] = [
  {
    icon: '💬',
    title: '1. Exporte o chat',
    body: 'No WhatsApp, vá no grupo do prédio, toque nos 3 pontinhos → "Mais" → "Exportar conversa" → "Sem mídia". Você vai receber um arquivo .txt.',
  },
  {
    icon: '📸',
    title: '2. Tire fotos dos hidrômetros',
    body: 'Abra a câmera do celular e fotografe o índice de cada apartamento. As fotos precisam estar no mesmo computador/celular do arquivo .txt.',
  },
  {
    icon: '📁',
    title: '3. Envie tudo junto',
    body: 'Arraste o arquivo .txt E a pasta com as fotos para esta página. O app vai combinar automaticamente cada foto com o apartamento do chat.',
  },
  {
    icon: '🤖',
    title: '4. OCR automático',
    body: 'O app envia cada foto para leitura automática. Você pode corrigir qualquer índice clicando duas vezes na tabela. Resultados são salvos no histórico.',
  },
]

interface Props {
  onComplete: () => void
}

export default function OnboardingOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      setVisible(false)
      setTimeout(onComplete, 300)
    }
  }, [step, onComplete])

  const skip = useCallback(() => {
    setVisible(false)
    setTimeout(onComplete, 300)
  }, [onComplete])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
      if (e.key === 'Escape') skip()
    }
    if (visible) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible, next, skip])

  if (!visible) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="onboarding-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="onboarding-steps">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`onboarding-step-indicator ${i === step ? 'active' : i < step ? 'done' : ''}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                className="onboarding-content"
              >
                <div className="onboarding-icon">{STEPS[step].icon}</div>
                <h2 className="onboarding-title">{STEPS[step].title}</h2>
                <p className="onboarding-body">{STEPS[step].body}</p>
              </motion.div>
            </AnimatePresence>

            <div className="onboarding-actions">
              <button className="onboarding-skip" onClick={skip}>
                Pular
              </button>
              <button className="onboarding-next" onClick={next}>
                {step < STEPS.length - 1 ? 'Próximo' : 'Começar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(ONBOARDING_KEY) === 'true'
}

export function markOnboardingSeen(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true')
}
