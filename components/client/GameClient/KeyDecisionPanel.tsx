import { cn } from '@/lib/utils';
import { KeyDecision } from '@/types';
// [v1.4 REMOVED] getKoreanFlagName - Dynamic Ending System에서 flagsAcquired 제거
import { ChevronDown, ChevronUp, History, Sword, Heart, Scale, Compass, Users } from 'lucide-react';
// [v1.4 REMOVED] Flag icon - Dynamic Ending System에서 flagsAcquired 제거
import { useState } from 'react';

interface KeyDecisionPanelProps {
  keyDecisions: KeyDecision[];
  currentDay: number;
  isExpanded?: boolean;
}

// 카테고리별 아이콘 및 색상
const getCategoryConfig = (category: KeyDecision['category']) => {
  switch (category) {
    case 'survival':
      return {
        icon: Sword,
        color: 'text-red-400',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-800',
        label: '생존',
      };
    case 'relationship':
      return {
        icon: Heart,
        color: 'text-pink-400',
        bgColor: 'bg-pink-900/20',
        borderColor: 'border-pink-800',
        label: '관계',
      };
    case 'moral':
      return {
        icon: Scale,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-800',
        label: '도덕',
      };
    case 'strategic':
      return {
        icon: Compass,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-800',
        label: '전략',
      };
    default:
      return {
        icon: History,
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-900/20',
        borderColor: 'border-zinc-800',
        label: '일반',
      };
  }
};

// 개별 결정 카드
const DecisionCard = ({
  decision,
  isLatest,
}: {
  decision: KeyDecision;
  isLatest: boolean;
}) => {
  const config = getCategoryConfig(decision.category);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative border rounded-lg p-2 transition-all",
        config.borderColor,
        config.bgColor,
        isLatest && "ring-1 ring-white/20"
      )}
    >
      {/* Day 표시 */}
      <div className="absolute -top-2 -left-1 flex items-center gap-1">
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          config.bgColor,
          config.color
        )}>
          Day {decision.day}
        </span>
        {isLatest && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
            최근
          </span>
        )}
      </div>

      {/* 카테고리 아이콘 및 라벨 */}
      <div className="mt-2 flex items-start gap-2">
        <div className={cn("rounded p-1", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          {/* 선택 텍스트 */}
          <div className="text-xs text-zinc-200 font-medium line-clamp-2">
            "{decision.choice}"
          </div>

          {/* 결과 */}
          <div className="mt-1 text-[10px] text-zinc-400">
            → {decision.consequence}
          </div>

          {/* [v1.4 REMOVED] 획득 플래그 - Dynamic Ending System에서 ActionHistory로 대체 */}

          {/* 영향받은 캐릭터 */}
          {decision.impactedCharacters && decision.impactedCharacters.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Users className="h-2.5 w-2.5 text-zinc-500" />
              <span className="text-[9px] text-zinc-500">
                {decision.impactedCharacters.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 타임라인 뷰 (축소)
const TimelineView = ({ decisions }: { decisions: KeyDecision[] }) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {decisions.map((decision, idx) => {
        const config = getCategoryConfig(decision.category);
        const Icon = config.icon;
        return (
          <div
            key={idx}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 rounded-full px-2 py-1",
              config.bgColor,
              config.borderColor,
              "border"
            )}
            title={`Day ${decision.day}: ${decision.choice}`}
          >
            <span className="text-[10px] text-zinc-400">D{decision.day}</span>
            <Icon className={cn("h-3 w-3", config.color)} />
          </div>
        );
      })}
    </div>
  );
};

// 카테고리별 요약
const CategorySummary = ({ decisions }: { decisions: KeyDecision[] }) => {
  const categoryCounts = decisions.reduce(
    (acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(categoryCounts).map(([category, count]) => {
        const config = getCategoryConfig(category as KeyDecision['category']);
        return (
          <div
            key={category}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
              config.bgColor,
              config.color
            )}
          >
            {config.label}: {count}
          </div>
        );
      })}
    </div>
  );
};

export const KeyDecisionPanel = ({
  keyDecisions,
  currentDay,
  isExpanded: initialExpanded = false,
}: KeyDecisionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // 결정이 없으면 표시하지 않음
  if (!keyDecisions || keyDecisions.length === 0) {
    return null;
  }

  // 최근 결정 순으로 정렬
  const sortedDecisions = [...keyDecisions].sort((a, b) => {
    if (b.day !== a.day) return b.day - a.day;
    return b.turn - a.turn;
  });

  // 최근 3개 (축소 시)
  const recentDecisions = sortedDecisions.slice(0, 3);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">주요 결정 기록</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {keyDecisions.length}개
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && <CategorySummary decisions={keyDecisions} />}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* 축소 시: 타임라인 뷰 */}
      {!isExpanded && (
        <TimelineView decisions={sortedDecisions.slice(0, 7)} />
      )}

      {/* 확장 시: 상세 카드 목록 */}
      {isExpanded && (
        <div className="space-y-3">
          {/* 카테고리 요약 */}
          <CategorySummary decisions={keyDecisions} />

          {/* 결정 카드 목록 */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sortedDecisions.map((decision, idx) => (
              <DecisionCard
                key={`${decision.day}-${decision.turn}-${idx}`}
                decision={decision}
                isLatest={idx === 0}
              />
            ))}
          </div>

          {/* 플레이 스타일 분석 */}
          {keyDecisions.length >= 3 && (
            <div className="mt-2 rounded bg-zinc-800/50 p-2">
              <div className="text-[10px] text-zinc-500 mb-1">플레이 스타일</div>
              <PlayStyleAnalysis decisions={keyDecisions} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 플레이 스타일 분석
const PlayStyleAnalysis = ({ decisions }: { decisions: KeyDecision[] }) => {
  const categoryCounts = decisions.reduce(
    (acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // 가장 많은 카테고리 찾기
  const dominant = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  if (!dominant) return null;

  const getStyleDescription = (category: string) => {
    switch (category) {
      case 'survival':
        return '생존 우선 - 실용적이고 위험을 감수하는 성향';
      case 'relationship':
        return '관계 중시 - 사람들과의 유대를 중요하게 생각';
      case 'moral':
        return '도덕적 가치 - 원칙과 윤리를 우선시';
      case 'strategic':
        return '전략적 사고 - 장기적 계획과 효율 추구';
      default:
        return '균형잡힌 접근';
    }
  };

  const config = getCategoryConfig(dominant[0] as KeyDecision['category']);

  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded p-1", config.bgColor)}>
        <config.icon className={cn("h-3 w-3", config.color)} />
      </div>
      <div className="text-[10px] text-zinc-300">
        {getStyleDescription(dominant[0])}
      </div>
    </div>
  );
};
