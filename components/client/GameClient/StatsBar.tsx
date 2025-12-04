import { ScenarioData } from '@/types';
import { SaveState } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="sticky top-0 z-20 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm">
      <div className="px-4 py-2">
        {/* 루트 인디케이터 */}
        <RouteIndicator saveState={saveState} isCompact={!isExpanded} />

        {/* 토글 버튼 */}
        <button
          onClick={onToggle}
          className="mt-2 flex w-full items-center justify-center py-1 text-gray-500 hover:text-gray-400"
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
                name={getKoreanStatName(stat.id)}
                value={getStatValue(stat.id)}
                min={stat.min}
                max={stat.max}
                statId={stat.id}
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
                  name={getKoreanStatName(stat.id)}
                  value={getStatValue(stat.id)}
                  min={stat.min}
                  max={stat.max}
                  statId={stat.id}
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
