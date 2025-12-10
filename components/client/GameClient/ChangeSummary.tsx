import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Users, Flag } from 'lucide-react';

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
  flagsAcquired: string[];
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
    data.relationshipChanges.length > 0 ||
    data.flagsAcquired.length > 0;

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
        {data.flagsAcquired.map((flag, idx) => (
          <span
            key={`flag-${idx}`}
            className="inline-flex items-center gap-1 rounded bg-purple-900/30 px-1.5 py-0.5"
          >
            <Flag className="h-3 w-3 text-purple-400" />
            <span className="text-purple-300">
              {flag.replace('FLAG_', '').replace(/_/g, ' ')}
            </span>
          </span>
        ))}
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

      {/* 획득한 플래그 */}
      {data.flagsAcquired.length > 0 && (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <div className="flex flex-wrap gap-1">
            {data.flagsAcquired.map((flag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded bg-purple-900/40 px-2 py-1 text-xs text-purple-300"
              >
                <Flag className="h-3 w-3" />
                {flag.replace('FLAG_', '').replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
