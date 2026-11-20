import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";

export default function Discover2Page() {
  return <ShelvedDiscoverPage afterPlaylists={<ActiveDiscoverBanner />} />;
}
