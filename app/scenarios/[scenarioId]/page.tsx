import { notFound } from 'next/navigation';
import { getScenario } from '@/lib/firebase-scenarios';
import ScenarioDetailClient from './ScenarioDetailClient';

export const dynamic = 'force-dynamic';

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const scenario = await getScenario(scenarioId);

  if (!scenario) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-telos-black p-8 text-white">
      <div className="container mx-auto max-w-6xl">
        <ScenarioDetailClient scenario={scenario} />
      </div>
    </div>
  );
}
