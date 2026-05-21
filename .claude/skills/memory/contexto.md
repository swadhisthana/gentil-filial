# Gentil Filial — Contexto do Projeto

Sistema interno mobile-first para solicitação de transferência de estoque entre filiais.

## Tecnologias
- Next.js 14 App Router + TypeScript
- Supabase (PostgreSQL, anon key, sem auth)
- Tailwind CSS + classes customizadas `verde-*`
- Vercel (deploy)
- localStorage (sessão)

## Objetivos
- Rapidez operacional mobile (uma mão, thumb zone)
- Catálogo visual com imagens reais dos produtos
- Fluxo solicitante → estoquista simples e robusto

## Status Atual (2026-05-19)
- ~10.467 produtos no banco (5 com nome "Zzzzz..." pendentes de correção manual)
- ~8.167 produtos com imagem (78%) — ~2.300 sem imagem, aguardando v3 script
- Paginação: 60 produtos por página, 1 chamada Supabase (antes: 10+ chamadas)
- Admin: edição completa (fabricante, EAN, imagem, CSV export, preview)
- Cards medicamento: mostram qtd comprimidos extraída do nome

## Perfis
- `farmaceutico` (= solicitante): seleciona produtos, envia solicitação
- `gestor` (= estoquista): recebe, separa, conclui solicitações

## Períodos de solicitação
- antes 11h → 'manha'
- 11h–20h → 'noite'
- após 20h → 'encerrado' (bloqueado)

## Prioridades Atuais
1. Deploy (`npx vercel --prod` na pasta do projeto)
2. Rodar `buscar_imagens_v3.py` para aumentar cobertura de imagens
3. Identificar manualmente os 5 EANs restantes e preencher `nomes_manuais.json`
4. Cache local de imagens (service worker)

## Arquivos Python (planilhas)
`C:\Users\magao\Downloads\planilhas\`
- `buscar_imagens_v3.py` — busca imagens por EAN (rodar fora do Claude Code)
- `corrigir_nomes_zzz.py` — corrige nomes corrompidos (5 pendentes)
- `nomes_manuais.json` — override manual de EAN → nome (preencher para os 5 restantes)
