# Roadmap — Gentil Filial

Atualizado em: 2026-05-19

## Feito ✅
- Paginação page-by-page (60 por página, botões 1 2 3…, 1 chamada Supabase ao invés de 10+) [2026-05-19]
- Admin: edição completa (fabricante, codigo_barras, imagem_url + preview thumb) [2026-05-19]
- Admin: exportar CSV com UTF-8 BOM (funciona direto no Excel) [2026-05-19]
- Admin: thumbnails nos cards de produto em vez de dot colorido [2026-05-19]
- Cards medicamento: campo de comprimidos abaixo do EAN (extrairForma) [2026-05-19]
- Corretor de nomes Zzz (corrigir_nomes_zzz.py) — 1/6 corrigido automaticamente [2026-05-19]
- Filtro de categoria server-side (evita contaminação entre tabs)
- Script VTEX v1/v2 — busca de imagens por texto
- Script VTEX v3 — busca por EAN + Panvel + score 0.20 (criado, não rodado)
- Admin: dashboard com métricas, busca server-side, indicador de imagem
- Tela farmacêutico: loading spinner, toast de sucesso, empty state melhorado
- Tela gestor: spinner, touch targets maiores, SVG arrows, checkbox 44px
- globals.css: categoria-Perfumaria, animate-slide-down, pb-safe/pt-safe

## Curto Prazo 🔜
- **Rodar buscar_imagens_v3.py** — aumentar cobertura de 78% → ~88%
- **Preencher nomes_manuais.json** — identificar os 5 EANs restantes e corrigir nomes Zzz
- **Cache de imagens** via service worker (CacheFirst para wsrv.nl)
- **Deploy** — `npx vercel --prod` após aprovação do usuário

## Médio Prazo 📅
- Filtros avançados (nome do princípio ativo, forma farmacêutica)
- Histórico de solicitações por filial com exportação CSV
- Compressão de imagens (já usando wsrv.nl + webp, avaliar qualidade)

## Longo Prazo 🔮
- OCR para entrada de produtos via foto
- IA de reconhecimento de produto por imagem
- Integração direta com sistema de estoque da matriz
- Automações completas (reposição automática por histórico)
