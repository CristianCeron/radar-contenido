import { notFound } from "next/navigation";
import { BriefView } from "../../../../components/BriefView";
import { loadRadar } from "../../../../lib/radar";

export const metadata = { title: "Brief · Radar 30X" };

// La marca llega en ?marca= para que el enlace se pueda compartir con el brief de esa marca.
export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ marca?: string }>;
}) {
  const [{ id }, { marca }] = await Promise.all([params, searchParams]);
  const radar = loadRadar();
  const topic = radar.topics.find((t) => t.id === id);
  if (!topic) notFound();
  return <BriefView topic={topic} profiles={radar.profiles} initialBrand={marca ?? ""} />;
}
