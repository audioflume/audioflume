import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";

export async function GET(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            primaryEmail?.emailAddress ||
            "Filmwave user",
          email: primaryEmail?.emailAddress ?? null,
          imageUrl: user.imageUrl ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Desktop account fetch error:", error);

    return NextResponse.json(
      { error: "Could not load desktop account" },
      { status: 500 },
    );
  }
}
