import { Landing } from "../components/Landing";
import { loadRadar } from "../lib/radar";

// La landing cuenta qué hace el radar con las cifras de la última corrida y lleva a /radar.
export default function Home() {
  return <Landing radar={loadRadar()} />;
}
