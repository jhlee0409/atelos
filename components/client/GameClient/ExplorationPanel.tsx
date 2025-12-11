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
  Briefcase,
  Compass,
  Ban,
  ArrowLeft
} from 'lucide-react';
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
      return Compass;
    case 'hidden':
      return MapPin;
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
  wasDeactivated?: boolean; // 활성화됐다가 비활성화된 경우
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

// 장소 카드 (UILocation 지원) - 몰입감을 위해 간소화
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

  return (
    <button
      onClick={() => !isLocked && onExplore(location as ExplorationLocation)}
      disabled={isLocked || isLoading}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        isLocked
          ? "border-zinc-800 bg-zinc-900/30 opacity-40 cursor-not-allowed"
          : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-600",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isLocked ? "bg-zinc-800/50" : "bg-zinc-800/80"
        )}>
          {isLocked ? (
            <Ban className="h-5 w-5 text-zinc-600" />
          ) : (
            <Icon className="h-5 w-5 text-zinc-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn(
            "font-medium",
            isLocked ? "text-zinc-600" : "text-zinc-200"
          )}>
            {location.name}
          </span>
          <p className={cn(
            "text-xs mt-1",
            isLocked ? "text-zinc-600" : "text-zinc-500"
          )}>
            {isLocked && statusReason ? statusReason : location.description}
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
  const locations = generateLocationsForScenario(scenario, currentDay, saveState);

  // 접근 가능한 장소와 비활성화된 장소 분리
  const availableLocations = locations.filter(loc => loc.available);
  const deactivatedLocations = locations.filter(loc => !loc.available && ('wasDeactivated' in loc && loc.wasDeactivated));

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
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

      {/* 비활성화된 장소 (파괴/차단됨) */}
      {deactivatedLocations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <div className="space-y-1.5">
            {deactivatedLocations.map((location) => (
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

      {/* 돌아가기 버튼 */}
      <button
        onClick={onClose}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1 py-2 mt-3 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-3 w-3" />
        돌아가기
      </button>
    </div>
  );
};
