# 🟢 Gentil Filial — Instruções de Configuração e Deploy

## 1. Configurar o Supabase (banco de dados gratuito)

### 1.1 Criar conta e projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `gentil-filial`
   - **Database Password:** anote uma senha segura
   - **Region:** South America (São Paulo)
4. Aguarde ~2 minutos para o projeto ficar pronto

### 1.2 Executar o script SQL
1. No painel do Supabase, clique em **"SQL Editor"** (ícone de banco de dados no menu lateral)
2. Clique em **"New Query"**
3. Abra o arquivo `supabase-setup.sql` deste projeto
4. Cole todo o conteúdo no editor
5. Clique em **"Run"** (▶)
6. Você verá a confirmação de sucesso

### 1.3 Pegar as chaves de API
1. No menu lateral, clique em **"Project Settings"** → **"API"**
2. Copie:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon / public key** (a chave longa que começa com `eyJ...`)

---

## 2. Configurar o projeto Next.js

### 2.1 Pré-requisitos
- Node.js 18+ instalado ([nodejs.org](https://nodejs.org))
- Git instalado

### 2.2 Instalar dependências
```bash
cd gentil-filial
npm install
```

### 2.3 Criar arquivo de variáveis de ambiente
Copie o arquivo de exemplo:
```bash
cp .env.local.example .env.local
```

Edite o `.env.local` com suas chaves do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 2.4 Gerar ícones PWA
Coloque dois arquivos PNG na pasta `public/icons/`:
- `icon-192x192.png` (192×192 pixels)
- `icon-512x512.png` (512×512 pixels)

> Dica: use o site [favicon.io](https://favicon.io) para gerar ícones rapidamente com as letras "GF".

### 2.5 Testar localmente
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000)

---

## 3. Publicar na Vercel (hospedagem gratuita)

### 3.1 Subir código no GitHub
1. Crie uma conta no [GitHub](https://github.com) se não tiver
2. Crie um novo repositório chamado `gentil-filial` (privado recomendado)
3. No terminal, dentro da pasta do projeto:
```bash
git init
git add .
git commit -m "Primeiro commit — Gentil Filial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/gentil-filial.git
git push -u origin main
```

### 3.2 Deploy na Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `gentil-filial`
4. Em **"Environment Variables"**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = (sua URL do Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (sua chave anon)
5. Clique em **"Deploy"**
6. Aguarde ~2 minutos

Pronto! Você receberá um link como `https://gentil-filial.vercel.app`

---

## 4. Instalar como app no celular (PWA)

### Android (Chrome)
1. Acesse o link do app no Chrome
2. Toque nos 3 pontos → **"Adicionar à tela inicial"**

### iPhone (Safari)
1. Acesse o link no Safari
2. Toque no botão de compartilhar (ícone de caixa com seta)
3. Toque em **"Adicionar à Tela de Início"**

---

## 5. Usuários e senhas padrão

| Usuário    | Senha      | Tipo           | Filial    |
|------------|------------|----------------|-----------|
| `gestor`   | `gentil2024` | Gestor       | —         |
| `filial1`  | `filial1`  | Farmacêutico   | FILIAL 1  |
| `filial2`  | `filial2`  | Farmacêutico   | FILIAL 2  |
| `filial3`  | `filial3`  | Farmacêutico   | FILIAL 3  |
| `filial4`  | `filial4`  | Farmacêutico   | FILIAL 4  |
| `filial5`  | `filial5`  | Farmacêutico   | FILIAL 5  |
| `filial6`  | `filial6`  | Farmacêutico   | FILIAL 6  |
| `filial7`  | `filial7`  | Farmacêutico   | FILIAL 7  |
| `filial8`  | `filial8`  | Farmacêutico   | FILIAL 8  |
| `filial9`  | `filial9`  | Farmacêutico   | FILIAL 9  |
| `filial10` | `filial10` | Farmacêutico   | FILIAL 10 |

> **Importante:** Troque todas as senhas após o primeiro acesso editando diretamente na tabela `usuarios` no painel do Supabase.

---

## 6. Como adicionar/remover produtos

No painel do Supabase:
1. Vá em **"Table Editor"** → tabela `produtos`
2. Clique em **"Insert Row"** para adicionar
3. Preencha: `nome` e `categoria` (medicamento, cosmético ou alimento)

---

## 7. Estrutura do projeto

```
gentil-filial/
├── app/
│   ├── page.tsx              # Tela de login
│   ├── layout.tsx            # Layout global + PWA
│   ├── globals.css           # Estilos Tailwind
│   ├── farmaceutico/
│   │   └── page.tsx          # Tela do farmacêutico
│   └── gestor/
│       └── page.tsx          # Painel do gestor
├── lib/
│   └── supabase.ts           # Cliente Supabase + tipos
├── public/
│   ├── manifest.json         # Configuração PWA
│   └── icons/                # Ícones do app
├── supabase-setup.sql        # Script do banco de dados
├── INSTRUCOES.md             # Este arquivo
└── .env.local.example        # Variáveis de ambiente (modelo)
```
