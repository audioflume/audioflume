import HomePageContent from "./HomePageContent";
import DiscoverLayout from "./discover/layout";
import DiscoverTemplate from "./discover/template";

export default function Home() {
  return (
    <DiscoverLayout>
      <DiscoverTemplate showHeroLastViewed={false}>
        <HomePageContent />
      </DiscoverTemplate>
    </DiscoverLayout>
  );
}
