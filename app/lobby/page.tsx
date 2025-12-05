import Link from 'next/link';
import ScenarioCard from '@/components/lobby/ScenarioCard';
import { getActiveScenarios } from '@/lib/firebase-scenarios';

export const dynamic = 'force-dynamic';

export default async function LobbyPage() {
  let activeScenarios: Awaited<ReturnType<typeof getActiveScenarios>> = [];
  let error: string | null = null;

  try {
    activeScenarios = await getActiveScenarios();
  } catch (e) {
    console.error('❌ [Lobby] 시나리오 로드 실패:', e);
    error = '시나리오를 불러오는데 실패했습니다.';
  }

  return (
    <div className="min-h-screen bg-telos-black text-zinc-100">
      {/* Navigation */}
      <nav className="border-b border-zinc-900 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-serif text-2xl font-black tracking-tighter text-white transition-colors hover:text-red-500"
          >
            ATELOS
          </Link>
          <span className="border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            Scenario Library
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">
            시나리오 라이브러리
          </h1>
          <div className="mx-auto mb-6 h-1 w-20 bg-red-900" />
          <p className="text-lg tracking-wide text-zinc-400">
            당신의 생존 기록이 시작될 이야기를 선택하세요
          </p>
        </header>

        {error ? (
          <div className="flex h-64 items-center justify-center border border-red-800 bg-red-900/10">
            <p className="text-xl text-red-400">{error}</p>
          </div>
        ) : activeScenarios.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="flex h-64 items-center justify-center border border-zinc-800 bg-zinc-900/20">
            <p className="text-xl text-zinc-400">활성화된 시나리오가 없습니다.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-zinc-600">
            ATELOS - AI-Powered Interactive Narrative
          </p>
        </div>
      </footer>
    </div>
  );
}
