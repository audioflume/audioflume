"use client";

import { useEffect, useState } from "react";

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

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ArtistNotifications({ artistId }: { artistId: string }) {
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
        setNotifications(rows);
        setUnreadCount(
          typeof payload?.unread_count === "number"
            ? payload.unread_count
            : rows.filter((notification) => !notification.read_at).length,
        );
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
  }, [artistId]);

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
      setUnreadCount((current) => Math.max(0, current - 1));
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
    await markNotificationRead(notification.id);

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
    <section className="filmwave-backend-section overflow-hidden">
      <div className="flex min-h-[58px] items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div>
          <div className="font-[family-name:var(--font-aktiv-grotesk)] text-[13px] font-medium text-[var(--text-primary)]">
            Activity
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {unreadCount === 0
              ? "No unread notifications"
              : `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`}
          </div>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="filmwave-backend-button disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="border-b border-[var(--border)] px-4 py-3 text-xs text-[var(--text-primary)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-sm text-[var(--text-primary)]">Nothing new yet.</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Track reviews and artist account updates will appear here.
          </div>
        </div>
      ) : (
        <div>
          {notifications.map((notification, index) => {
            const unread = !notification.read_at;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)] focus-visible:outline-none ${
                  index < notifications.length - 1
                    ? "border-b border-[var(--border)]"
                    : ""
                }`}
              >
                <span
                  className={`mt-[6px] h-1.5 w-1.5 shrink-0 ${
                    unread
                      ? "bg-[var(--text-primary)]"
                      : "bg-[var(--border-strong)]"
                  }`}
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={`block font-[family-name:var(--font-aktiv-grotesk)] text-[13px] leading-5 text-[var(--text-primary)] ${
                      unread ? "font-medium" : "font-normal"
                    }`}
                  >
                    {notification.title}
                  </span>
                  {notification.message ? (
                    <span className="mt-1 block max-w-[760px] text-xs leading-5 text-[var(--text-secondary)]">
                      {notification.message}
                    </span>
                  ) : null}
                  <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    {formatNotificationTime(notification.created_at)}
                  </span>
                </span>

                {notification.action_url ? (
                  <span className="shrink-0 pt-0.5 text-[11px] text-[var(--text-secondary)]">
                    View
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
