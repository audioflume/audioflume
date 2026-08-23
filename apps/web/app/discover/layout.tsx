import DiscoverHeroIndicatorControls from "./DiscoverHeroIndicatorControls";
import DiscoverHeroNameWidthSync from "./DiscoverHeroNameWidthSync";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DiscoverHeroIndicatorControls />
      <DiscoverHeroNameWidthSync />
      {children}
    </>
  );
}
