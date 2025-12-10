import { cn } from '@/lib/utils';
import { ExplorationLocation, SaveState, ScenarioData, WorldLocation } from '@/types';
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
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Briefcase,
  Compass
} from 'lucide-react';
import { useState } from 'react';
import { getLocationsForUI } from '@/lib/world-state-manager';

interface ExplorationPanelProps {
  scenario: ScenarioData;
  saveState: SaveState;
  onExplore: (location: ExplorationLocation) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// 장소 아이콘 매핑 (WorldLocation 아이콘도 지원)
const getLocationIcon = (icon: ExplorationLocation['icon'] | WorldLocation['icon']) => {
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
    case 'office':
      return Briefcase;
    case 'corridor':
      return Compass;
    case 'exterior':
      return Eye;
    case 'hidden':
      return Eye;
    default:
      return MapPin;
  }
};

// WorldState UI 위치 데이터 타입
interface UILocation {
  locationId: string;
  name: string;
  description: string;
  icon: WorldLocation['icon'];
  available: boolean;
  statusReason?: string;
  hint?: string;
}

// 시나리오에 따른 탐색 장소 생성 (WorldState 우선)
const generateLocationsForScenario = (
  scenario: ScenarioData,
  currentDay: number,
  saveState?: SaveState
): (ExplorationLocation | UILocation)[] => {
  // WorldState가 있으면 동적 위치 사용
  if (saveState?.context.worldState) {
    const worldLocations = getLocationsForUI(saveState.context.worldState, saveState);
    console.log(`🗺️ WorldState 위치 ${worldLocations.length}개 로드`);
    return worldLocations;
  }

  // 폴백: 정적 위치 생성 (레거시)
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

// 장소 카드 (UILocation 지원)
const LocationCard = ({
  location,
  onExplore,
  isLoading,
}: {
  location: ExplorationLocation | UILocation;
  onExplore: (location: ExplorationLocation) => void;
  isLoading?: boolean;
}) => {
  const Icon = getLocationIcon(location.icon);
  const isLocked = !location.available;
  const statusReason = 'statusReason' in location ? location.statusReason : undefined;
  const hint = 'hint' in location ? location.hint : undefined;

  // 상태에 따른 아이콘 선택
  const getStatusIcon = () => {
    if (!statusReason) return null;
    if (statusReason.includes('파괴') || statusReason.includes('무너')) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (statusReason.includes('차단') || statusReason.includes('봉쇄')) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <Lock className="h-5 w-5 text-zinc-600" />;
  };

  return (
    <button
      onClick={() => !isLocked && onExplore(location as ExplorationLocation)}
      disabled={isLocked || isLoading}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        isLocked
          ? statusReason?.includes('파괴')
            ? "border-red-900/50 bg-red-950/20 opacity-60 cursor-not-allowed"
            : statusReason?.includes('차단')
              ? "border-yellow-900/50 bg-yellow-950/20 opacity-60 cursor-not-allowed"
              : "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
          : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-600",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isLocked
            ? statusReason?.includes('파괴')
              ? "bg-red-900/30"
              : statusReason?.includes('차단')
                ? "bg-yellow-900/30"
                : "bg-zinc-800"
            : "bg-zinc-800/80"
        )}>
          {isLocked ? (
            getStatusIcon() || <Lock className="h-5 w-5 text-zinc-600" />
          ) : (
            <Icon className="h-5 w-5 text-zinc-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              isLocked
                ? statusReason?.includes('파괴')
                  ? "text-red-400/60 line-through"
                  : statusReason?.includes('차단')
                    ? "text-yellow-400/60"
                    : "text-zinc-600"
                : "text-zinc-200"
            )}>
              {location.name}
            </span>
            {'cooldownUntil' in location && location.cooldownUntil && (
              <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                <Clock className="h-2.5 w-2.5" />
                Day {location.cooldownUntil}까지 대기
              </span>
            )}
          </div>
          <p className={cn(
            "text-xs mt-1",
            isLocked ? "text-zinc-600" : "text-zinc-500"
          )}>
            {isLocked && statusReason ? statusReason : location.description}
          </p>
          {/* 힌트 표시 (가능한 발견물) */}
          {!isLocked && hint && (
            <p className="text-[10px] mt-1 text-emerald-500/70 flex items-center gap-1">
              <Eye className="h-2.5 w-2.5" />
              {hint}
            </p>
          )}
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
  const locations = generateLocationsForScenario(scenario, currentDay, saveState);

  // 접근 가능한 위치와 불가능한 위치 분리
  const availableLocations = locations.filter(loc => loc.available);
  const unavailableLocations = locations.filter(loc => !loc.available);

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

      {/* 접근 가능한 장소 */}
      <div className="space-y-2">
        {availableLocations.map((location) => (
          <LocationCard
            key={location.locationId}
            location={location}
            onExplore={onExplore}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* 접근 불가능한 장소 (축소 표시) */}
      {unavailableLocations.length > 0 && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <div className="text-[10px] text-zinc-600 mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            접근 불가 ({unavailableLocations.length})
          </div>
          <div className="space-y-1.5">
            {unavailableLocations.map((location) => (
              <LocationCard
                key={location.locationId}
                location={location}
                onExplore={onExplore}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

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
