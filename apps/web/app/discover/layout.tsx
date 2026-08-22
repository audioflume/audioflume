import DiscoverHeroNameWidthSync from "./DiscoverHeroNameWidthSync";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DiscoverHeroNameWidthSync />
      {children}
    </>
  );
}
