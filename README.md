# Leitor de Hidrômetros — app web

Site em Next.js (App Router) que lê o `.txt` exportado do WhatsApp + a pasta de
fotos, chama a API de visão da Claude pra ler o índice de cada hidrômetro, e
gera a planilha final — tudo no navegador, com progresso ao vivo.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local e coloque sua ANTHROPIC_API_KEY (console.anthropic.com)
npm run dev
```
Abra http://localhost:3000

## Deploy na Vercel

1. Suba esse projeto pra um repositório no GitHub (ou use `vercel` CLI direto
   da pasta: `npx vercel`).
2. Na Vercel, importe o repositório.
3. Em **Settings -> Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave (nunca fica exposta no navegador, só é
     usada dentro da API route no servidor).
4. Deploy.

## Como usar

1. Exporte a conversa do WhatsApp **com mídia** (Conversa -> Mais opções ->
   Exportar conversa -> Incluir mídia).
2. No site, selecione o `.txt` exportado e a pasta com as fotos.
3. (Opcional) filtre por intervalo de datas.
4. Clique em **Processar fotos** — a tabela por apartamento vai se preenchendo
   ao vivo conforme cada foto é lida.
5. Ao final, clique em **Exportar XLSX**.

Linhas em amarelo = confiança média/baixa, vale conferir. Linhas em vermelho =
divergência entre fotos do mesmo apê ou falha de leitura — precisam de
revisão manual.

## Notas técnicas

- As fotos são redimensionadas no navegador (máx. 1600px, JPEG 85%) antes de
  ir pra API, o que acelera o processamento e reduz custo, sem perder
  legibilidade dos dígitos.
- Concorrência de 4 fotos em paralelo (dá pra ajustar a constante
  `CONCURRENCY` em `app/page.tsx`).
- Nenhum dado é salvo em banco — se a aba for fechada no meio do
  processamento, é preciso rodar de novo. Para lotes muito grandes (1000+
  fotos), considere processar por dia/rota usando os filtros de data.
- **xlsx (SheetJS)**: a versão do npm tem alertas de segurança conhecidos
  (prototype pollution / ReDoS) sem correção publicada no registro do npm.
  Como aqui ele só é usado no navegador pra montar uma planilha a partir de
  dados que você mesmo gerou (não abre arquivos de terceiros), o risco
  prático é baixo. Se quiser eliminar o alerta, dá pra trocar por
  `exceljs` no lugar — me avise que eu adapto.
- O `npm audit` também aponta avisos do próprio Next.js relacionados a
  cenários de alto tráfego/multi-usuário (DoS). Como é um app pessoal, sem
  login, de baixo tráfego, o risco é baixo — mas vale rodar
  `npm audit` de tempos em tempos e atualizar o Next quando for conveniente.
