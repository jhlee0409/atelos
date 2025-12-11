import { ScenarioData } from '@/types';
import { SaveState } from '@/types';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { StatDisplay } from './StatDisplay';
import { RouteIndicator } from './RouteIndicator';
import { CharacterArcPanel } from './CharacterArcPanel';
import { cn } from '@/lib/utils';

/** 기본 일일 행동 포인트 (GameClient.tsx와 동기화) */
const DEFAULT_ACTION_POINTS = 3;

/**
 * 행동 포인트(AP) 표시 컴포넌트
 */
const ActionPointsDisplay = ({
  current,
  max,
  isCompact = false,
}: {
  current: number;
  max: number;
  isCompact?: boolean;
}) => {
  const isLow = current === 1;
  const isEmpty = current === 0;

  if (isCompact) {
    return (
      <div className="flex items-center gap-1">
        <Zap className={cn(
          "h-3 w-3",
          isEmpty ? "text-zinc-600" : isLow ? "text-orange-400" : "text-blue-400"
        )} />
        <div className="flex gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i < current
                  ? isLow
                    ? "bg-orange-400"
                    : "bg-blue-400"
                  : "bg-zinc-700"
              )}
            />
          ))}
        </div>
        {isLow && !isEmpty && (
          <span className="text-[10px] text-orange-400 ml-1">!</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
      <Zap className={cn(
        "h-4 w-4",
        isEmpty ? "text-zinc-600" : isLow ? "text-orange-400" : "text-blue-400"
      )} />
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-400">행동력</span>
        <div className="flex gap-1 ml-1">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full border transition-all",
                i < current
                  ? isLow
                    ? "bg-orange-400 border-orange-500"
                    : "bg-blue-400 border-blue-500"
                  : "bg-zinc-800 border-zinc-700"
              )}
            />
          ))}
        </div>
        <span className={cn(
          "text-xs ml-1",
          isEmpty ? "text-zinc-600" : isLow ? "text-orange-400" : "text-zinc-300"
        )}>
          {current}/{max}
        </span>
      </div>
      {isLow && !isEmpty && (
        <span className="text-[10px] text-orange-400 animate-pulse">마지막 행동!</span>
      )}
      {isEmpty && (
        <span className="text-[10px] text-zinc-500">다음 날 대기</span>
      )}
    </div>
  );
};

export const StatsBar = ({
  scenario,
  saveState,
  isExpanded,
  onToggle,
}: {
  scenario: ScenarioData;
  saveState: SaveState;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const getStatValue = (statId: string) => {
    return saveState.context.scenarioStats[statId] ?? 0;
  };

  // 행동 포인트 값 가져오기
  const currentAP = saveState.context.actionPoints ?? DEFAULT_ACTION_POINTS;
  const maxAP = saveState.context.maxActionPoints ?? DEFAULT_ACTION_POINTS;

  return (
    <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="px-4 py-2">
        {/* 상단: 루트 인디케이터 + 행동 포인트 */}
        <div className="flex items-center justify-between gap-2">
          <RouteIndicator saveState={saveState} isCompact={!isExpanded} />
          <ActionPointsDisplay
            current={currentAP}
            max={maxAP}
            isCompact={!isExpanded}
          />
        </div>

        {/* 토글 버튼 */}
        <button
          onClick={onToggle}
          className="mt-2 flex w-full items-center justify-center py-1 text-zinc-600 transition-colors hover:text-zinc-400"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* 확장된 상태 */}
        {isExpanded && (
          <div className="mt-2 space-y-3">
            {scenario.scenarioStats.map((stat) => (
              <StatDisplay
                key={stat.id}
                name={stat.name}
                value={getStatValue(stat.id)}
                min={stat.min}
                max={stat.max}
                statId={stat.id}
                polarity={stat.polarity}
              />
            ))}
            <CharacterArcPanel
              characterArcs={saveState.characterArcs}
              isCompact={false}
            />
          </div>
        )}

        {/* 축소된 상태 */}
        {!isExpanded && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {scenario.scenarioStats.map((stat) => (
                <StatDisplay
                  key={stat.id}
                  name={stat.name}
                  value={getStatValue(stat.id)}
                  min={stat.min}
                  max={stat.max}
                  statId={stat.id}
                  polarity={stat.polarity}
                  isCompact={true}
                />
              ))}
            </div>
            <CharacterArcPanel
              characterArcs={saveState.characterArcs}
              isCompact={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
