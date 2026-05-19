# Bugs Conhecidos — Gentil Filial

Atualizado em: 2026-05-19

## Abertos

### Performance — Carga inicial pesada (crítico)
**Problema**: A tela do farmacêutico faz 10+ chamadas Supabase sequenciais para carregar todos os produtos antes de renderizar qualquer coisa. Em 4G fraco leva 6–10s.
**Causa**: Loop `while(true)` com `.range()` carrega todos os 10k+ produtos de uma vez.
**Solução planejada**: Infinite scroll server-side — carregar 60 por vez com IntersectionObserver.

### Imagens — 22% dos produtos sem imagem (médio)
**Problema**: ~2.300 produtos ainda sem imagem_url.
**Causa**: Busca VTEX por texto tem 13% de sucesso em produtos com nomes internos/abreviados.
**Solução planejada**: Rodar buscar_imagens_v3.py (EAN-first). Script criado, não rodado.

### Settings — permissões apontam para scripts inexistentes (baixo)
**Problema**: `.claude/settings.local.json` permite `node scripts/preencher-imagens.js` e `node scripts/teste-busca.js`, mas a pasta `scripts/` não existe.
**Solução**: Criar os scripts Node ou remover as permissões.

## Resolvidos ✅

- ~~Busca VTEX falha em nomes com abreviações~~ → v3 usa EAN-first (mais preciso)
- ~~Produtos Perfumaria aparecendo em Medicamentos~~ → filtro movido para server-side
- ~~Limite de 9999 produtos bloqueava catálogo completo~~ → paginação com range loop
- ~~Farmacêuticos com Ciclobenzaprina em Perfumaria~~ → bug de client-side filter corrigido
- ~~categoria-Perfumaria sem CSS badge~~ → adicionado em globals.css
- ~~Loading screen verde-900 vazio~~ → spinner animado
- ~~Gestor sair() sem confirmação~~ → confirm() adicionado
- ~~Admin busca só em 500 produtos cacheados~~ → busca server-side com ilike + debounce
- ~~Admin sem loading state~~ → spinner adicionado
- ~~Checkbox "encontrado" com área de toque insuficiente~~ → expandido para 44×44px
