-- arch schema: the client page wears the practice's brand (workspace redesign p1b). NOT APPLIED: an owner applies it.
-- Replaces arch.shared_project(text) with the same answer plus the practice's artwork record (extra.artwork: logo, drawings and
-- patterns, each a storage path under <practice id>/artwork/), so /api/arch-share can sign the logo in the look's ink. Nothing else
-- changes: still only for a token whose link an owner turned on, still executable by service_role only.
-- Reversible: re-run 20261123200000_arch_project_share.sql's definition of arch.shared_project.
create or replace function arch.shared_project(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when s.project_id is null then null else jsonb_build_object(
    'project', jsonb_build_object('id', p.id, 'name', p.name,
      'model', jsonb_build_object('fingerprint', p.model_fingerprint, 'file_name', p.model_file_name, 'file', p.extra -> 'model' -> 'file')),
    'practice', jsonb_build_object('name', pr.name, 'theme', pr.extra -> 'theme', 'artwork', pr.extra -> 'artwork'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'type', f.mime, 'size', f.size, 'owner_kind', f.owner_kind,
        'owner_id', f.owner_id, 'kept_at', f.created_at, 'extra', f.extra, 'path', f.storage_path) order by f.seq)
      from arch.file f where f.project_id = p.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'kind', d.kind, 'stage', d.stage, 'file', d.extra -> 'file'))
      from arch.document d where d.project_id = p.id), '[]'::jsonb)
  ) end
  from (select 1) one
  left join arch.project_share s on s.shared and s.token is not null and s.token = p_token and p_token ~ '^[a-f0-9]{64}$'
  left join arch.project p on p.id = s.project_id
  left join arch.practice pr on pr.id = p.practice_id
$$;
revoke all on function arch.shared_project(text) from public, anon, authenticated;
grant execute on function arch.shared_project(text) to service_role;
