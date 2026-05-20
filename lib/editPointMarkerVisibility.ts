export const EDIT_POINT_MARKER_VISIBILITY_STORAGE_KEY =
  "filmwave-show-edit-point-markers";

export const EDIT_POINT_MARKER_VISIBILITY_EVENT =
  "filmwave:edit-point-marker-visibility";

type EditPointMarkerVisibilityEventDetail = {
  visible: boolean;
};

export function getStoredEditPointMarkerVisibility() {
  if (typeof window === "undefined") return true;

  return (
    window.localStorage.getItem(EDIT_POINT_MARKER_VISIBILITY_STORAGE_KEY) !==
    "false"
  );
}

export function setStoredEditPointMarkerVisibility(visible: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EDIT_POINT_MARKER_VISIBILITY_STORAGE_KEY,
    visible ? "true" : "false",
  );

  window.dispatchEvent(
    new CustomEvent<EditPointMarkerVisibilityEventDetail>(
      EDIT_POINT_MARKER_VISIBILITY_EVENT,
      {
        detail: { visible },
      },
    ),
  );
}

export async function saveEditPointMarkerVisibilityPreference(visible: boolean) {
  try {
    const response = await fetch("/api/user-preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        show_edit_point_markers: visible,
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to save edit point marker visibility:",
        await response.text(),
      );
    }
  } catch (error) {
    console.error("Failed to save edit point marker visibility:", error);
  }
}

export function updateEditPointMarkerVisibilityPreference(visible: boolean) {
  setStoredEditPointMarkerVisibility(visible);
  void saveEditPointMarkerVisibilityPreference(visible);
}
