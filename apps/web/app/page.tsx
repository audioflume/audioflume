import HomeLandingContent from "./HomeLandingContent";
import { getHomeFlashImages } from "@/lib/homeFlashImages";
import "./home-page.css";

export default async function Home() {
  const homeFlashImages = await getHomeFlashImages();
  return <HomeLandingContent homeFlashImages={homeFlashImages} />;
}
