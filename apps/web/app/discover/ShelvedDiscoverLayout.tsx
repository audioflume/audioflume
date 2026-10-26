import DiscoverHeroIndicatorControls from "./DiscoverHeroIndicatorControls";
import DiscoverHeroNameWidthSync from "./DiscoverHeroNameWidthSync";

export default function ShelvedDiscoverLayout({
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
