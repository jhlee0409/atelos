import { SaveState } from '@/types';
import { Compass, Shield, Users, DoorOpen, HelpCircle } from 'lucide-react';

// 루트 타입 정의
type RouteType = '탈출' | '항전' | '협상' | '미정';

interface RouteInfo {
  type: RouteType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  progress: number; // 0-100
}

// 루트 판정 로직
const determineRoute = (saveState: SaveState): RouteInfo => {
  const { scenarioStats, flags, currentDay } = saveState.context;

  const cityChaos = scenarioStats['cityChaos'] ?? 60;
  const communityCohesion = scenarioStats['communityCohesion'] ?? 50;
  const survivalFoundation = scenarioStats['survivalFoundation'] ?? 20;

  // 플래그 기반 루트 점수 계산
  const escapeScore = calculateEscapeScore(flags);
  const defenseScore = calculateDefenseScore(flags);
  const negotiationScore = calculateNegotiationScore(flags, communityCohesion);

  // Day 1-2: 아직 미정
  if (currentDay <= 2) {
    return {
      type: '미정',
      label: '공통 루트',
      description: '아직 운명이 결정되지 않았습니다',
      icon: <Compass className="h-4 w-4" />,
      color: 'text-gray-400',
      progress: 0,
    };
  }

  // Day 3+: 루트 분기 시작
  const maxScore = Math.max(escapeScore, defenseScore, negotiationScore);

  // 점수가 모두 낮으면 미정
  if (maxScore < 20) {
    return {
      type: '미정',
      label: '분기점',
      description: '선택에 따라 운명이 갈립니다',
      icon: <HelpCircle className="h-4 w-4" />,
      color: 'text-yellow-400',
      progress: Math.min(maxScore * 2, 30),
    };
  }

  if (escapeScore >= defenseScore && escapeScore >= negotiationScore) {
    return {
      type: '탈출',
      label: '탈출 루트',
      description: '이 도시를 벗어나는 것이 목표',
      icon: <DoorOpen className="h-4 w-4" />,
      color: 'text-blue-400',
      progress: Math.min(escapeScore, 100),
    };
  }

  if (defenseScore >= negotiationScore) {
    return {
      type: '항전',
      label: '항전 루트',
      description: '끝까지 지켜내겠다는 의지',
      icon: <Shield className="h-4 w-4" />,
      color: 'text-red-400',
      progress: Math.min(defenseScore, 100),
    };
  }

  return {
    type: '협상',
    label: '협상 루트',
    description: '대화와 연대로 해결책을 찾는다',
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-400',
    progress: Math.min(negotiationScore, 100),
  };
};

// 탈출 루트 점수
const calculateEscapeScore = (flags: { [key: string]: boolean | number }): number => {
  let score = 0;
  if (flags['FLAG_ESCAPE_VEHICLE_SECURED']) score += 50;
  if (flags['FLAG_GOVERNMENT_CONTACT']) score += 30;
  if (flags['FLAG_UNDERGROUND_HIDEOUT']) score += 20;
  return score;
};

// 항전 루트 점수
const calculateDefenseScore = (flags: { [key: string]: boolean | number }): number => {
  let score = 0;
  if (flags['FLAG_DEFENSES_COMPLETE']) score += 50;
  if (flags['FLAG_RESOURCE_MONOPOLY']) score += 30;
  if (flags['FLAG_LEADER_SACRIFICE']) score += 20;
  return score;
};

// 협상 루트 점수
const calculateNegotiationScore = (
  flags: { [key: string]: boolean | number },
  communityCohesion: number
): number => {
  let score = 0;
  if (flags['FLAG_ALLY_NETWORK_FORMED']) score += 50;
  if (flags['FLAG_IDEOLOGY_ESTABLISHED']) score += 30;
  // 공동체 응집력이 높으면 협상 루트 가능성 증가
  if (communityCohesion >= 70) score += 20;
  else if (communityCohesion >= 50) score += 10;
  return score;
};

export const RouteIndicator = ({
  saveState,
  isCompact = false,
}: {
  saveState: SaveState;
  isCompact?: boolean;
}) => {
  const routeInfo = determineRoute(saveState);
  const currentDay = saveState.context.currentDay;

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5">
        <span className={routeInfo.color}>{routeInfo.icon}</span>
        <span className="text-xs text-gray-300">{routeInfo.label}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={routeInfo.color}>{routeInfo.icon}</span>
          <div>
            <span className={`text-sm font-medium ${routeInfo.color}`}>
              {routeInfo.label}
            </span>
            <p className="text-xs text-gray-500">{routeInfo.description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400">Day {currentDay}/7</span>
        </div>
      </div>

      {/* 진행도 바 (Day 3 이후에만 표시) */}
      {currentDay >= 3 && routeInfo.progress > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                routeInfo.type === '탈출'
                  ? 'bg-blue-500'
                  : routeInfo.type === '항전'
                    ? 'bg-red-500'
                    : routeInfo.type === '협상'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
              }`}
              style={{ width: `${routeInfo.progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-500">
            확정도 {routeInfo.progress}%
          </p>
        </div>
      )}
    </div>
  );
};
