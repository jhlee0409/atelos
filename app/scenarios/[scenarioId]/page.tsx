import { notFound } from 'next/navigation';
import { getScenarioData } from '@/mocks/index';
import ScenarioDetailClient from './ScenarioDetailClient';

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const scenario = getScenarioData(scenarioId);

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
