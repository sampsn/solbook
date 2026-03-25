-- Full-text search on comments
alter table public.comments
  add column fts_doc tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored;

create index comments_fts_idx on public.comments using gin(fts_doc);
