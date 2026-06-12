-- =============================================================
-- Gym-Tracker Coach-Plattform — Supabase Schema + RLS
-- Im Supabase SQL-Editor ausführen (einmalig).
-- =============================================================

-- ---------- Tabellen ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'coach' check (role in ('coach','client')),
  display_name text,
  created_at timestamptz not null default now()
);

-- Profil automatisch beim Signup anlegen (Rolle aus Signup-Metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'coach'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.coach_clients (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  -- Hinweis: Postgres' encode() kennt kein 'base64url', daher translate()
  code text not null unique default translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_'),
  email text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_by uuid references public.profiles(id) on delete set null
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade, -- null = globaler wger-Import
  wger_id int unique,
  name_de text not null,
  muscle_group text,
  image_url text,
  license text,
  license_author text,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade, -- null = Template; gesetzt = zugewiesene Kopie
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  default_sets int not null default 3,
  position int not null default 0
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  plan_name text,
  date timestamptz not null default now(),
  notes text,
  completed boolean not null default true
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_number int,
  weight numeric,
  reps int
);

-- Die "Akte": Coach-Notizen pro Kunde (für den Kunden nicht sichtbar)
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index sessions_user_date_idx on public.sessions (user_id, date desc);
create index sets_session_idx on public.sets (session_id);
create index plan_exercises_plan_idx on public.plan_exercises (plan_id, position);
create index plans_owner_idx on public.plans (owner_id);
create index plans_client_idx on public.plans (client_id);
create index client_notes_client_idx on public.client_notes (coach_id, client_id, created_at desc);

-- ---------- Helper ----------

create or replace function public.is_coach_of(c uuid)
returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from coach_clients where coach_id = auth.uid() and client_id = c) $$;

create or replace function public.is_client_of(co uuid)
returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from coach_clients where coach_id = co and client_id = auth.uid()) $$;

-- ---------- RPCs ----------

-- Einladung annehmen: validiert Code, verknüpft Kunde mit Coach, setzt Rolle.
create or replace function public.accept_invitation(invite_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
begin
  select * into inv from invitations
    where code = invite_code and accepted_by is null and expires_at > now();
  if not found then
    raise exception 'Einladung ungültig oder abgelaufen';
  end if;
  if inv.coach_id = auth.uid() then
    raise exception 'Eigene Einladung kann nicht angenommen werden';
  end if;

  insert into coach_clients (coach_id, client_id)
    values (inv.coach_id, auth.uid())
    on conflict do nothing;
  update profiles set role = 'client' where id = auth.uid();
  update invitations set accepted_by = auth.uid() where id = inv.id;
end $$;

-- Template-Plan einem Kunden zuweisen: kopiert Plan + Übungen (client_id gesetzt).
create or replace function public.assign_plan_to_client(p_plan_id uuid, p_client_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_plan_id uuid;
begin
  if not exists(select 1 from coach_clients where coach_id = auth.uid() and client_id = p_client_id) then
    raise exception 'Kein Kunde dieses Coaches';
  end if;
  if not exists(select 1 from plans where id = p_plan_id and owner_id = auth.uid()) then
    raise exception 'Plan nicht gefunden';
  end if;

  insert into plans (owner_id, client_id, name, description)
    select owner_id, p_client_id, name, description from plans where id = p_plan_id
    returning id into new_plan_id;

  insert into plan_exercises (plan_id, exercise_id, exercise_name, default_sets, position)
    select new_plan_id, exercise_id, exercise_name, default_sets, position
    from plan_exercises where plan_id = p_plan_id;

  return new_plan_id;
end $$;

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.coach_clients enable row level security;
alter table public.invitations enable row level security;
alter table public.exercises enable row level security;
alter table public.plans enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.sets enable row level security;
alter table public.client_notes enable row level security;

-- profiles: eigenes Profil + Profile der eigenen Kunden/des eigenen Coaches lesen
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or is_coach_of(id) or is_client_of(id));
create policy profiles_update on public.profiles for update
  using (id = auth.uid());

-- coach_clients: lesen für beide Seiten; löschen nur Coach; Insert nur via RPC (security definer)
create policy coach_clients_select on public.coach_clients for select
  using (coach_id = auth.uid() or client_id = auth.uid());
create policy coach_clients_delete on public.coach_clients for delete
  using (coach_id = auth.uid());

-- invitations: nur der Coach verwaltet seine Einladungen
create policy invitations_all on public.invitations for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- exercises: globale (owner null) + eigene + die des eigenen Coaches lesen; eigene schreiben
create policy exercises_select on public.exercises for select
  using (owner_id is null or owner_id = auth.uid() or is_client_of(owner_id) or is_coach_of(owner_id));
create policy exercises_insert on public.exercises for insert
  with check (owner_id = auth.uid());
create policy exercises_update on public.exercises for update
  using (owner_id = auth.uid());
create policy exercises_delete on public.exercises for delete
  using (owner_id = auth.uid());

-- plans: Owner voll; Kunde liest zugewiesene; Coach liest/ändert Pläne eigener Kunden
create policy plans_select on public.plans for select
  using (owner_id = auth.uid() or client_id = auth.uid() or (client_id is not null and is_coach_of(client_id)));
create policy plans_insert on public.plans for insert
  with check (owner_id = auth.uid() and (client_id is null or is_coach_of(client_id)));
create policy plans_update on public.plans for update
  using (owner_id = auth.uid() or (client_id is not null and is_coach_of(client_id)));
create policy plans_delete on public.plans for delete
  using (owner_id = auth.uid());

-- plan_exercises: über den Eltern-Plan
create policy plan_exercises_select on public.plan_exercises for select
  using (exists(select 1 from plans p where p.id = plan_id
    and (p.owner_id = auth.uid() or p.client_id = auth.uid() or (p.client_id is not null and is_coach_of(p.client_id)))));
create policy plan_exercises_write on public.plan_exercises for insert
  with check (exists(select 1 from plans p where p.id = plan_id
    and (p.owner_id = auth.uid() or (p.client_id is not null and is_coach_of(p.client_id)))));
create policy plan_exercises_update on public.plan_exercises for update
  using (exists(select 1 from plans p where p.id = plan_id
    and (p.owner_id = auth.uid() or (p.client_id is not null and is_coach_of(p.client_id)))));
create policy plan_exercises_delete on public.plan_exercises for delete
  using (exists(select 1 from plans p where p.id = plan_id
    and (p.owner_id = auth.uid() or (p.client_id is not null and is_coach_of(p.client_id)))));

-- sessions: User voll auf eigene; Coach liest die seiner Kunden
create policy sessions_select on public.sessions for select
  using (user_id = auth.uid() or is_coach_of(user_id));
create policy sessions_insert on public.sessions for insert
  with check (user_id = auth.uid());
create policy sessions_update on public.sessions for update
  using (user_id = auth.uid());
create policy sessions_delete on public.sessions for delete
  using (user_id = auth.uid());

-- sets: über die Eltern-Session
create policy sets_select on public.sets for select
  using (exists(select 1 from sessions s where s.id = session_id
    and (s.user_id = auth.uid() or is_coach_of(s.user_id))));
create policy sets_insert on public.sets for insert
  with check (exists(select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy sets_update on public.sets for update
  using (exists(select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy sets_delete on public.sets for delete
  using (exists(select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));

-- client_notes (Akte): ausschließlich der Coach
create policy client_notes_all on public.client_notes for all
  using (coach_id = auth.uid() and is_coach_of(client_id))
  with check (coach_id = auth.uid() and is_coach_of(client_id));

-- ---------- Storage ----------
-- Bucket "exercise-images" (public) manuell anlegen oder:
insert into storage.buckets (id, name, public)
  values ('exercise-images', 'exercise-images', true)
  on conflict do nothing;
