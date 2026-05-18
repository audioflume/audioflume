const DEFAULT_SYSTEM_STATUSES: SystemHealthItem[] = [
  { key: "supabase", label: "Supabase connected", tone: "warning", message: "Not checked yet." },
  { key: "r2_music", label: "Music library storage", tone: "warning", message: "Not checked yet." },
  { key: "r2_images", label: "Image storage", tone: "warning", message: "Not checked yet." },
  { key: "analyzer", label: "Analyzer ready", tone: "warning", message: "Not checked yet." },
];

const SYSTEM_HEALTH_FAILED_STATUSES: SystemHealthItem[] = [
  { key: "supabase", label: "Supabase connected", tone: "error", message: "System health check failed." },
  { key: "r2_music", label: "Music library storage", tone: "error", message: "System health check failed." },
  { key: "r2_images", label: "Image storage", tone: "error", message: "System health check failed." },
  { key: "analyzer", label: "Analyzer ready", tone: "error", message: "System health check failed." },
];