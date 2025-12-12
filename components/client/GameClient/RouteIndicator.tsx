import { SaveState, ScenarioData, ActionHistoryEntry } from '@/types';
import { Compass, Shield, Users, DoorOpen } from 'lucide-react';
import {
  isBeforeRouteActivation,
  getTotalDays,
  getEndingCheckDay,
  calculateRouteScores,
  getDominantRoute,
} from '@/lib/gameplay-config';

// 루트 타입 정의
type RouteType = '탈출' | '항전' | '협상' | '미정';

interface RouteInfo {
  type: RouteType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// 루트 타입에 따른 아이콘/컬러 매핑
const ROUTE_DISPLAY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  '탈출': {
    icon: <DoorOpen className="h-4 w-4" />,
    color: 'text-blue-400',
    label: '새로운 곳을 향해',
  },
  '항전': {
    icon: <Shield className="h-4 w-4" />,
    color: 'text-red-400',
    label: '끝까지 지킨다',
  },
  '협상': {
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-400',
    label: '함께 살아남는다',
  },
  // 영문 매핑 (시나리오가 영문 루트 이름을 사용할 경우)
  'escape': {
    icon: <DoorOpen className="h-4 w-4" />,
    color: 'text-blue-400',
    label: '새로운 곳을 향해',
  },
  'defense': {
    icon: <Shield className="h-4 w-4" />,
    color: 'text-red-400',
    label: '끝까지 지킨다',
  },
  'negotiation': {
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-400',
    label: '함께 살아남는다',
  },
};

// 루트 판정 로직 (동적 점수 계산)
const determineRoute = (saveState: SaveState, actionHistory: ActionHistoryEntry[], scenario?: ScenarioData | null): RouteInfo => {
  const { scenarioStats } = saveState.context;
  const currentDay = saveState.context.currentDay ?? 1;

  // 루트 활성화 전: 아직 미정 (동적 계산)
  if (isBeforeRouteActivation(currentDay, scenario)) {
    return {
      type: '미정',
      label: '이야기가 시작됩니다',
      icon: <Compass className="h-4 w-4" />,
      color: 'text-zinc-500',
    };
  }

  // 동적 루트 점수 계산 (ActionHistory 패턴 기반)
  const routeScores = calculateRouteScores(
    actionHistory,
    scenarioStats,
    scenario
  );
  const dominantRoute = getDominantRoute(routeScores);
  const maxScore = Math.max(...Object.values(routeScores));

  // 점수가 너무 낮으면 아직 미정
  if (maxScore < 20 || !dominantRoute) {
    return {
      type: '미정',
      label: '운명의 갈림길',
      icon: <Compass className="h-4 w-4" />,
      color: 'text-red-400',
    };
  }

  // 루트별 표시 설정 가져오기 (한글/영문 모두 지원)
  const displayConfig = ROUTE_DISPLAY_CONFIG[dominantRoute];
  if (displayConfig) {
    return {
      type: dominantRoute as RouteType,
      label: displayConfig.label,
      icon: displayConfig.icon,
      color: displayConfig.color,
    };
  }

  // 설정에 없는 커스텀 루트의 경우 기본 스타일 적용
  return {
    type: dominantRoute as RouteType,
    label: dominantRoute,
    icon: <Compass className="h-4 w-4" />,
    color: 'text-yellow-400',
  };
};

// Day 진행 바 컴포넌트
const DayProgressBar = ({
  currentDay,
  maxDays,
  endingCheckDay,
}: {
  currentDay: number;
  maxDays: number;
  endingCheckDay: number;
}) => {
  const progress = (currentDay / maxDays) * 100;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-500">진행도</span>
        <span className="text-zinc-400">
          {currentDay}일차 / {maxDays}일
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>시작</span>
        <span className="text-yellow-600">Day {endingCheckDay} 엔딩 체크</span>
        <span>종료</span>
      </div>
    </div>
  );
};

export const RouteIndicator = ({
  saveState,
  actionHistory = [],
  scenario,
  isCompact = false,
}: {
  saveState: SaveState;
  actionHistory?: ActionHistoryEntry[];
  scenario?: ScenarioData | null;
  isCompact?: boolean;
}) => {
  const routeInfo = determineRoute(saveState, actionHistory, scenario);
  const currentDay = saveState.context.currentDay ?? 1;
  const totalDays = getTotalDays(scenario);
  const endingCheckDay = getEndingCheckDay(scenario);

  if (isCompact) {
    // 컴팩트 모드: 기존 레이아웃 + 간단한 진행 바
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={routeInfo.color}>{routeInfo.icon}</span>
            <span className="text-xs text-zinc-400">{routeInfo.label}</span>
          </div>
          <span className="border border-red-900/50 bg-red-950/30 px-2 py-0.5 text-xs font-bold text-red-500">
            Day {currentDay}/{totalDays}
          </span>
        </div>
        {/* 컴팩트 진행 바 */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-500"
            style={{ width: `${(currentDay / totalDays) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={routeInfo.color}>{routeInfo.icon}</span>
          <span className={`text-sm ${routeInfo.color}`}>{routeInfo.label}</span>
        </div>
        <span className="border border-red-900/50 bg-red-950/30 px-2 py-0.5 text-xs font-bold text-red-500">
          Day {currentDay}/{totalDays}
        </span>
      </div>
      {/* 진행 바 추가 */}
      <DayProgressBar currentDay={currentDay} maxDays={totalDays} endingCheckDay={endingCheckDay} />
    </div>
  );
};
