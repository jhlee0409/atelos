import { cn } from '@/lib/utils';
import { ExplorationLocation, SaveState, ScenarioData } from '@/types';
import {
  Warehouse,
  DoorOpen,
  Cross,
  Building2,
  ArrowDown,
  Bed,
  MapPin,
  Loader2,
  Lock,
  Clock
} from 'lucide-react';
import { useState } from 'react';

interface ExplorationPanelProps {
  scenario: ScenarioData;
  saveState: SaveState;
  onExplore: (location: ExplorationLocation) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// 장소 아이콘 매핑
const getLocationIcon = (icon: ExplorationLocation['icon']) => {
  switch (icon) {
    case 'warehouse':
      return Warehouse;
    case 'entrance':
      return DoorOpen;
    case 'medical':
      return Cross;
    case 'roof':
      return Building2;
    case 'basement':
      return ArrowDown;
    case 'quarters':
      return Bed;
    default:
      return MapPin;
  }
};

// 시나리오에 따른 탐색 장소 생성
const generateLocationsForScenario = (
  scenario: ScenarioData,
  currentDay: number
): ExplorationLocation[] => {
  // 기본 장소들
  const baseLocations: ExplorationLocation[] = [
    {
      locationId: 'storage',
      name: '창고',
      description: '물자가 보관된 창고. 유용한 자원을 찾을 수 있을지도.',
      icon: 'warehouse',
      available: true,
    },
    {
      locationId: 'entrance',
      name: '입구',
      description: '외부 상황을 살펴볼 수 있는 곳.',
      icon: 'entrance',
      available: true,
    },
    {
      locationId: 'medical',
      name: '의무실',
      description: '부상자와 의료 물자가 있는 곳.',
      icon: 'medical',
      available: true,
    },
  ];

  // Day 3 이후 추가 장소 개방
  if (currentDay >= 3) {
    baseLocations.push({
      locationId: 'roof',
      name: '옥상',
      description: '전체 상황을 조망할 수 있지만 위험할 수 있다.',
      icon: 'roof',
      available: true,
    });
  }

  // Day 5 이후 추가 장소 개방
  if (currentDay >= 5) {
    baseLocations.push({
      locationId: 'basement',
      name: '지하',
      description: '아직 탐색하지 않은 지하 공간. 뭔가 숨겨져 있을지도.',
      icon: 'basement',
      available: true,
    });
  }

  // 시나리오 장르에 따른 추가 장소
  const genres = scenario.genre || [];
  if (genres.includes('SF') || genres.includes('우주')) {
    baseLocations.push({
      locationId: 'quarters',
      name: '승무원 숙소',
      description: '개인 물품이나 단서를 찾을 수 있는 숙소 구역.',
      icon: 'quarters',
      available: currentDay >= 2,
    });
  }

  return baseLocations;
};

// 장소 카드
const LocationCard = ({
  location,
  onExplore,
  isLoading,
}: {
  location: ExplorationLocation;
  onExplore: (location: ExplorationLocation) => void;
  isLoading?: boolean;
}) => {
  const Icon = getLocationIcon(location.icon);
  const isLocked = !location.available;

  return (
    <button
      onClick={() => !isLocked && onExplore(location)}
      disabled={isLocked || isLoading}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        isLocked
          ? "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
          : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-600",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isLocked ? "bg-zinc-800" : "bg-zinc-800/80"
        )}>
          {isLocked ? (
            <Lock className="h-5 w-5 text-zinc-600" />
          ) : (
            <Icon className="h-5 w-5 text-zinc-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              isLocked ? "text-zinc-600" : "text-zinc-200"
            )}>
              {location.name}
            </span>
            {location.cooldownUntil && (
              <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                <Clock className="h-2.5 w-2.5" />
                Day {location.cooldownUntil}까지 대기
              </span>
            )}
          </div>
          <p className={cn(
            "text-xs mt-1",
            isLocked ? "text-zinc-700" : "text-zinc-500"
          )}>
            {location.description}
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        )}
      </div>
    </button>
  );
};

export const ExplorationPanel = ({
  scenario,
  saveState,
  onExplore,
  onClose,
  isLoading = false,
}: ExplorationPanelProps) => {
  const currentDay = saveState.context.currentDay || 1;
  const locations = generateLocationsForScenario(scenario, currentDay);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">주변 탐색</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            Day {currentDay}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300"
          disabled={isLoading}
        >
          닫기 ✕
        </button>
      </div>

      {/* 설명 */}
      <div className="mb-3 text-xs text-zinc-500">
        탐색을 통해 자원이나 정보를 얻을 수 있습니다. 단, 시간이 소모될 수 있습니다.
      </div>

      {/* 장소 목록 */}
      <div className="space-y-2">
        {locations.map((location) => (
          <LocationCard
            key={location.locationId}
            location={location}
            onExplore={onExplore}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* 건너뛰기 버튼 */}
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        disabled={isLoading}
      >
        건너뛰기 →
      </button>
    </div>
  );
};
