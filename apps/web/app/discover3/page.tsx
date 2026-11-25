import HomePageContent from "../HomePageContent";
import { getHomeFlashImages } from "@/lib/homeFlashImages";
import "../home-page.css";

export default async function DiscoverPage() {
  const homeFlashImages = await getHomeFlashImages();

  return (
    <HomePageContent
      homeFlashImages={homeFlashImages}
      showHero={false}
    />
  );
}
