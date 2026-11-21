import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import Discover2SongBlocks from "./Discover2SongBlocks";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2StorytellingTracks from "./Discover2StorytellingTracks";
import { HomeLandingPromoBlocks } from "../HomeLandingContent";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout topBanner={<><ActiveDiscoverBanner /><div className="audioflume-experiment-main audioflume-experiment-promos"><HomeLandingPromoBlocks showCurated={false} /></div><Discover2StorytellingTracks /></>} afterFeaturedSongs={<Discover2SongBlocks />} />;
}
