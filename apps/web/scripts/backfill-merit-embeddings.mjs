import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const analyzerUrl = process.env.AUDIO_ANALYZER_URL?.replace(/\/$/, "");
const analyzerSecret = process.env.AUDIO_ANALYZER_SECRET;

const model = "amaai-lab/merit:mert-v1-330m:3x10s:v1";
const dimensions = 128;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!analyzerUrl) throw new Error("Missing AUDIO_ANALYZER_URL");
if (!analyzerSecret) throw new Error("Missing AUDIO_ANALYZER_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getStats() {
  const { data, error } = await supabase.rpc(
    "get_song_merit_embedding_stats",
    {
      p_model: model,
      p_dimensions: dimensions,
    },
  );

  if (error) throw error;
  const row = data?.[0] ?? {};

  return {
    published: Number(row.published_songs ?? 0),
    embedded: Number(row.embedded_songs ?? 0),
    pending: Number(row.pending_songs ?? 0),
  };
}

async function getNextCandidate() {
  const { data, error } = await supabase.rpc(
    "list_song_merit_embedding_candidates",
    {
      p_limit: 1,
      p_model: model,
      p_dimensions: dimensions,
    },
  );

  if (error) throw error;

  const row = data?.[0];
  if (!row?.song_id || !row?.source_url) return null;

  return {
    songId: String(row.song_id),
    sourceUrl: String(row.source_url),
  };
}

async function createEmbeddings(sourceUrl) {
  const response = await fetch(`${analyzerUrl}/merit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-analyzer-secret": analyzerSecret,
    },
    body: JSON.stringify({ audioUrl: sourceUrl }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.detail ||
        `MERIT analyzer request failed with ${response.status}`,
    );
  }

  for (const factor of ["melody", "rhythm", "timbre"]) {
    if (!Array.isArray(result?.[factor]) || result[factor].length !== dimensions) {
      throw new Error(`Invalid MERIT ${factor} embedding`);
    }
  }

  return result;
}

async function upsert(candidate, embeddings) {
  const { error } = await supabase.rpc(
    "upsert_song_merit_embeddings",
    {
      p_song_id: candidate.songId,
      p_melody_embedding: embeddings.melody,
      p_rhythm_embedding: embeddings.rhythm,
      p_timbre_embedding: embeddings.timbre,
      p_model: model,
      p_dimensions: dimensions,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

let stats = await getStats();
console.log(
  `MERIT backfill: published=${stats.published} embedded=${stats.embedded} pending=${stats.pending}`,
);

while (stats.pending > 0) {
  const candidate = await getNextCandidate();
  if (!candidate) break;

  console.log(`Analyzing ${candidate.songId}...`);
  const embeddings = await createEmbeddings(candidate.sourceUrl);
  await upsert(candidate, embeddings);

  stats = await getStats();
  console.log(
    `Embedded ${candidate.songId} — embedded=${stats.embedded} pending=${stats.pending}`,
  );
}

console.log(
  `MERIT backfill complete: embedded=${stats.embedded} pending=${stats.pending}`,
);
