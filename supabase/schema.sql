-- Tabela de transações
create table if not exists public.transactions (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references auth.users(id) on delete cascade,
  type        text         not null check (type in ('income', 'expense')),
  amount      numeric      not null check (amount > 0),
  category    text         not null,
  description text,
  date        date         not null,
  created_at  timestamptz  default now()
);

-- Índices para performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(date);

-- Habilitar Row Level Security
alter table public.transactions enable row level security;

-- Política: usuário acessa apenas suas próprias transações
create policy "users_own_transactions" on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
