<div align="center">

# Leitor de Hidrômetros

### Extração automática de índices de hidrômetros a partir de fotos do WhatsApp

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)
![Deploy](https://img.shields.io/badge/Deploy-Railway-0B0D2E?style=flat-square&logo=railway)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

[Leitor de Hidrômetros](https://hidrometro-app-web-production.up.railway.app) — Processamento 100% no navegador com OCR cascade inteligente

</div>

---

## Funcionalidades

<table>
<tr>
<td width="50%">

### Entrada de Dados
- **Chat export** — WhatsApp, Telegram, iMessage com detecção automática de formato
- **Drag & drop** — Arquivo `.txt` + pasta de fotos
- **Filtro por data** — Selecione intervalo de dias antes de processar

</td>
<td width="50%">

### OCR Cascade
- **OCR.space** — API gratuita (25k req/mês), alta precisão para números
- **Gemini AI** — Google Vision (requer billing habilitado)
- **Tesseract.js** — Fallback local, funciona 100% offline

</td>
</tr>
<tr>
<td>

### Processamento
- **Compressão inteligente** — Redimensiona para 1600px, JPEG 85% antes de enviar
- **Concorrência controlada** — 3 fotos simultâneas com rate limiting (600ms delay)
- **Cache IndexedDB** — Fotos já processadas não são reenviadas
- **Cancelamento** — Interrompa o processamento a qualquer momento

</td>
<td>

### Dashboard
- **Gráfico de barras** — Consumo por apartamento
- **Gráfico de pizza** — Distribuição de confiança das leituras
- **Evolução multi-período** — Comparar consumo entre meses
- **Toggle por apartamento** — Selecione quais apts mostrar nos gráficos

</td>
</tr>
<tr>
<td>

### Exportação
- **XLSX** — Planilha Excel com formatação condicional
- **PDF** — Relatório com jsPDF e auto-tabela
- **CSV** — UTF-8 BOM para compatibilidade com Excel
- **Link compartilhável** — URL encriptada com base64 dos resultados

</td>
<td>

### UX
- **Tema dark/light** — Detecção automática do preferido pelo sistema
- **PWA offline** — Service Worker cacheia assets estáticos
- **Skeleton loading** — Animação de carregamento elegante
- **Notificação de quota** — Alerta quando API atinge limite
- **Responsivo** — Desktop, tablet e mobile

</td>
</tr>
</table>

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     NAVEGADOR                           │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │
│  │  Input    │──▶│  Parser  │──▶│   Processing     │    │
│  │  Panel    │   │  (chat)  │   │   Worker Pool    │    │
│  └──────────┘   └──────────┘   │  (3 concurrent)  │    │
│                                └────────┬─────────┘    │
│                                         │               │
│  ┌──────────────────────────────────────▼────────────┐  │
│  │              /api/extract                          │  │
│  │                                                    │  │
│  │   ┌─────────┐  ┌──────────┐  ┌──────────────┐   │  │
│  │   │OCR.space│─▶│  Gemini  │─▶│  Tesseract.js │   │  │
│  │   │  (API)  │  │  (API)   │  │  (local WASM) │   │  │
│  │   └─────────┘  └──────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Dashboard   │  │  Export  │  │  History + Cache │   │
│  │  (Recharts)  │  │ XLSX/PDF │  │  localStorage/IDB│   │
│  └─────────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Stack

| Camada | Tecnologia | Uso |
|--------|------------|-----|
| Frontend | Next.js 14 (App Router) | Framework React |
| UI | React 18 + CSS custom | Componentes + temas |
| Gráficos | Recharts 3 | Dashboard interativo |
| OCR | OCR.space / Gemini / Tesseract.js | Extração de texto |
| Export | SheetJS (XLSX) + jsPDF | Planilhas e PDFs |
| Cache | IndexedDB | Resultados de fotos |
| Testes | Vitest + Playwright | Unit + E2E |
| Deploy | Railway | Hosting + CI/CD |
| PWA | Service Worker | Offline support |

---

## Rodando Localmente

```bash
# Clonar
git clone https://github.com/Henrique1601/Leitor-de-hidr-metros-web.git
cd Leitor-de-hidr-metros-web

# Instalar
npm install

# Configurar
cp .env.example .env.local
# Edite .env.local e adicione suas chaves (opcional):

# Opcional: OCR.space (gratuito — https://ocr.space/ocrapi/freekey)
OCR_SPACE_API_KEY=sua_chave_aqui

# Opcional: Gemini AI (requer billing no Google Cloud)
GEMINI_API_KEY=sua_chave_aqui

# Iniciar
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Como Usar

1. **Exporte o chat** — WhatsApp: Conversa → Mais opções → Exportar conversa → Incluir mídia
2. **Envie os arquivos** — Arraste o `.txt` + pasta de fotos no site
3. **Configure** — (Opcional) Filtre por intervalo de datas
4. **Processe** — Clique em "Processar fotos" e acompanhe o progresso
5. **Exporte** — XLSX, PDF, CSV ou gere um link compartilhável

### Legenda das Cores

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | Confiança alta (>=80%) |
| 🟡 Amarelo | Confiança média (50-79%) — vale conferir |
| 🔴 Vermelho | Confiança baixa (<50%) — precisa de revisão |

---

## Estrutura do Projeto

```
├── app/
│   ├── api/extract/route.ts    # API route: OCR cascade
│   ├── layout.tsx              # Root layout + fontes + tema
│   ├── page.tsx                # Página principal + processing loop
│   └── globals.css             # Temas dark/light + responsivo
├── components/
│   ├── Dashboard.tsx           # Gráficos Recharts
│   ├── InputPanel.tsx          # Upload de arquivos
│   ├── ProgressBar.tsx         # Indicador de progresso
│   ├── ResultsTable.tsx        # Tabela de resultados + export
│   ├── SkeletonLoading.tsx     # Skeleton animado
│   ├── ThemeProvider.tsx        # Toggle dark/light
│   ├── RegisterSW.tsx          # Service Worker PWA
│   └── ErrorBoundary.tsx       # Error boundary
├── lib/
│   ├── ocrspace.ts             # Cliente OCR.space
│   ├── gemini.ts               # Cliente Gemini AI
│   ├── tesseract.ts            # Cliente Tesseract.js
│   ├── parseChat.ts            # Parser multi-plataforma
│   ├── results.ts              # Agrupamento + consumo
│   ├── history.ts              # Persistência + multi-período
│   ├── cache.ts                # Cache IndexedDB
│   ├── rateLimit.ts            # Controle de concorrência
│   ├── exportPdf.ts            # Export PDF (jsPDF)
│   └── shareLink.ts            # Compartilhar via URL
├── e2e/app.spec.ts             # Testes E2E (Playwright)
├── test/                       # Testes unitários (Vitest)
└── .github/workflows/ci.yml   # CI/CD
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar em produção |
| `npm run lint` | Verificar código (ESLint 9) |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) |
| `npm run format` | Formatar código (Prettier) |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OCR_SPACE_API_KEY` | Não | Chave OCR.space (25k req/mês grátis) |
| `GEMINI_API_KEY` | Não | Chave Google Gemini (requer billing) |

> **Nota:** O app funciona sem nenhuma chave — usa Tesseract.js como fallback local.

---

## Deploy

### Railway (atual)

O projeto está hospedado no Railway com deploy automático via GitHub.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com)

### Outros

<details>
<summary>Vercel</summary>

```bash
npx vercel
```

> **Atenção:** O Vercel free tier tem timeout de 10s. Configure `maxDuration` no `next.config.mjs` para usar com Pro plan.

</details>

<details>
<summary>Docker</summary>

```bash
docker build -t hidrometro-app .
docker run -p 3000:3000 -e OCR_SPACE_API_KEY=sua_chave hidrometro-app
```

</details>

---

## Roadmap

### Implementado

- [x] Chat parser multi-plataforma (WhatsApp, Telegram, iMessage)
- [x] OCR cascade (OCR.space → Gemini → Tesseract)
- [x] Compressão de imagem no navegador
- [x] Processamento concorrente com rate limiting
- [x] Cache de resultados (IndexedDB)
- [x] Tabela de resultados com edição inline
- [x] Export XLSX / PDF / CSV
- [x] Link compartilhável (URL hash)
- [x] Dashboard com gráficos (Recharts)
- [x] Comparação multi-período
- [x] Histórico de leituras (localStorage)
- [x] Tema dark/light com detecção automática
- [x] PWA com Service Worker
- [x] Responsivo (desktop/tablet/mobile)
- [x] Acessibilidade (ARIA, navegação por teclado)
- [x] Error boundary
- [x] Skeleton loading
- [x] Notificação de quota
- [x] CI/CD com GitHub Actions
- [x] Testes unitários (Vitest) + E2E (Playwright)
- [x] Entrada manual de índices — Toggle para digitar quando OCR falha

### Possíveis Funcionalidades

- [ ] Cálculo de tarifa de água — Faixas de preço (m³) e valor por apartamento
- [ ] Alerta de consumo anormal — Sinalizar apês com consumo 2x acima da média
- [ ] Relatório de comparação PDF — Comparar 2 períodos lado a lado

### 📊 Média Prioridade

- [ ] Importar leituras via XLSX — Carregar leituras anteriores de planilha
- [ ] Modo offline completo — Tesseract como OCR principal sem API externa
- [ ] Backup/Restore — Exportar/importar histórico como JSON
- [ ] Multi-usuário com login — Síndicos/funcionários com seus históricos

### 🚀 Baixa Prioridade

- [ ] WhatsApp Bot — Enviar fotos e receber leitura de volta
- [ ] API REST para condomínios — Endpoint para sistemas externos
- [ ] Detecção de anomalias com IA — Analisar padrões e prever problemas
- [ ] i18n — Português, Espanhol, Inglês

### 📱 Mobile & Acessibilidade

- [ ] Gesture de swipe — Navegar entre fotos no mobile
- [ ] Modo uma mão — Layout otimizado para uso com uma mão
- [ ] Voice feedback — Leitura por voz do índice extraído
- [ ] Zoom na foto — Pinch-to-zoom para verificar detalhes
- [ ] Modo alto contraste — Tema acessível para deficientes visuais

### 📸 Câmera & Captura

- [ ] Captura direta pela câmera — Tirar foto pelo app sem exportar
- [ ] Multi-câmera — Várias fotos do mesmo hidrômetro
- [ ] Flash automático — Ajustar exposição para ambientes escuros
- [ ] OCR em tempo real — Preview ao vivo enquanto aponta a câmera

### 📊 Analytics & Relatórios

- [ ] Previsão de consumo — IA prevê próximos meses baseado no histórico
- [ ] Ranking de consumo — Apartamentos que mais/menos consumiram
- [ ] Mapa de calor — Visualização por andar/bloco com cores
- [ ] Comparar com média do prédio — Benchmark individual vs coletivo
- [ ] Relatório automático mensal — PDF todo mês via email
- [ ] Gráfico de tendência — Regressão linear (consumo subindo/descendo)

### 🔔 Notificações & Automação

- [ ] Lembrete de leitura — Push notification para não esquecer
- [ ] Alerta de aumento >20% — Notificação quando consumo sobe
- [ ] Resumo semanal por email — Digest com consumo da semana
- [ ] Webhook — Notificar sistemas externos ao concluir leitura
- [ ] Agendamento — Processar automaticamente em horário definido

### 🏢 Gestão de Prédios

- [ ] Multi-prédio — Gerenciar vários condomínios no mesmo app
- [ ] Estrutura do prédio — Configurar andares, bloco, qtd de apts
- [ ] Tarifa progressiva — Faixas de preço por faixa de consumo
- [ ] Rateio de água — Calcular rateio comum + individual
- [ ] Histórico por bloco — Agrupar por bloco além de apartamento
- [ ] Síndico vs Proprietário — Dois modos com permissões diferentes

### 💰 Financeiro

- [ ] Calcular conta de água — Integrar com tabela da concessionária
- [ ] Boleto automático — Gerar cobrança por apartamento
- [ ] Dívida ativa — Rastrear apartamentos que não pagaram
- [ ] Comparar com meses anteriores — Variação % e valor financeiro

### 🔗 Integrações

- [ ] Google Sheets — Sincronizar resultados com planilha online
- [ ] Slack/Telegram Bot — Enviar resultado do dia automaticamente
- [ ] API pública — REST API documentada para integrações externas
- [ ] Webhook para sistemas condominiais — CondominioPay, iSyCred
- [ ] Importar do Google Fotos — Puxar fotos automaticamente
- [ ] Zapier/IFTTT — Automações sem código

### 🎨 UX Premium

- [ ] Onboarding interativo — Tutorial passo a passo na primeira vez
- [ ] Temas personalizados — Usuário escolhe cores do app
- [ ] Animações de transição — Framer Motion entre telas
- [ ] Dark mode por schedule — Escuro de noite, claro de dia
- [ ] Modo presentation — Tela cheia para projetor/reunião de síndico
- [ ] Customizar colunas da tabela — Escolher quais mostrar/esconder

### 🧪 Qualidade & Segurança

- [ ] Validação de OCR — Marcar leituras improváveis (ex: índice > 99999)
- [ ] Detecção de foto duplicada — Mesma foto enviada 2 vezes
- [ ] Criptografia do histórico — Proteger dados no localStorage
- [ ] Auditoria — Log de quem alterou qual índice e quando
- [ ] Watermark no PDF — Marca d'água com data e hora de geração

### 🌐 Offline & Performance

- [ ] Service Worker avançado — Cache de imagens também
- [ ] WebAssembly OCR — Tesseract otimizado com WASM SIMD
- [ ] Processamento em Web Worker — Não travar a UI durante OCR
- [ ] Lazy load de imagens — Carregar fotos sob demanda
- [ ] Compressão server-side — Mover compressão para API route

---

## Licença

MIT — use como quiser.

---

<div align="center">

Feito com dedication por [Henrique](https://github.com/Henrique1601)

</div>
