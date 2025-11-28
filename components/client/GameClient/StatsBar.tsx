import { ScenarioData } from '@/types';
import { SaveState } from '@/types';
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { StatDisplay } from './StatDisplay';
import { RouteIndicator } from './RouteIndicator';
import { CharacterArcPanel } from './CharacterArcPanel';
import { getKoreanStatName } from '@/constants/korean-english-mapping';

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

  return (
    <div className="sticky top-0 z-20 border-b border-gray-700/50 bg-gray-900/95 shadow-lg backdrop-blur-sm">
      <div className="px-4 py-3">
        {/* 루트 인디케이터 - 항상 표시 */}
        <div className="mb-3">
          <RouteIndicator saveState={saveState} isCompact={!isExpanded} />
        </div>

        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="flex items-center text-sm font-bold text-white">
            <BarChart3 className="mr-2 h-4 w-4" />
            상태
          </h2>
          <span className="text-xs text-gray-400">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        </button>

        {isExpanded ? (
          <div className="mt-3 space-y-3">
            {scenario.scenarioStats.map((stat) => (
              <StatDisplay
                key={stat.id}
                name={getKoreanStatName(stat.id)}
                value={getStatValue(stat.id)}
                min={stat.min}
                max={stat.max}
                statId={stat.id}
              />
            ))}
            {/* 캐릭터 아크 패널 */}
            <CharacterArcPanel
              characterArcs={saveState.characterArcs}
              isCompact={false}
            />
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {scenario.scenarioStats.map((stat) => (
                <StatDisplay
                  key={stat.id}
                  name={getKoreanStatName(stat.id)}
                  value={getStatValue(stat.id)}
                  min={stat.min}
                  max={stat.max}
                  statId={stat.id}
                  isCompact={true}
                />
              ))}
            </div>
            {/* 캐릭터 아크 간략 표시 */}
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
