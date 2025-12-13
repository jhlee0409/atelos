import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
// [v1.4 REMOVED] Flag icon - Dynamic Ending System에서 flagsAcquired 제거

export interface StatChange {
  statId: string;
  statName: string;
  originalChange: number;
  amplifiedChange: number;
  appliedChange: number;
  previousValue: number;
  newValue: number;
}

export interface RelationshipChange {
  pair: string;
  change: number;
  previousValue: number;
  newValue: number;
}

export interface ChangeSummaryData {
  statChanges: StatChange[];
  relationshipChanges: RelationshipChange[];
  // [v1.4 REMOVED] flagsAcquired - Dynamic Ending System에서 ActionHistory로 대체
  timestamp: number;
}

export const ChangeSummary = ({
  data,
  isCompact = false,
}: {
  data: ChangeSummaryData;
  isCompact?: boolean;
}) => {
  const hasChanges =
    data.statChanges.length > 0 ||
    data.relationshipChanges.length > 0;

  if (!hasChanges) return null;

  const getChangeIcon = (change: number) => {
    if (change > 0)
      return <TrendingUp className="h-3 w-3 text-green-400" />;
    if (change < 0)
      return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-zinc-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-zinc-500';
  };

  const formatChange = (change: number) => {
    if (change > 0) return `+${change}`;
    return change.toString();
  };

  if (isCompact) {
    // 컴팩트 모드: 한 줄로 요약
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {data.statChanges.map((stat, idx) => (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
              stat.appliedChange > 0 ? 'bg-green-900/30' : 'bg-red-900/30'
            )}
          >
            {getChangeIcon(stat.appliedChange)}
            <span className="text-zinc-400">{stat.statName}</span>
            <span className={getChangeColor(stat.appliedChange)}>
              {formatChange(stat.appliedChange)}
            </span>
          </span>
        ))}
        {data.relationshipChanges.map((rel, idx) => (
          <span
            key={`rel-${idx}`}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
              rel.change > 0 ? 'bg-blue-900/30' : 'bg-orange-900/30'
            )}
          >
            <Users className="h-3 w-3 text-zinc-400" />
            <span className="text-zinc-400">{rel.pair.split('-')[0]}</span>
            <span className={rel.change > 0 ? 'text-blue-400' : 'text-orange-400'}>
              {formatChange(rel.change)}
            </span>
          </span>
        ))}
        {/* [v1.4 REMOVED] flagsAcquired 렌더링 - Dynamic Ending System에서 ActionHistory로 대체 */}
      </div>
    );
  }

  // 풀 모드: 상세 정보 표시
  return (
    <div className="my-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-2 text-xs font-semibold text-zinc-500">결과</div>

      {/* 스탯 변화 */}
      {data.statChanges.length > 0 && (
        <div className="space-y-1">
          {data.statChanges.map((stat, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {getChangeIcon(stat.appliedChange)}
                <span className="text-zinc-300">{stat.statName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{stat.previousValue}</span>
                <span className="text-zinc-600">→</span>
                <span className={getChangeColor(stat.appliedChange)}>
                  {stat.newValue}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    stat.appliedChange > 0 ? 'bg-green-900/30' : 'bg-red-900/30',
                    getChangeColor(stat.appliedChange)
                  )}
                >
                  {formatChange(stat.appliedChange)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 관계 변화 */}
      {data.relationshipChanges.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-zinc-800 pt-2">
          {data.relationshipChanges.map((rel, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-zinc-400" />
                <span className="text-zinc-300">{rel.pair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{rel.previousValue}</span>
                <span className="text-zinc-600">→</span>
                <span className={rel.change > 0 ? 'text-blue-400' : 'text-orange-400'}>
                  {rel.newValue}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    rel.change > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'
                  )}
                >
                  {formatChange(rel.change)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* [v1.4 REMOVED] 획득한 플래그 - Dynamic Ending System에서 ActionHistory로 대체 */}
    </div>
  );
};
