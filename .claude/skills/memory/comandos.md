# Comandos Úteis — Gentil Filial

## Desenvolvimento

```powershell
# Rodar projeto localmente
npm run dev

# Verificar tipos TypeScript (sempre antes do deploy)
npx tsc --noEmit

# Deploy para produção
npx vercel --prod
```

## Imagens — Scripts Python

```powershell
# Busca imagens para produtos sem imagem_url (versão mais recente)
# EAN-first + Panvel + score 0.20
python "C:\Users\magao\Downloads\planilhas\buscar_imagens_v3.py"

# Rodar do zero (ignora progresso anterior)
python "C:\Users\magao\Downloads\planilhas\buscar_imagens_v3.py" --reset

# Versão anterior (texto only, mais lenta, menor taxa de sucesso)
python "C:\Users\magao\Downloads\planilhas\buscar_imagens_todos.py"
```

## Dependências

```powershell
npm install
```

## Git

```powershell
git status
git add .
git commit -m "mensagem"
git push
```

## Correção de nomes corrompidos (Zzz)

```powershell
# Dry-run (mostra o que faria, sem salvar)
python "C:\Users\magao\Downloads\planilhas\corrigir_nomes_zzz.py" --dry-run

# Produção (salva no banco)
python "C:\Users\magao\Downloads\planilhas\corrigir_nomes_zzz.py"

# Com token Cosmos Bluesoft (base brasileira 26M+ produtos — token grátis)
$env:COSMOS_TOKEN="seu_token_aqui"
python "C:\Users\magao\Downloads\planilhas\corrigir_nomes_zzz.py"
```

Editar manualmente: `C:\Users\magao\Downloads\planilhas\nomes_manuais.json`
5 EANs pendentes: 7791293228501, 7891037010123, 7891037010116, 7891037156500, 7898422740610

## Logs dos scripts

```
C:\Users\magao\Downloads\planilhas\log_v3.txt                  # log do v3
C:\Users\magao\Downloads\planilhas\log_todos.txt               # log do v2
C:\Users\magao\Downloads\planilhas\progresso_v3.json           # progresso v3
C:\Users\magao\Downloads\planilhas\corrigir_nomes_zzz_log.txt  # log do corretor de nomes
```
