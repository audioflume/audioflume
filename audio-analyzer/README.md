# Filmwave Audio Analyzer

Python service for detecting basic edit-point markers from uploaded Filmwave songs.

## Local setup

```bash
cd audio-analyzer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANALYZER_SECRET=your_long_random_secret
```

Run the service:

```bash
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Analyze one song:

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -H "x-analyzer-secret: your_long_random_secret" \
  -d '{
    "songId": "your-song-id",
    "audioUrl": "https://your-audio-file-url.mp3"
  }'
```

## Next.js env vars

Add these to the main Filmwave app:

```env
AUDIO_ANALYZER_URL=http://localhost:8000
AUDIO_ANALYZER_SECRET=your_long_random_secret
```

Use the same `AUDIO_ANALYZER_SECRET` value as `ANALYZER_SECRET` in this service.

## Supabase

Run the migration in:

```txt
supabase/migrations/20260518000000_create_song_edit_points.sql
```

The analyzer deletes previous `source = auto` rows for the song and inserts the latest detected markers.
