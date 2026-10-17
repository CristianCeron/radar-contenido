import { RadarMarket } from "../../components/RadarMarket";
import { loadRadar } from "../../lib/radar";

export const metadata = { title: "El radar · Radar 30X" };

// El radar lee el radar.json que escribe el pipeline cada madrugada.
export default function RadarPage() {
  return <RadarMarket radar={loadRadar()} now={new Date()} />;
}
