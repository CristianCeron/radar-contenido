import { notFound } from "next/navigation";
import { TopicDetail } from "../../../components/TopicDetail";
import { loadRadar } from "../../../lib/radar";

export function generateStaticParams() {
  return loadRadar().topics.map((t) => ({ id: t.id }));
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const radar = loadRadar();
  const topic = radar.topics.find((t) => t.id === id);
  if (!topic) notFound();
  return <TopicDetail topic={topic} radar={radar} />;
}
