create table if not exists public.desenrola_cpf_consultas (
  id uuid primary key default gen_random_uuid(),
  cpf text not null,
  nome text,
  nascimento text,
  sexo text,
  mae text,
  status_api int,
  raw jsonb,
  consultado_em timestamptz not null default now()
);
create index if not exists desenrola_cpf_consultas_cpf_idx on public.desenrola_cpf_consultas(cpf);
grant all on public.desenrola_cpf_consultas to service_role;
alter table public.desenrola_cpf_consultas enable row level security;

create table if not exists public.desenrola_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  cpf text not null,
  nome text,
  codigo_acordo text not null unique,
  criado_em timestamptz not null default now()
);
create index if not exists desenrola_chat_sessions_cpf_idx on public.desenrola_chat_sessions(cpf);
grant all on public.desenrola_chat_sessions to service_role;
alter table public.desenrola_chat_sessions enable row level security;

create table if not exists public.desenrola_pix_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  cpf text not null,
  nome text,
  email text,
  phone text,
  amount_cents int not null,
  acordo text,
  status text not null default 'PENDING',
  qr_code text,
  qr_code_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  notified_gerado boolean not null default false,
  notified_aprovado boolean not null default false,
  gateway text not null default 'freepay',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists desenrola_pix_transactions_cpf_idx on public.desenrola_pix_transactions(cpf);
create index if not exists desenrola_pix_transactions_status_idx on public.desenrola_pix_transactions(status);
create index if not exists desenrola_pix_transactions_gateway_idx on public.desenrola_pix_transactions(gateway);
grant all on public.desenrola_pix_transactions to service_role;
alter table public.desenrola_pix_transactions enable row level security;

create table if not exists public.desenrola_settings (
  key text primary key,
  value text not null,
  atualizado_em timestamptz not null default now()
);
grant all on public.desenrola_settings to service_role;
alter table public.desenrola_settings enable row level security;
insert into public.desenrola_settings (key, value) values ('active_gateway', 'freepay')
  on conflict (key) do nothing;

create table if not exists public.desenrola_webhook_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id text,
  status text,
  payload jsonb not null,
  recebido_em timestamptz not null default now()
);
create index if not exists desenrola_webhook_events_txid_idx on public.desenrola_webhook_events(transaction_id);
grant all on public.desenrola_webhook_events to service_role;
alter table public.desenrola_webhook_events enable row level security;

create table if not exists public.desenrola_api_credentials (
  provider text primary key,
  public_key text,
  secret_key text not null,
  extra jsonb default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
grant all on public.desenrola_api_credentials to service_role;
alter table public.desenrola_api_credentials enable row level security;

create table if not exists public.desenrola_page_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  cpf text,
  nome text,
  acordo text,
  page text not null,
  step text not null,
  meta jsonb,
  ip text,
  user_agent text,
  referer text,
  criado_em timestamptz not null default now()
);
create index if not exists desenrola_page_events_session_idx on public.desenrola_page_events(session_id);
create index if not exists desenrola_page_events_cpf_idx on public.desenrola_page_events(cpf);
create index if not exists desenrola_page_events_criado_em_idx on public.desenrola_page_events(criado_em);
grant all on public.desenrola_page_events to service_role;
alter table public.desenrola_page_events enable row level security;

create table if not exists public.desenrola_comprovantes (
  id uuid primary key default gen_random_uuid(),
  transaction_id text,
  acordo text,
  cpf text,
  nome text,
  filename text,
  mime text,
  size_bytes int,
  data_base64 text not null,
  ip text,
  criado_em timestamptz not null default now()
);
create index if not exists desenrola_comprovantes_txid_idx on public.desenrola_comprovantes(transaction_id);
create index if not exists desenrola_comprovantes_cpf_idx on public.desenrola_comprovantes(cpf);
grant all on public.desenrola_comprovantes to service_role;
alter table public.desenrola_comprovantes enable row level security;

create table if not exists public.desenrola_ads_pixels (
  id uuid primary key default gen_random_uuid(),
  nome text,
  ads_id text not null,
  conversion_label text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (ads_id, conversion_label)
);
create index if not exists desenrola_ads_pixels_ativo_idx on public.desenrola_ads_pixels(ativo);
grant all on public.desenrola_ads_pixels to service_role;
alter table public.desenrola_ads_pixels enable row level security;

insert into public.desenrola_ads_pixels (nome, ads_id, conversion_label)
values
  ('Pixel 1', 'AW-18264524234', 'Fl77CPCs5sMcEMqLmoVE'),
  ('Pixel 2', 'AW-18311126218', 'XTZXCOWH2M0cEMq5tptE')
on conflict (ads_id, conversion_label) do nothing;
