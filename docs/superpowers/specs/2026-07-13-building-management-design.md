# Design Spec: Gestão de Prédios

**Data:** 2026-07-13  
**Status:** Aprovado  
**Escopo:** Multi-prédio + Estrutura do prédio (3 níveis: bloco/andar/apt)

---

## Resumo

Adicionar suporte a múltiplos prédios (condomínios) ao app, cada um com estrutura hierárquica (bloco > andar > apartamento). Os dados ficam em localStorage com preparação para sync Neon Postgres no futuro. Interface via dropdown no header + modal lateral para gerenciamento.

---

## 1. Data Model

### Tipos

```typescript
// lib/building.ts

interface Building {
  id: string;           // crypto.randomUUID()
  nome: string;         // "Condomínio Vista Verde"
  blocos: Bloco[];
  createdAt: string;    // ISO timestamp
  updatedAt: string;
}

interface Bloco {
  id: string;
  nome: string;         // "A", "B", "Torre 1"
  andares: Andar[];
}

interface Andar {
  numero: number;       // 1, 2, 3...
  apts: string[];       // ["101", "102", "103", "104"]
}

interface BuildingState {
  buildings: Building[];
  activeBuildingId: string | null;
}
```

### Persistência

- **Chave:** `hidrometro-buildings` no localStorage
- **Operações:** `loadBuildings()`, `saveBuildings(state)`, `createBuilding()`, `updateBuilding()`, `deleteBuilding()`, `setActiveBuilding()`

### Histórico

- `HistoryEntry` ganha campo opcional `buildingId: string`
- Dados antigos sem `buildingId` são associados ao "Prédio Padrão"

---

## 2. UI Components

### 2.1 Header com Seletor de Prédio

Na barra superior do app (ao lado do toggle de tema):

```
[🏢 Condomínio Vista Verde ▾]
```

- Click abre dropdown com lista de prédios + "Gerenciar prédios..."
- Seleção muda o contexto ativo (tabelas/gráficos filtram)
- Se não tem prédio configurado (primeira vez ou vazio), mostra "Nenhum prédio" com botão "Criar primeiro prédio" que abre o BuildingManager

### 2.2 BuildingManager (Modal Lateral)

Componente `<BuildingManager>` que abre como drawer lateral (500px, slide-in com Framer Motion):

**Tela 1 — Lista de prédios:**
- Cards com nome, blocos, total de apts
- Botão "Novo prédio"
- Editar/Excluir em cada card

**Tela 2 — Editar prédio:**
- Input: nome do prédio
- Lista de blocos, cada um com:
  - Input: nome do bloco ("A", "B", "Torre 1")
  - Lista de andares, cada um com:
    - Input: número do andar
    - Input: quantidade de apts (gera ["101","102",...] automaticamente)
    - Ou input manual de lista de apts (para casos irregular)
  - Botão "Remover bloco"
- Botão "Adicionar bloco"
- Botões: Salvar / Cancelar

### 2.3 Integração na page.tsx

- Estado `buildingState` no topo da `page.tsx`
- `<Header>` wrapper inclui o seletor
- `BuildingManager` é modal controlado por state `showBuildingManager`

---

## 3. Integração com OCR

### 3.1 Auto-associar

Quando há prédio ativo, o parser de chat detecta apartamentos e cruza com a estrutura:
- Se "A101" existe no prédio → associa automaticamente a Bloco A, Andar 1
- Se "A999" não existe → mostra alerta visual "⚠️ A999 não encontrado na estrutura" + permite ao usuário selecionar manualmente qual apartamento real corresponde (dropdown inline na tabela)
- Se não há prédio ativo → fluxo atual (input manual de lista de apts)

### 3.2 Tabela de Resultados

- Coluna "Bloco" (atualmente oculta) fica **visível automaticamente** quando há prédio ativo
- Badge colorido por bloco (A=azul, B=verde, etc)

### 3.3 InputPanel

Quando prédio tem estrutura definida, mostra barra de contexto:
```
🏢 Vista Verde > Bloco A > 4 andares × 4 apts = 16 unidades
```

### 3.4 Filtros

Dashboard e History herdam filtro de prédio ativo. Ao mudar prédio no dropdown, tudo filtra.

---

## 4. Migração de Dados

### Estratégia

1. Verifica se `hidrometro-buildings` existe no localStorage
2. Se não existe:
   - Lê `hidrometro-history` existente
   - Extrai blocos únicos dos dados
   - Cria "Prédio Padrão" com estrutura inferida
   - Salva em `hidrometro-buildings`
   - Define como prédio ativo
3. Se já existe: nada a fazer

### Inferência

```typescript
function inferBuildingFromHistory(history: HistoryEntry[]): Building {
  const blocos = [...new Set(history.flatMap(p => p.rows.map(r => r.bloco)))];
  return {
    id: crypto.randomUUID(),
    nome: 'Prédio Padrão',
    blocos: blocos.map(nome => ({
      id: crypto.randomUUID(),
      nome,
      andares: inferAndares(history, nome)
    }))
  };
}
```

O `inferAndares` agrupa apts por primeiro dígito (andar) e lista os apts.

---

## 5. Arquivos Novos

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `lib/building.ts` | Lib | Tipos + CRUD + persistência + migração |
| `components/BuildingManager.tsx` | Component | Modal lateral de gerenciamento |
| `components/BuildingSelector.tsx` | Component | Dropdown no header |
| `test/building.test.ts` | Test | Testes unitários |

## 6. Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `app/page.tsx` | Estado `buildingState`, `showBuildingManager`, wrapper Header |
| `components/ResultsTable.tsx` | Coluna Bloco visível quando prédio ativo |
| `components/InputPanel.tsx` | Barra de contexto do prédio |
| `lib/history.ts` | Campo `buildingId` opcional |
| `app/globals.css` | Estilos do BuildingManager, BuildingSelector |

## 7. Testes

- `test/building.test.ts`: CRUD de prédios, persistência, migração automática
- Testes de integração: filtro por prédio, auto-associar apartamentos

## 8. Fora do Escopo

- Login/autenticação (Better Auth) — futuro
- Sync com Neon Postgres — futuro
- Rateio de água — roadmap separado
- Tarifa progressiva — roadmap separado
- Síndico vs Proprietário — roadmap separado
