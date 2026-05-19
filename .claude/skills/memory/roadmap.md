# Roadmap — Gentil Filial

Atualizado em: 2026-05-19

## Feito ✅
- Paginação server-side (range loop, evita limite 9999)
- Filtro de categoria server-side (evita contaminação entre tabs)
- Script VTEX v1/v2 — busca de imagens por texto
- Script VTEX v3 — busca por EAN + Panvel + score 0.20 (criado, não rodado)
- Admin: dashboard com métricas, busca server-side, indicador de imagem
- Tela farmacêutico: loading spinner, toast de sucesso, empty state melhorado
- Tela gestor: spinner, touch targets maiores, SVG arrows, checkbox 44px
- globals.css: categoria-Perfumaria, animate-slide-down, pb-safe/pt-safe

## Curto Prazo 🔜
- **Rodar buscar_imagens_v3.py** — aumentar cobertura de 78% → ~88%
- **Infinite scroll server-side** na tela do farmacêutico — maior impacto de performance
- **Cache de imagens** via service worker (CacheFirst para wsrv.nl)

## Médio Prazo 📅
- Filtros avançados (nome do princípio ativo, forma farmacêutica)
- Histórico de solicitações por filial com exportação CSV
- Compressão de imagens (já usando wsrv.nl + webp, avaliar qualidade)

## Longo Prazo 🔮
- OCR para entrada de produtos via foto
- IA de reconhecimento de produto por imagem
- Integração direta com sistema de estoque da matriz
- Automações completas (reposição automática por histórico)
