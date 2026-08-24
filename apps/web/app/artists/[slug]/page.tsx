import PublicArtistPageView from "@/components/artists/PublicArtistPageView";
import { getPublicArtistPageData } from "@/lib/publicArtist";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ArtistPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function PublicArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const lookup = await getPublicArtistPageData(slug);

  if (lookup.redirectSlug && lookup.redirectSlug !== slug) {
    redirect(`/artists/${lookup.redirectSlug}`);
  }

  if (!lookup.data) notFound();

  return <PublicArtistPageView data={lookup.data} />;
}
