'use client';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ScenarioData } from '@/types';

interface GameClientProps {
  scenario: ScenarioData;
}

export default function GameClient({ scenario }: GameClientProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen flex-col">
      {/* 1. Status Bar */}
      <header className="w-full flex-shrink-0 border-b border-gray-700 bg-gray-900/50 px-4 py-2 shadow-md">
        <div
          className={cn(
            'container mx-auto flex items-center',
            isMobile ? 'flex-col' : 'justify-between',
          )}
        >
          <h1
            className={cn(
              'font-bold',
              isMobile ? 'mb-2 text-center text-lg' : 'text-xl',
            )}
          >
            {scenario.title}
          </h1>
          <div
            className={cn(
              'flex w-full items-center',
              isMobile ? 'justify-around' : 'w-auto space-x-4',
            )}
          >
            {scenario.scenarioStats.map((stat) => (
              <div
                key={stat.id}
                className={cn('text-right', isMobile && 'text-center')}
              >
                <span
                  className={cn(
                    'text-gray-400',
                    isMobile ? 'text-xs' : 'text-sm',
                  )}
                >
                  {stat.name}
                </span>
                <p
                  className={cn(
                    'font-semibold',
                    isMobile ? 'text-base' : 'text-lg',
                  )}
                >
                  {stat.initialValue}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Log Window (Main Content) */}
      <main className="flex-grow overflow-y-auto p-4">
        <div className="container mx-auto h-full">
          <div className="prose prose-invert max-w-none rounded-lg bg-black/20 p-4">
            <p>
              '제로 데이' 이후 1일차. 도시의 소음이 사라진 자리를 어색한 정적이
              채운다. 당신은 임시 거처로 삼은 동네 도서관에서 창밖을 내다본다.
              익숙했던 거리는 이제 생존을 위한 사냥터로 변했다.
            </p>
            <p>
              어젯밤, 당신을 포함한 4명의 생존자는 작은 공동체를 만들기로
              합의했다. 각자의 생존 방식은 다르지만, 목표는 하나. 7일 후 도착할
              군대로부터 '정화'되기 전에, 이 도시에서 살아남을 방법을 찾는
              것이다.
            </p>
            <p className="text-yellow-400">
              [시스템] 한서아가 당신에게 다가와 말을 건다.
            </p>
          </div>
        </div>
      </main>

      {/* 3. Choice Window */}
      <footer className="w-full flex-shrink-0 border-t border-gray-700 bg-gray-900/50 p-4 shadow-inner">
        <div className="container mx-auto px-2">
          <p className="mb-2 text-center text-sm text-gray-400">
            당신의 다음 행동은?
          </p>
          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'grid-cols-3',
            )}
          >
            <button className="rounded-md bg-indigo-600 p-4 font-bold transition hover:bg-indigo-500">
              선택지 1: 생존에 필요한 물자부터 확보해야 한다.
            </button>
            <button className="rounded-md bg-indigo-600 p-4 font-bold transition hover:bg-indigo-500">
              선택지 2: 다른 생존자들을 찾아 협력을 제안한다.
            </button>
            <button className="rounded-md bg-indigo-600 p-4 font-bold transition hover:bg-indigo-500">
              선택지 3: 우리만의 규칙과 행동 강령을 먼저 정한다.
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
