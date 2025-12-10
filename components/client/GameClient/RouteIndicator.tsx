import { SaveState } from '@/types';
import { Compass, Shield, Users, DoorOpen } from 'lucide-react';

// 루트 타입 정의
type RouteType = '탈출' | '항전' | '협상' | '미정';

interface RouteInfo {
  type: RouteType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// 루트 판정 로직
const determineRoute = (saveState: SaveState): RouteInfo => {
  const { scenarioStats, flags } = saveState.context;
  const currentDay = saveState.context.currentDay ?? 1;

  const communityCohesion = scenarioStats['communityCohesion'] ?? 50;

  // 플래그 기반 루트 점수 계산
  const escapeScore = calculateEscapeScore(flags);
  const defenseScore = calculateDefenseScore(flags);
  const negotiationScore = calculateNegotiationScore(flags, communityCohesion);

  // Day 1-2: 아직 미정
  if (currentDay <= 2) {
    return {
      type: '미정',
      label: '이야기가 시작됩니다',
      icon: <Compass className="h-4 w-4" />,
      color: 'text-zinc-500',
    };
  }

  // Day 3+: 루트 분기 시작
  const maxScore = Math.max(escapeScore, defenseScore, negotiationScore);

  if (maxScore < 20) {
    return {
      type: '미정',
      label: '운명의 갈림길',
      icon: <Compass className="h-4 w-4" />,
      color: 'text-red-400',
    };
  }

  if (escapeScore >= defenseScore && escapeScore >= negotiationScore) {
    return {
      type: '탈출',
      label: '새로운 곳을 향해',
      icon: <DoorOpen className="h-4 w-4" />,
      color: 'text-blue-400',
    };
  }

  if (defenseScore >= negotiationScore) {
    return {
      type: '항전',
      label: '끝까지 지킨다',
      icon: <Shield className="h-4 w-4" />,
      color: 'text-red-400',
    };
  }

  return {
    type: '협상',
    label: '함께 살아남는다',
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-400',
  };
};

// 탈출 루트 점수 (ZERO_HOUR.json 기준)
const calculateEscapeScore = (flags: { [key: string]: boolean | number }): number => {
  let score = 0;
  if (flags['FLAG_ESCAPE_VEHICLE_SECURED']) score += 50; // route: 탈출
  if (flags['FLAG_LEADER_SACRIFICE']) score += 30; // route: 탈출
  return score;
};

// 항전 루트 점수 (ZERO_HOUR.json 기준)
const calculateDefenseScore = (flags: { [key: string]: boolean | number }): number => {
  let score = 0;
  if (flags['FLAG_DEFENSES_COMPLETE']) score += 50; // route: 항전
  if (flags['FLAG_RESOURCE_MONOPOLY']) score += 30; // route: 항전
  if (flags['FLAG_IDEOLOGY_ESTABLISHED']) score += 20; // route: 항전
  return score;
};

// 협상 루트 점수 (ZERO_HOUR.json 기준)
const calculateNegotiationScore = (
  flags: { [key: string]: boolean | number },
  communityCohesion: number,
): number => {
  let score = 0;
  if (flags['FLAG_ALLY_NETWORK_FORMED']) score += 50; // route: 협상
  if (flags['FLAG_GOVERNMENT_CONTACT']) score += 30; // route: 협상
  if (flags['FLAG_UNDERGROUND_HIDEOUT']) score += 20; // route: 협상
  if (communityCohesion >= 70) score += 10;
  else if (communityCohesion >= 50) score += 5;
  return score;
};

// Day 진행 바 컴포넌트
const DayProgressBar = ({ currentDay, maxDays = 7 }: { currentDay: number; maxDays?: number }) => {
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
        <span className="text-yellow-600">Day 5 엔딩 체크</span>
        <span>종료</span>
      </div>
    </div>
  );
};

export const RouteIndicator = ({
  saveState,
  isCompact = false,
}: {
  saveState: SaveState;
  isCompact?: boolean;
}) => {
  const routeInfo = determineRoute(saveState);
  const currentDay = saveState.context.currentDay ?? 1;

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
            Day {currentDay}/7
          </span>
        </div>
        {/* 컴팩트 진행 바 */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-500"
            style={{ width: `${(currentDay / 7) * 100}%` }}
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
          Day {currentDay}/7
        </span>
      </div>
      {/* 진행 바 추가 */}
      <DayProgressBar currentDay={currentDay} maxDays={7} />
    </div>
  );
};
