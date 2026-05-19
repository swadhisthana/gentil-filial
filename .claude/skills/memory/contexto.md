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
- ~10.467 produtos no banco
- ~8.167 produtos com imagem (78%)
- ~2.300 ainda sem imagem (aguardando v3 script)
- Script v3 (EAN + mais lojas) criado: buscar_imagens_v3.py
- Admin: dashboard, busca server-side, indicador de imagem implementados

## Perfis
- `farmaceutico` (= solicitante): seleciona produtos, envia solicitação
- `gestor` (= estoquista): recebe, separa, conclui solicitações

## Períodos de solicitação
- antes 11h → 'manha'
- 11h–20h → 'noite'
- após 20h → 'encerrado' (bloqueado)

## Prioridades Atuais
1. Rodar buscar_imagens_v3.py para aumentar cobertura de imagens
2. Performance (lazy loading, virtual scroll em listas longas)
3. Cache local de imagens
