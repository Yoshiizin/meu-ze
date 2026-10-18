-- MEU ZÉ 2.0 — executar UMA VEZ no SQL Editor do Supabase.
-- Preserva contas, posts, comentários e personalizações existentes.

alter table public.posts add column if not exists media jsonb not null default '[]'::jsonb;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint no_self_chat check (recipient is null or recipient <> sender)
);
create index if not exists chat_general_idx on public.chat_messages(created_at desc) where recipient is null;
create index if not exists chat_private_idx on public.chat_messages(sender,recipient,created_at desc);
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon;
grant select,insert on public.chat_messages to authenticated;
drop policy if exists "chat members read" on public.chat_messages;
create policy "chat members read" on public.chat_messages for select to authenticated
using ((select private.is_meu_ze_member()) and (recipient is null or sender=(select auth.uid()) or recipient=(select auth.uid())));
drop policy if exists "chat members send" on public.chat_messages;
create policy "chat members send" on public.chat_messages for insert to authenticated
with check ((select private.is_meu_ze_member()) and sender=(select auth.uid()) and
 (recipient is null or exists (select 1 from public.members where user_id=recipient)));

-- Bucket público para conteúdo que o usuário DECIDIU publicar.
-- Os arquivos são públicos para quem conhece a URL: NÃO usar para dados sensíveis.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('meuze-media','meuze-media',true,36700160,
array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/ogg'])
on conflict(id) do update set public=true,file_size_limit=36700160,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "members upload own media" on storage.objects;
create policy "members upload own media" on storage.objects for insert to authenticated
with check (bucket_id='meuze-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select private.is_meu_ze_member()));
drop policy if exists "members remove own media" on storage.objects;
create policy "members remove own media" on storage.objects for delete to authenticated
using (bucket_id='meuze-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select private.is_meu_ze_member()));
