# Setup — FinançasPessoais App

## 1. Supabase — Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key

## 2. Configurar variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 3. Criar tabela no Supabase

No painel do Supabase, vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`:

```sql
-- Cole o conteúdo de supabase/schema.sql aqui
```

Ou abra o arquivo e cole todo o conteúdo no SQL Editor.

## 4. Configurar Autenticação

No Supabase, vá em **Authentication → Providers** e confirme que **Email** está habilitado.

Para desenvolvimento local (sem confirmação de email), vá em  
**Authentication → Email Templates → Confirm signup** e desabilite "Enable email confirmations".

## 5. Rodar o projeto

```bash
cd financas-app
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 6. Deploy na Vercel

1. Faça push para o GitHub
2. Importe o repositório na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!
