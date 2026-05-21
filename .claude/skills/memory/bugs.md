# Bugs Conhecidos — Gentil Filial

Atualizado em: 2026-05-19

## Abertos

### Nomes corrompidos — 5 produtos com "Zzzzzz..." (baixo)
**Problema**: 5 produtos (IDs 9682–9686) ainda com nomes corrompidos no banco.
**EANs**: 7791293228501, 7891037010123, 7891037010116, 7891037156500, 7898422740610
**Causa**: EANs não cadastrados em nenhuma base pública (Open Food Facts, UPC Item DB, VTEX, Cosmos).
**Solução**: Preencher `C:\Users\magao\Downloads\planilhas\nomes_manuais.json` manualmente com os nomes e rodar `corrigir_nomes_zzz.py` (sem --dry-run).

### Imagens — ~22% dos produtos sem imagem (médio)
**Problema**: ~2.300 produtos ainda sem imagem_url.
**Causa**: Busca VTEX por texto tem 13% de sucesso em produtos com nomes internos/abreviados.
**Solução planejada**: Rodar buscar_imagens_v3.py (EAN-first). Script criado, não rodado.

### Settings — permissões apontam para scripts inexistentes (baixo)
**Problema**: `.claude/settings.local.json` permite `node scripts/preencher-imagens.js` e `node scripts/teste-busca.js`, mas a pasta `scripts/` não existe.
**Solução**: Criar os scripts Node ou remover as permissões.

### Settings — permissões apontam para scripts inexistentes (baixo)
**Problema**: `.claude/settings.local.json` permite `node scripts/preencher-imagens.js` e `node scripts/teste-busca.js`, mas a pasta `scripts/` não existe.
**Solução**: Criar os scripts Node ou remover as permissões.

## Resolvidos ✅

- ~~Performance — carga pesada (10+ chamadas)~~ → paginação server-side, 60 produtos/página, 1 chamada por página (2026-05-19)
- ~~Admin mostra só 500 produtos~~ → paginação server-side no admin (2026-05-19)
- ~~Admin edita só nome + categoria~~ → agora edita fabricante, codigo_barras, imagem_url + preview (2026-05-19)
- ~~Admin sem exportação~~ → botão Exportar CSV com UTF-8 BOM (2026-05-19)
- ~~Sem campo de comprimidos nos cards~~ → extrairForma() exibe qtd abaixo do EAN (2026-05-19)
- ~~Nome corrompido #9687 (EAN 7891041516109)~~ → corrigido para "Desodorante After Sport Night" (2026-05-19)
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
