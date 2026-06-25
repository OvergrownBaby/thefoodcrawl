-- Creator-upload tracker (Stages 1–3): channel registry + comment work-queue.
--
-- The webhook/cron (Vercel) only ever drives a row up to status 'ready'.
-- The separate cowork poster box (Stage 4) claims 'ready' rows, posts the
-- comment, and writes back 'posted' / 'removed' / 'failed'. Supabase is the
-- only seam between the two homes.

-- Channels we watch. Keyed by the stable YouTube channel_id (NOT the
-- name-slug used by `creators`, which is derived from the display name and
-- can collide / change).
create table if not exists tracked_channels (
  channel_id text primary key,                 -- e.g. UCyEd6QBSgat5kkC6svyjudA
  handle text,                                 -- e.g. @MarkWiens (informational)
  title text,                                  -- display name (informational)
  active boolean not null default true,
  websub_lease_expires_at timestamptz,         -- when the PuSH subscription lapses
  last_seen_video_id text,                     -- bare youtube id of newest seen upload
  last_polled_at timestamptz,                  -- last RSS-backfill poll
  created_at timestamptz not null default now()
);

-- One row per detected upload. Idempotent on video_id so duplicate WebSub
-- pushes and RSS-backfill re-discovery collapse to a single work item.
create table if not exists comment_queue (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,               -- "yt:VIDEOID" (matches videos.id)
  youtube_video_id text not null,              -- bare VIDEOID (for poster + survival check)
  channel_id text references tracked_channels(channel_id) on delete set null,
  status text not null default 'pending_extract'
    check (status in (
      'pending_extract',  -- detected, awaiting extraction
      'extracting',       -- ingestUrl running
      'ready',            -- comment composed, awaiting the poster box
      'posting',          -- poster box claimed it
      'posted',           -- comment is live
      'removed',          -- survival check found it gone (held/deleted)
      'failed',           -- gave up after retries
      'skipped'           -- extraction found 0 restaurants
    )),
  comment_text text,                           -- the composed comment (Stage 3 output)
  restaurants_count int,
  attempts int not null default 0,
  error text,
  posted_comment_id text,                      -- YouTube comment id, once posted
  posted_at timestamptz,
  checked_at timestamptz,                      -- last survival check
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comment_queue_status_idx on comment_queue(status);
create index if not exists comment_queue_channel_idx on comment_queue(channel_id);

-- Reuse the existing set_updated_at() trigger fn (defined in 0001_init.sql).
drop trigger if exists comment_queue_updated_at on comment_queue;
create trigger comment_queue_updated_at
  before update on comment_queue
  for each row
  execute function set_updated_at();

-- Service role needs explicit grants (auto-expose is off; see 0001_init.sql).
grant all on table tracked_channels, comment_queue to service_role;
