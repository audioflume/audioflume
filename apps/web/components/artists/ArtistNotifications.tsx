"use client";

import { useEffect, useState } from "react";

import { BackendButton } from "@/components/backend/BackendControls";

type ArtistNotification = {
  id: string;
  kind: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsResponse = {
  notifications?: ArtistNotification[];
  unread_count?: number;
  error?: string;
};

type ArtistNotificationsProps = {
  artistId: string;
  onUnreadCountChange?: (count: number) => void;
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsed = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "Just now";
  if (elapsed < hour) return `${Math.max(1, Math.floor(elapsed / minute))}m ago`;
  if (elapsed < day) return `${Math.max(1, Math.floor(elapsed / hour))}h ago`;
  if (elapsed < 7 * day) return `${Math.max(1, Math.floor(elapsed / day))}d ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function getNotificationColor(kind: string) {
  if (kind.includes("rejected") || kind.includes("suspended")) {
    return "var(--status-error)";
  }

  if (kind.includes("approved") || kind.includes("published")) {
    return "var(--status-success)";
  }

  return "color-mix(in srgb, var(--text-primary) 24%, transparent)";
}

export default function ArtistNotifications({
  artistId,
  onUnreadCountChange,
}: ArtistNotificationsProps) {
  const [notifications, setNotifications] = useState<ArtistNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/artists/${artistId}/notifications`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | NotificationsResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load notifications");
        }

        if (cancelled) return;

        const rows = Array.isArray(payload?.notifications)
          ? payload.notifications
          : [];
        const nextUnreadCount =
          typeof payload?.unread_count === "number"
            ? payload.unread_count
            : rows.filter((notification) => !notification.read_at).length;

        setNotifications(rows);
        setUnreadCount(nextUnreadCount);
        onUnreadCountChange?.(nextUnreadCount);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load notifications",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [artistId, onUnreadCountChange]);

  async function markNotificationRead(notificationId: string) {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.read_at) return true;

    try {
      const response = await fetch(`/api/artists/${artistId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { notification?: { read_at?: string | null }; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update notification");
      }

      const readAt = payload?.notification?.read_at || new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, read_at: readAt } : item,
        ),
      );
      setUnreadCount((current) => {
        const next = Math.max(0, current - 1);
        onUnreadCountChange?.(next);
        return next;
      });
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update notification",
      );
      return false;
    }
  }

  async function handleNotificationClick(notification: ArtistNotification) {
    const updated = await markNotificationRead(notification.id);
    if (!updated) return;

    if (notification.action_url) {
      window.location.assign(notification.action_url);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      const response = await fetch(`/api/artists/${artistId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { read_at?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update notifications");
      }

      const readAt = payload?.read_at || new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.read_at
            ? notification
            : { ...notification, read_at: readAt },
        ),
      );
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update notifications",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="grid gap-3">
      {unreadCount > 0 ? (
        <div className="flex items-center justify-end">
          <BackendButton
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </BackendButton>
        </div>
      ) : null}

      {error ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="filmwave-backend-section flex min-h-[144px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="filmwave-backend-section flex min-h-[180px] items-center justify-center px-6 text-center">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Nothing new yet.
            </div>
            <div className="mt-1.5 text-xs text-[var(--text-muted)]">
              Track reviews and artist account updates will appear here.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {notifications.map((notification) => {
            const unread = !notification.read_at;
            const notificationColor = getNotificationColor(notification.kind);

            return (
              <div
                key={notification.id}
                className="relative flex w-full items-start gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-4"
              >
                <span
                  className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: notificationColor }}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] leading-5 text-[var(--text-primary)] ${
                      unread ? "font-medium" : "font-normal"
                    }`}
                  >
                    {notification.title}
                  </div>
                  {notification.message ? (
                    <div className="mt-1 max-w-[760px] text-xs leading-5 text-[var(--text-secondary)]">
                      {notification.message}
                    </div>
                  ) : null}
                  <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                    {formatNotificationTime(notification.created_at)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 pt-0.5">
                  {unread ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-[var(--danger)]"
                      aria-label="Unread"
                    />
                  ) : null}

                  {notification.action_url ? (
                    <BackendButton
                      type="button"
                      compact
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      View
                    </BackendButton>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
