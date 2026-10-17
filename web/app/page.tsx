import { RadarMarket } from "../components/RadarMarket";
import { loadRadar } from "../lib/radar";

// La portada lee el radar.json que escribe el pipeline cada madrugada.
export default function Home() {
  return <RadarMarket radar={loadRadar()} now={new Date()} />;
}
