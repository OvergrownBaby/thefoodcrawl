# Foodcrawl comment poster (Stages 4 + 5)

Persistent worker that drains `comment_queue` rows at status `ready`, posts the
comment on YouTube via Playwright (logged-in session), and later checks the
comment survived. Runs on the Ubuntu box, **not** Vercel.

## Setup on the box (headless Ubuntu)

```bash
# 1. deps
sudo apt-get update && sudo apt-get install -y xvfb
npm ci
npx playwright install --with-deps chromium

# 2. config
cp worker/.env.example worker/.env
#   → fill SUPABASE_SECRET_KEY (Supabase dashboard → API → service_role/secret key)

# 3. logged-in session
#   easiest: capture on a machine with a screen, then copy it here:
#     (laptop)  npx tsx worker/login-capture.ts worker/yt-state.json
#     (laptop)  scp worker/yt-state.json  box:~/foodmap/worker/yt-state.json
#   or, if Google challenges the laptop cookies on the box IP, run login-capture
#   over VNC on the box itself.
```

## Test before going live

```bash
# deterministic parts (no browser, no posting) — should print ALL SELFTESTS PASSED
npx tsx worker/selftest.ts

# one real post to a THROWAWAY video you control (validates login + post flow)
xvfb-run -a npx tsx worker/test-post.ts <yourTestVideoId> "test from foodcrawl 🗺️"
```

## Run the loop

```bash
# foreground
xvfb-run -a npx tsx worker/index.ts

# or under pm2 (persistent)
pm2 start "xvfb-run -a npx tsx worker/index.ts" --name foodcrawl-poster
pm2 logs foodcrawl-poster
```

## Notes
- `HEADLESS=false` + `xvfb-run` = a real headful browser on a screenless box (less bot-detectable than pure headless).
- Rate caps (`POST_*`) are conservative defaults; tune in `worker/.env`.
- If posting starts failing with `NOT_LOGGED_IN`, the session expired — re-capture `yt-state.json`.
- Selectors live in `worker/youtube.ts`; if YouTube changes its comment DOM, adjust there.
