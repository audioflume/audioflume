import { supabaseServer } from "@/lib/supabaseServer";

type CreateArtistNotificationInput = {
  artistId: string;
  kind: string;
  title: string;
  message?: string | null;
  actionUrl?: string | null;
};

export async function createArtistNotificationForMembers({
  artistId,
  kind,
  title,
  message = null,
  actionUrl = null,
}: CreateArtistNotificationInput) {
  const { data: memberships, error: membershipsError } = await supabaseServer
    .from("artist_memberships")
    .select("clerk_user_id")
    .eq("artist_id", artistId);

  if (membershipsError) throw membershipsError;

  const recipients = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership) => membership.clerk_user_id)
        .filter(
          (clerkUserId): clerkUserId is string =>
            typeof clerkUserId === "string" && clerkUserId.length > 0,
        ),
    ),
  );

  if (recipients.length === 0) return;

  const { error: insertError } = await supabaseServer
    .from("artist_notifications")
    .insert(
      recipients.map((recipientClerkUserId) => ({
        artist_id: artistId,
        recipient_clerk_user_id: recipientClerkUserId,
        kind,
        title,
        message,
        action_url: actionUrl,
      })),
    );

  if (insertError) throw insertError;
}
