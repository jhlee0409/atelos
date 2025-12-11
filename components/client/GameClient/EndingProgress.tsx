import { cn } from '@/lib/utils';
import { EndingArchetype, SystemCondition, ScenarioData } from '@/types';
import { compareValues } from '@/constants/comparison-operators';
import { getKoreanStatName, getKoreanFlagName } from '@/constants/korean-english-mapping';
import { ChevronDown, ChevronUp, Target, Flag, Users, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { getRouteActivationDay, getEndingCheckDay } from '@/lib/gameplay-config';

interface EndingProgressProps {
  endingArchetypes: EndingArchetype[];
  currentStats: Record<string, number>;
  currentFlags: Record<string, boolean | number>;
  survivorCount: number;
  currentDay: number;
  scenario?: ScenarioData | null;
  isExpanded?: boolean;
}

// 조건 만족 여부 체크
const checkCondition = (
  condition: SystemCondition,
  stats: Record<string, number>,
  flags: Record<string, boolean | number>,
  survivorCount: number
): { met: boolean; current: number | boolean; required: number | string } => {
  if (condition.type === 'required_stat') {
    const currentValue = stats[condition.statId] ?? 0;
    const met = compareValues(currentValue, condition.comparison, condition.value);
    return { met, current: currentValue, required: condition.value };
  } else if (condition.type === 'required_flag') {
    const flagValue = flags[condition.flagName];
    const met = typeof flagValue === 'boolean' ? flagValue === true : (flagValue ?? 0) > 0;
    return { met, current: flagValue ?? false, required: '획득 필요' };
  } else if (condition.type === 'survivor_count') {
    const met = compareValues(survivorCount, condition.comparison, condition.value);
    return { met, current: survivorCount, required: condition.value };
  }
  return { met: false, current: 0, required: 0 };
};

// 엔딩 진행률 계산
const calculateEndingProgress = (
  ending: EndingArchetype,
  stats: Record<string, number>,
  flags: Record<string, boolean | number>,
  survivorCount: number
): { progress: number; metConditions: number; totalConditions: number } => {
  if (ending.systemConditions.length === 0) {
    return { progress: 0, metConditions: 0, totalConditions: 0 };
  }

  let metCount = 0;
  for (const condition of ending.systemConditions) {
    const result = checkCondition(condition, stats, flags, survivorCount);
    if (result.met) metCount++;
  }

  const progress = (metCount / ending.systemConditions.length) * 100;
  return {
    progress,
    metConditions: metCount,
    totalConditions: ending.systemConditions.length,
  };
};

// 조건 타입별 아이콘
const ConditionIcon = ({ type }: { type: SystemCondition['type'] }) => {
  switch (type) {
    case 'required_stat':
      return <Target className="h-3 w-3" />;
    case 'required_flag':
      return <Flag className="h-3 w-3" />;
    case 'survivor_count':
      return <Users className="h-3 w-3" />;
    default:
      return null;
  }
};

// 비교 연산자 한글화
const getComparisonText = (comparison: string): string => {
  const map: Record<string, string> = {
    greater_equal: '이상',
    less_equal: '이하',
    equal: '정확히',
    greater_than: '초과',
    less_than: '미만',
    not_equal: '제외',
  };
  return map[comparison] || comparison;
};

// 개별 조건 표시
const ConditionItem = ({
  condition,
  stats,
  flags,
  survivorCount,
}: {
  condition: SystemCondition;
  stats: Record<string, number>;
  flags: Record<string, boolean | number>;
  survivorCount: number;
}) => {
  const result = checkCondition(condition, stats, flags, survivorCount);

  let label = '';
  let valueDisplay = '';

  if (condition.type === 'required_stat') {
    const koreanName = getKoreanStatName(condition.statId) || condition.statId;
    label = koreanName;
    valueDisplay = `${result.current} / ${result.required} ${getComparisonText(condition.comparison)}`;
  } else if (condition.type === 'required_flag') {
    const koreanName = getKoreanFlagName(condition.flagName) || condition.flagName.replace('FLAG_', '');
    label = koreanName;
    valueDisplay = result.met ? '✓ 획득' : '미획득';
  } else if (condition.type === 'survivor_count') {
    label = '생존자 수';
    valueDisplay = `${result.current}명 / ${result.required}명 ${getComparisonText(condition.comparison)}`;
  }

  return (
    <div className={cn(
      "flex items-center justify-between text-[10px] py-0.5",
      result.met ? "text-green-400" : "text-zinc-500"
    )}>
      <span className="flex items-center gap-1">
        <ConditionIcon type={condition.type} />
        {label}
      </span>
      <span className="flex items-center gap-1">
        {valueDisplay}
        {result.met ? (
          <CheckCircle2 className="h-3 w-3 text-green-400" />
        ) : (
          <XCircle className="h-3 w-3 text-zinc-600" />
        )}
      </span>
    </div>
  );
};

// 개별 엔딩 카드
const EndingCard = ({
  ending,
  stats,
  flags,
  survivorCount,
  rank,
}: {
  ending: EndingArchetype;
  stats: Record<string, number>;
  flags: Record<string, boolean | number>;
  survivorCount: number;
  rank: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { progress, metConditions, totalConditions } = calculateEndingProgress(
    ending,
    stats,
    flags,
    survivorCount
  );

  // 엔딩 타입별 아이콘
  const getEndingIcon = () => {
    if (ending.endingId.includes('ESCAPE')) return '🏃';
    if (ending.endingId.includes('DEFENSE') || ending.endingId.includes('RESIST')) return '⚔️';
    if (ending.endingId.includes('NEGOTIATE') || ending.endingId.includes('ALLIANCE')) return '🤝';
    if (ending.isGoalSuccess) return '✨';
    return '📖';
  };

  // 진행률별 색상
  const getProgressColor = () => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn(
      "border rounded-lg p-2 transition-all",
      progress >= 80 ? "border-green-800 bg-green-950/20" :
      progress >= 50 ? "border-yellow-800 bg-yellow-950/10" :
      "border-zinc-800 bg-zinc-900/50"
    )}>
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{getEndingIcon()}</span>
          <div className="text-left">
            <div className="text-xs font-medium text-zinc-200">{ending.title}</div>
            <div className="text-[10px] text-zinc-500">
              {metConditions}/{totalConditions} 조건 충족
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-bold",
            progress >= 80 ? "text-green-400" :
            progress >= 50 ? "text-yellow-400" :
            "text-zinc-500"
          )}>
            {Math.round(progress)}%
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* 진행바 */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 상세 조건 (확장 시) */}
      {isExpanded && (
        <div className="mt-2 space-y-1 border-t border-zinc-800 pt-2">
          <div className="text-[10px] text-zinc-400 mb-1">{ending.description}</div>
          {ending.systemConditions.map((condition, idx) => (
            <ConditionItem
              key={idx}
              condition={condition}
              stats={stats}
              flags={flags}
              survivorCount={survivorCount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const EndingProgress = ({
  endingArchetypes,
  currentStats,
  currentFlags,
  survivorCount,
  currentDay,
  scenario,
  isExpanded: initialExpanded = false,
}: EndingProgressProps) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // 동적 Day 계산
  const routeActivationDay = getRouteActivationDay(scenario);
  const endingCheckDay = getEndingCheckDay(scenario);

  // 루트 활성화 전에는 표시하지 않음
  if (currentDay < routeActivationDay) {
    return null;
  }

  // 시간 제한 엔딩 제외하고, 진행률 높은 순으로 정렬
  const checkableEndings = endingArchetypes
    .filter((ending) => ending.systemConditions.length > 0 && ending.endingId !== 'ENDING_TIME_UP')
    .map((ending) => ({
      ending,
      ...calculateEndingProgress(ending, currentStats, currentFlags, survivorCount),
    }))
    .sort((a, b) => b.progress - a.progress);

  // 상위 3개만 표시 (축소 시), 전체 표시 (확장 시)
  const displayedEndings = isExpanded ? checkableEndings : checkableEndings.slice(0, 3);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <span className="text-sm font-medium text-zinc-200">엔딩 진행도</span>
          {currentDay >= endingCheckDay && (
            <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-[10px] text-yellow-400">
              엔딩 체크 활성
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span>{checkableEndings.length}개 엔딩</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* 엔딩 카드 목록 */}
      <div className="space-y-2">
        {displayedEndings.map(({ ending }, idx) => (
          <EndingCard
            key={ending.endingId}
            ending={ending}
            stats={currentStats}
            flags={currentFlags}
            survivorCount={survivorCount}
            rank={idx + 1}
          />
        ))}
      </div>

      {/* 더보기 힌트 */}
      {!isExpanded && checkableEndings.length > 3 && (
        <div className="mt-2 text-center text-[10px] text-zinc-600">
          +{checkableEndings.length - 3}개 더보기
        </div>
      )}

      {/* 엔딩 체크 시점 미만 안내 */}
      {currentDay < endingCheckDay && (
        <div className="mt-2 text-center text-[10px] text-zinc-500">
          Day {endingCheckDay}부터 엔딩 조건이 체크됩니다
        </div>
      )}
    </div>
  );
};
