import { notFound } from 'next/navigation';
import { getScenarioData } from '@/mocks/index';
import ScenarioDetailClient from './ScenarioDetailClient';

export default function ScenarioPage({
  params,
}: {
  params: { scenarioId: string };
}) {
  const scenario = getScenarioData(params.scenarioId);

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
