'use client';

import { FileText, Camera, Table, Download, Keyboard, ArrowsClockwise } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const steps = [
  { icon: FileText, label: 'Exportar chat', desc: 'Exporte a conversa do WhatsApp como arquivo .txt' },
  { icon: Camera, label: 'Tirar fotos', desc: 'Fotografe o indice de cada hidrometro' },
  { icon: Table, label: 'Arrastar arquivos', desc: 'Arraste o .txt e a pasta de fotos para ca' },
  { icon: ArrowsClockwise, label: 'Leitura automatica', desc: 'O app combina fotos com apartamentos e le os indices' },
  { icon: Download, label: 'Exportar resultados', desc: 'Baixe em XLSX, PDF ou CSV com um clique' },
  { icon: Keyboard, label: 'Atalhos uteis', desc: 'Ctrl+Z desfaz, Ctrl+E exporta, / busca na tabela' },
];

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-inner">
        <motion.div
          className="empty-state-icon"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <ArrowsClockwise size={48} weight="thin" />
        </motion.div>

        <h2 className="empty-state-title">Nenhuma leitura ainda</h2>
        <p className="empty-state-subtitle">Comece arrastando seus arquivos para a area de upload acima.</p>

        <div className="empty-state-steps">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                className="empty-state-step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="empty-state-step-num">{i + 1}</div>
                <div className="empty-state-step-icon">
                  <Icon size={18} weight="light" />
                </div>
                <div>
                  <div className="empty-state-step-label">{step.label}</div>
                  <div className="empty-state-step-desc">{step.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
