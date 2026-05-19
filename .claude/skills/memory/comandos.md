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

## Logs dos scripts

```
C:\Users\magao\Downloads\planilhas\log_v3.txt       # log do v3
C:\Users\magao\Downloads\planilhas\log_todos.txt    # log do v2
C:\Users\magao\Downloads\planilhas\progresso_v3.json  # progresso v3
```
