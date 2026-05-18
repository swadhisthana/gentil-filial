# CLAUDE.md — Gentil Filial

Contexto permanente do projeto. Leia antes de qualquer tarefa.

---

## Stack

- **Framework**: Next.js 14 (App Router)
- **Estilização**: Tailwind CSS + classes customizadas `verde-*` (definidas em `tailwind.config.ts`)
- **Linguagem**: TypeScript
- **Banco**: Supabase (PostgreSQL) — REST API via anon key
- **Deploy**: Vercel — https://gentil-filial.vercel.app
- **Sessão**: localStorage (sem Supabase Auth)
- **Imagens**: proxy via `https://wsrv.nl/?url=...&w=&h=&fit=contain&bg=white&output=webp`

---

## Arquitetura

```
app/
  page.tsx              → Login (escolha de papel)
  farmaceutico/
    page.tsx            → Tela do solicitante (produtos + carrinho)
  gestor/
    admin/page.tsx      → Gestão de usuários e produtos
lib/
  supabase.ts           → Client + tipos
  parser-produto.tsx    → Extrai forma farmacêutica do nome
public/
  fabricantes_logos.json → 121 logos de laboratórios
```

---

## Banco de Dados (Supabase)

**URL**: `https://ozkwksifvyekijcaolzn.supabase.co`

### Tabelas principais

#### `produtos`
| Coluna | Tipo | Notas |
|---|---|---|
| id | int | PK |
| nome | text | title case |
| categoria | text | `'medicamento'` ou `'Perfumaria'` |
| fabricante | text | title case |
| codigo_barras | text | EAN-13 |
| imagem_url | text | URL da imagem (proxy wsrv.nl no front) |

**Constraint**: `CHECK (categoria IN ('medicamento', 'Perfumaria'))`
**Total**: ~10.467 produtos

#### `usuarios`
| Coluna | Tipo | Notas |
|---|---|---|
| id | int | PK |
| nome | text | |
| usuario | text | login |
| tipo | text | `'farmaceutico'` ou `'gestor'` |
| filial_id | int | FK filiais |
| crf | text | opcional |
| turno | text | `'manha'` ou `'noite'` |

#### `solicitacoes` + `itens_solicitacao`
- Solicitação criada pelo farmacêutico/solicitante
- Status: `'pendente'` ou `'concluido'`

---

## Categorias de Produtos

Apenas **2 categorias**:

| Categoria | O que inclui |
|---|---|
| `medicamento` | Medicamentos com princípio ativo — comprimidos, cápsulas, injeções, pomadas medicadas, géis medicados, xaropes |
| `Perfumaria` | Higiene pessoal, cosméticos, fraldas, absorventes, alimentos, suplementos |

**Regra**: tem princípio ativo / cura doença → `medicamento`. Higiene/cosmética/alimento → `Perfumaria`.

Ver `CATEGORIAS.md` para guia completo.

---

## UI / UX

### Princípios
- **Mobile-first** — uso com uma mão, thumb zone
- **Visual limpo** — cards brancos, sombra suave, bordas arredondadas
- **Consistência** — paleta verde (`verde-50` a `verde-900`)
- **Feedback imediato** — estados de loading, erro, sucesso

### Componentes chave (`app/farmaceutico/page.tsx`)
- `ImgProduto` — imagem via wsrv.nl proxy com fallback gradiente
- `ControleQtd` — `[− | N | +]` com borda verde
- `ModalLaboratorios` — bottom sheet filtro por laboratório
- `ModalRevisao` — tela de revisão antes de confirmar
- `LogoGentil` — logo pill verde escuro

### Layout dos cards de produto
```
[Imagem] [Nome bold]
         [Badge Medicamento/Perfumaria] [Badge Fabricante]
         EAN: XXXXX
                                        [− | N | +]
```

### Barra inferior
```
[🛒 badge] X itens selecionados    [Enviar solicitação →]
```

---

## Períodos de Solicitação

```
antes 11h  → 'manha'
11h–20h    → 'noite'
após 20h   → 'encerrado' (bloqueado)
```

---

## Regras de Desenvolvimento

1. **Nunca adicionar colunas** sem SQL migration explícita via Supabase SQL Editor
2. **Filtros de categoria são server-side** — usar `.eq('categoria', cat)` na query, nunca filtrar no browser
3. **Paginação obrigatória** — banco tem 10k+ produtos, sempre usar loop com `.range(offset, offset + PAGE - 1)`
4. **Imagens sempre via proxy** — `viaProxy(url)` antes de renderizar qualquer `imagem_url`
5. **Nomes em title case** — ao inserir no banco
6. **Não duplicar por EAN** — usar `Prefer: resolution=ignore-duplicates` nos inserts

---

## Scripts Python (planilhas)

Localização: `C:\Users\magao\Downloads\planilhas\`

| Script | Função |
|---|---|
| `buscar_imagens_todos.py` | Busca imagens VTEX para produtos sem imagem (roda no PowerShell) |
| `buscar_imagens_vtex.py` | Versão anterior (medicamentos apenas) |
| `atualizar_v2.py` | Atualiza produtos do CSV v2 |
| `migrar_categorias.py` | Migração de categorias |

**Para rodar o buscador de imagens:**
```powershell
python "C:\Users\magao\Downloads\planilhas\buscar_imagens_todos.py"
```

---

## Deploy

```bash
npx vercel --prod
```

Sempre fazer `npx tsc --noEmit` antes do deploy para verificar tipos.

---

## Problemas Conhecidos / Histórico

- **2026-05-17**: Categorias unificadas — `cosmético` e `alimento` removidos, criada `Perfumaria`
- **2026-05-18**: Filtro de categoria movido para server-side (antes era client-side, causava produtos errados)
- **2026-05-18**: Paginação implementada — limite era 9999, banco passou de 10k produtos
- **Imagens**: ~60% dos produtos têm imagem via VTEX. Restantes sem imagem mostram placeholder colorido
- **Nomes truncados**: alguns nomes de produtos vêm truncados das planilhas originais XLS (limitação da fonte dos dados)
