import { notFound } from 'next/navigation';
import { getScenario } from '@/lib/firebase-scenarios-admin';
import GameClient from './GameClient';

export const dynamic = 'force-dynamic';

export default async function GamePage({
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
    <div className="bg-telos-black text-white">
      <GameClient scenario={scenario} />
    </div>
  );
}
