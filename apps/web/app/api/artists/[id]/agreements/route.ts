import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type AgreementDocumentRow = {
  id: string;
  document_key: string;
  version: number;
  title: string;
  summary: string | null;
  document_url: string | null;
  required: boolean;
  status: "draft" | "published" | "retired";
  position: number;
  effective_at: string | null;
  created_at: string;
};

type AgreementAcceptanceRow = {
  id: string;
  agreement_document_id: string;
  accepted_by_clerk_user_id: string;
  accepted_by_display_name: string | null;
  accepted_at: string;
};

function normalizeDocumentUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function pickVisibleDocuments(rows: AgreementDocumentRow[]) {
  const byKey = new Map<string, AgreementDocumentRow>();

  for (const row of rows) {
    const current = byKey.get(row.document_key);
    if (!current) {
      byKey.set(row.document_key, row);
      continue;
    }

    if (row.status === "published" && current.status !== "published") {
      byKey.set(row.document_key, row);
      continue;
    }

    if (row.status === current.status && row.version > current.version) {
      byKey.set(row.document_key, row);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.title.localeCompare(b.title);
  });
}

async function loadAcceptance(
  artistId: string,
  documentId: string,
): Promise<AgreementAcceptanceRow | null> {
  const { data, error } = await supabaseServer
    .from("artist_agreement_acceptances")
    .select(
      "id, agreement_document_id, accepted_by_clerk_user_id, accepted_by_display_name, accepted_at",
    )
    .eq("artist_id", artistId)
    .eq("agreement_document_id", documentId)
    .maybeSingle();

  if (error) throw error;
  return (data as AgreementAcceptanceRow | null) ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const artistId = params.id;

  try {
    const access = await requireArtistPermission(artistId, "rights:view");

    const { data, error } = await supabaseServer
      .from("artist_agreement_documents")
      .select(
        "id, document_key, version, title, summary, document_url, required, status, position, effective_at, created_at",
      )
      .in("status", ["draft", "published"])
      .order("position", { ascending: true })
      .order("version", { ascending: false });

    if (error) throw error;

    const documents = pickVisibleDocuments(
      (Array.isArray(data) ? data : []) as AgreementDocumentRow[],
    );
    const documentIds = documents.map((document) => document.id);

    let acceptances: AgreementAcceptanceRow[] = [];
    if (documentIds.length > 0) {
      const { data: acceptanceData, error: acceptanceError } = await supabaseServer
        .from("artist_agreement_acceptances")
        .select(
          "id, agreement_document_id, accepted_by_clerk_user_id, accepted_by_display_name, accepted_at",
        )
        .eq("artist_id", artistId)
        .in("agreement_document_id", documentIds);

      if (acceptanceError) throw acceptanceError;
      acceptances = (Array.isArray(acceptanceData)
        ? acceptanceData
        : []) as AgreementAcceptanceRow[];
    }

    const acceptanceByDocument = new Map(
      acceptances.map((acceptance) => [
        acceptance.agreement_document_id,
        acceptance,
      ]),
    );

    const responseDocuments = documents.map((document) => {
      const acceptance = acceptanceByDocument.get(document.id) ?? null;
      return {
        id: document.id,
        document_key: document.document_key,
        version: document.version,
        title: document.title,
        summary: document.summary,
        document_url: normalizeDocumentUrl(document.document_url),
        required: document.required,
        status: document.status,
        effective_at: document.effective_at,
        accepted: Boolean(acceptance),
        accepted_at: acceptance?.accepted_at ?? null,
        accepted_by_clerk_user_id:
          acceptance?.accepted_by_clerk_user_id ?? null,
        accepted_by_display_name:
          acceptance?.accepted_by_display_name ?? null,
      };
    });

    const publishedRequired = responseDocuments.filter(
      (document) => document.status === "published" && document.required,
    );
    const requiredAccepted = publishedRequired.filter(
      (document) => document.accepted,
    ).length;

    return NextResponse.json({
      documents: responseDocuments,
      can_accept: access.role === "owner" || access.role === "admin",
      completion: {
        required_total: publishedRequired.length,
        required_accepted: requiredAccepted,
        complete:
          publishedRequired.length > 0 &&
          requiredAccepted === publishedRequired.length,
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist agreements GET error:", error);
    return NextResponse.json(
      { error: "Failed to load artist agreements" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const artistId = params.id;

  try {
    const access = await requireArtistPermission(artistId, "rights:view");
    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Only the artist owner can accept agreements." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { document_id?: string; confirmed?: boolean }
      | null;
    const documentId = body?.document_id?.trim() ?? "";

    if (!documentId || body?.confirmed !== true) {
      return NextResponse.json(
        { error: "Document confirmation is required." },
        { status: 400 },
      );
    }

    const { data: document, error: documentError } = await supabaseServer
      .from("artist_agreement_documents")
      .select("id, document_url, status")
      .eq("id", documentId)
      .eq("status", "published")
      .maybeSingle();

    if (documentError) throw documentError;
    if (!document) {
      return NextResponse.json(
        { error: "Agreement is not available for acceptance." },
        { status: 404 },
      );
    }

    if (!normalizeDocumentUrl(document.document_url)) {
      return NextResponse.json(
        { error: "Agreement document is not available yet." },
        { status: 409 },
      );
    }

    const existing = await loadAcceptance(artistId, documentId);
    if (existing) {
      return NextResponse.json({ acceptance: existing });
    }

    const userId = access.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from("user_profiles")
      .select("display_name, first_name, last_name")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const displayName =
      profile?.display_name?.trim() ||
      [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Artist owner";

    const { data: acceptance, error: acceptanceError } = await supabaseServer
      .from("artist_agreement_acceptances")
      .insert({
        artist_id: artistId,
        agreement_document_id: documentId,
        accepted_by_clerk_user_id: userId,
        accepted_by_display_name: displayName,
      })
      .select(
        "id, agreement_document_id, accepted_by_clerk_user_id, accepted_by_display_name, accepted_at",
      )
      .single();

    if (acceptanceError) {
      if (acceptanceError.code === "23505") {
        const racedAcceptance = await loadAcceptance(artistId, documentId);
        if (racedAcceptance) {
          return NextResponse.json({ acceptance: racedAcceptance });
        }
      }
      throw acceptanceError;
    }

    return NextResponse.json({ acceptance });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist agreements POST error:", error);
    return NextResponse.json(
      { error: "Failed to accept artist agreement" },
      { status: 500 },
    );
  }
}
