"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlaylistGroupsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/playlist-manager");
  }, [router]);

  return null;
}
