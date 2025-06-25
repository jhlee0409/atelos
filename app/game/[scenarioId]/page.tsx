import { notFound } from 'next/navigation';
import { getScenarioData } from '@/mocks/index';
import GameClient from './GameClient';

export default async function GamePage({
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
    <div className="bg-telos-black text-white">
      <GameClient scenario={scenario} />
    </div>
  );
}
