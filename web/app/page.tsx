import { RadarMarket } from "../components/RadarMarket";
import { loadRadar } from "../lib/radar";

export default function Home() {
  return <RadarMarket radar={loadRadar()} now={new Date()} />;
}
