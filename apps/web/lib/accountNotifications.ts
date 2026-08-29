import { supabaseServer } from "@/lib/supabaseServer";

type CreateAccountNotificationInput = {
  recipientClerkUserId: string;
  kind: string;
  title: string;
  message?: string | null;
  actionUrl?: string | null;
};

export async function createAccountNotification({
  recipientClerkUserId,
  kind,
  title,
  message = null,
  actionUrl = null,
}: CreateAccountNotificationInput) {
  const { error } = await supabaseServer.from("account_notifications").insert({
    recipient_clerk_user_id: recipientClerkUserId,
    kind,
    title,
    message,
    action_url: actionUrl,
  });

  if (error) throw error;
}
