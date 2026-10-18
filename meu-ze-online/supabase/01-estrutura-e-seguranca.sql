-- Execute uma vez em: Supabase > SQL Editor > New query > Run.
-- O feed e os perfis só ficam disponíveis a quem entrar por convite.
-- Não cole senhas de usuários, chaves service_role ou tokens aqui.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table if not exists private.access_codes (
  code text primary key check (char_length(code) between 20 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Novo Zé' check (char_length(name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 300),
  theme text not null default '{}' check (octet_length(theme) <= 3000000)
);

create table if not exists public.posts (
  id uuid primary key,
  author uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  title text not null default '' check (char_length(title) <= 100),
  emoji text not null default '✦' check (char_length(emoji) <= 12),
  scene text not null default 'geral' check (scene in ('geral','musica','cinema','aleatorio')),
  image text not null default '' check (octet_length(image) <= 1200000),
  created bigint not null
);
create index if not exists posts_created_idx on public.posts(created desc);
create index if not exists posts_author_idx on public.posts(author);

create table if not exists public.likes (
  post uuid not null references public.posts(id) on delete cascade,
  "user" uuid not null references auth.users(id) on delete cascade,
  primary key(post, "user")
);
create index if not exists likes_user_idx on public.likes("user");

create table if not exists public.comments (
  id uuid primary key,
  post uuid not null references public.posts(id) on delete cascade,
  author uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created bigint not null
);
create index if not exists comments_post_idx on public.comments(post);

-- Acesso ao grupo: SECURITY DEFINER apenas em schema NÃO exposto pelo Data API.
create or replace function private.is_meu_ze_member() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.members where user_id = (select auth.uid()));
$$;
revoke all on function private.is_meu_ze_member() from public, anon;
grant execute on function private.is_meu_ze_member() to authenticated;

-- Quem souber o código pode ingressar APENAS com a própria conta autenticada.
create or replace function private.accept_meu_ze_invite(p_code text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or p_code is null or length(p_code)>120 then
    return false;
  end if;
  if not exists(select 1 from private.access_codes where code = p_code and active) then
    return false;
  end if;
  insert into public.members(user_id) values(uid) on conflict do nothing;
  insert into public.profiles(id,name,bio,theme)
    values(uid, 'Novo Zé', '', '{}') on conflict (id) do nothing;
  return true;
end;
$$;
revoke all on function private.accept_meu_ze_invite(text) from public, anon;
grant execute on function private.accept_meu_ze_invite(text) to authenticated;

-- O cliente chama a função pública; ela não tem privilégio elevado.
create or replace function public.join_meu_ze(invite_code text) returns boolean
language sql security invoker set search_path = ''
as $$ select private.accept_meu_ze_invite(invite_code) $$;
revoke all on function public.join_meu_ze(text) from public, anon;
grant execute on function public.join_meu_ze(text) to authenticated;

alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- A tabela de convites é privada por schema e sem permissões de leitura.
revoke all on all tables in schema private from anon, authenticated;

-- Evita privilégios acidentais do papel anon.
revoke all on public.members, public.profiles, public.posts, public.likes, public.comments from anon;
grant select on public.members to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,delete on public.posts to authenticated;
grant select,insert,delete on public.likes to authenticated;
grant select,insert on public.comments to authenticated;

-- Migration rerunnable: políticas independentes recriadas.
drop policy if exists "member self lookup" on public.members;
create policy "member self lookup" on public.members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "group reads profiles" on public.profiles;
create policy "group reads profiles" on public.profiles for select to authenticated
  using ((select private.is_meu_ze_member()));
drop policy if exists "owner creates profile" on public.profiles;
create policy "owner creates profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and (select private.is_meu_ze_member()));
drop policy if exists "owner edits profile" on public.profiles;
create policy "owner edits profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select private.is_meu_ze_member()))
  with check (id = (select auth.uid()) and (select private.is_meu_ze_member()));

drop policy if exists "group reads posts" on public.posts;
create policy "group reads posts" on public.posts for select to authenticated
  using ((select private.is_meu_ze_member()));
drop policy if exists "author creates post" on public.posts;
create policy "author creates post" on public.posts for insert to authenticated
  with check (author = (select auth.uid()) and (select private.is_meu_ze_member()));
drop policy if exists "author deletes post" on public.posts;
create policy "author deletes post" on public.posts for delete to authenticated
  using (author = (select auth.uid()) and (select private.is_meu_ze_member()));

drop policy if exists "group reads likes" on public.likes;
create policy "group reads likes" on public.likes for select to authenticated
  using ((select private.is_meu_ze_member()));
drop policy if exists "member likes" on public.likes;
create policy "member likes" on public.likes for insert to authenticated
  with check ("user" = (select auth.uid()) and (select private.is_meu_ze_member()));
drop policy if exists "member unlikes" on public.likes;
create policy "member unlikes" on public.likes for delete to authenticated
  using ("user" = (select auth.uid()) and (select private.is_meu_ze_member()));

drop policy if exists "group reads comments" on public.comments;
create policy "group reads comments" on public.comments for select to authenticated
  using ((select private.is_meu_ze_member()));
drop policy if exists "member comments" on public.comments;
create policy "member comments" on public.comments for insert to authenticated
  with check (author = (select auth.uid()) and (select private.is_meu_ze_member()));

-- SEGUNDO PASSO: crie o código manualmente usando 02-criar-convite.sql.
