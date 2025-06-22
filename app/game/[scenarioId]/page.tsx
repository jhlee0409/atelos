import { notFound } from 'next/navigation';
import { getScenarioData } from '@/mocks/index';
import GameClient from './GameClient';

export default function GamePage({
  params,
}: {
  params: { scenarioId: string };
}) {
  const scenario = getScenarioData(params.scenarioId);

  if (!scenario) {
    notFound();
  }

  return (
    <div className="bg-telos-black text-white">
      <GameClient scenario={scenario} />
    </div>
  );
}
