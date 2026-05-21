"use client";

import { useEffect, useState } from "react";
import type { LoadState, MembershipDisplay, UsageSnapshot, UserMembership } from "../accountTypes";

type ApiPayload = Record<string, any>;

async function readApiPayload(response: Response, label: string): Promise<ApiPayload> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!text) return {};

  if (!contentType.includes("application/json")) {
    throw new Error(`${label} returned ${response.status} ${response.statusText || "non-JSON response"}`);
  }

  try {
    return JSON.parse(text) as ApiPayload;
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

export function useMembershipData() {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [display, setDisplay] = useState<MembershipDisplay | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");

  useEffect(() => {
    let active = true;

    async function loadMembership() {
      setLoadState("loading");
      try {
        const [membershipResponse, usageResponse] = await Promise.all([
          fetch("/api/account/membership", { cache: "no-store" }),
          fetch("/api/account/usage", { cache: "no-store" }),
        ]);
        const membershipPayload = await readApiPayload(membershipResponse, "Membership API");
        const usagePayload = await readApiPayload(usageResponse, "Usage API");
        if (!membershipResponse.ok) throw new Error(membershipPayload?.error || "Load failed");
        if (!usageResponse.ok) throw new Error(usagePayload?.error || "Usage failed");
        if (!active) return;
        setMembership(membershipPayload.membership);
        setDisplay(membershipPayload.display);
        setUsage(usagePayload.usage);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
      }
    }

    loadMembership();
    return () => {
      active = false;
    };
  }, []);

  return { membership, display, usage, loadState };
}
