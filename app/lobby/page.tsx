import Link from 'next/link';
import ScenarioCard from '@/components/lobby/ScenarioCard';
import { getAllActiveScenarios } from '@/mocks/index';

export default function LobbyPage() {
  const activeScenarios = getAllActiveScenarios();

  return (
    <div className="min-h-screen bg-telos-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">시나리오 라이브러리</h1>
          <p className="text-lg text-gray-400">플레이할 이야기를 선택하세요.</p>
        </header>

        {activeScenarios.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {activeScenarios.map((scenario) => (
              <Link
                href={`/scenarios/${scenario.scenarioId}`}
                key={scenario.scenarioId}
              >
                <ScenarioCard scenario={scenario} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-800">
            <p className="text-xl">활성화된 시나리오가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
