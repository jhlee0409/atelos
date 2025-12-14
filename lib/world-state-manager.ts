/**
 * 동적 월드 상태 관리 시스템 (World State Manager)
 * 위치, 발견물, 관계, 이벤트를 통합 관리합니다.
 */

import {
  WorldState,
  WorldLocation,
  ConcreteDiscovery,
  ObjectRelation,
  WorldEvent,
  WorldStateUpdateResult,
  LocationStatus,
  SaveState,
  ScenarioData,
  ScenarioLocation,
} from '@/types';

// =============================================================================
// 초기 월드 상태 생성
// =============================================================================

/**
 * ScenarioLocation을 WorldLocation으로 변환
 */
const convertScenarioLocationToWorldLocation = (
  scenarioLoc: ScenarioLocation
): WorldLocation => {
  return {
    locationId: scenarioLoc.locationId,
    name: scenarioLoc.name,
    baseDescription: scenarioLoc.description,
    currentDescription: scenarioLoc.description,
    icon: scenarioLoc.icon,
    status: scenarioLoc.initialStatus as LocationStatus,
    unlockCondition: scenarioLoc.unlockCondition
      ? {
          requiredDay: scenarioLoc.unlockCondition.requiredDay,
          requiredExploration: scenarioLoc.unlockCondition.requiredExploration,
        }
      : undefined,
    explorationCooldown: scenarioLoc.explorationCooldown ?? 1,
    dangerLevel: scenarioLoc.dangerLevel ?? 0,
    possibleDiscoveries: [], // 동적으로 생성됨
  };
};

/**
 * 시나리오 정의 위치를 WorldLocation[]으로 변환
 */
const createLocationsFromScenario = (
  scenarioLocations: ScenarioLocation[]
): WorldLocation[] => {
  return scenarioLocations.map(convertScenarioLocationToWorldLocation);
};

/**
 * v1.2: 동적 위치 시스템 - 시작 위치만 생성
 * 나머지 위치는 AI 서사를 통해 동적으로 발견됨
 */
const createInitialLocations = (scenario: ScenarioData): WorldLocation[] => {
  // 시나리오에 커스텀 위치가 정의되어 있으면 사용 (레거시 호환)
  if (scenario.locations && scenario.locations.length > 0) {
    console.log(`🗺️ 시나리오 정의 위치 ${scenario.locations.length}개 사용`);
    return createLocationsFromScenario(scenario.locations);
  }

  // v1.2: 동적 시스템 - 시작 위치만 생성
  const openingLocation = scenario.storyOpening?.openingLocation || '본부';
  console.log(`🗺️ 동적 위치 시스템: 시작 위치 "${openingLocation}"만 생성`);

  return [
    {
      locationId: 'starting_location',
      name: openingLocation,
      baseDescription: `이야기가 시작되는 장소입니다.`,
      currentDescription: `이야기가 시작되는 장소입니다.`,
      icon: 'home',
      status: 'available',
      explorationCooldown: 0,
      dangerLevel: 0,
      possibleDiscoveries: [],
    },
  ];
};

/**
 * v1.2: 동적 발견물 시스템 - 빈 배열로 시작
 * 발견물은 AI 서사를 통해 동적으로 생성됨
 */
const createInitialDiscoveries = (): ConcreteDiscovery[] => {
  // 동적 시스템에서는 발견물을 미리 정의하지 않음
  // AI가 탐색/대화 결과로 발견물을 생성
  return [];
};

/**
 * 초기 월드 상태 생성
 * v1.2: 동적 시스템 - 시작 위치만 생성, 나머지는 AI 서사로 발견
 */
export const createInitialWorldState = (
  scenario: ScenarioData,
  currentDay: number = 1
): WorldState => {
  const locations = createInitialLocations(scenario);
  const discoveries = createInitialDiscoveries();
  const openingLocation = scenario.storyOpening?.openingLocation || '본부';

  // 기본 관계 생성 (캐릭터-위치) - 시작 위치 기준
  const relations: ObjectRelation[] = scenario.characters.map((char, index) => ({
    relationId: `rel_char_loc_${index}`,
    type: 'character-location' as const,
    subject: { type: 'character' as const, id: char.characterName },
    object: { type: 'location' as const, id: 'starting_location' },
    description: `${char.characterName}이(가) ${openingLocation} 근처에 있음`,
    strength: 50,
    active: true,
  }));

  // v1.2: 동적 시스템에서는 하드코딩된 이벤트 없음
  // 이벤트는 AI 서사를 통해 동적으로 발생
  const pendingEvents: WorldEvent[] = [];

  return {
    locations,
    discoveries,
    relations,
    pendingEvents,
    triggeredEvents: [],
    inventory: [],
    documents: [],
    lastUpdated: {
      day: currentDay,
      actionIndex: 0,
    },
  };
};

// =============================================================================
// 위치 상태 관리
// =============================================================================

/**
 * 위치의 현재 접근 가능 여부 확인
 * @internal 내부에서만 사용됨
 */
const isLocationAccessible = (
  location: WorldLocation,
  worldState: WorldState,
  saveState: SaveState
): { accessible: boolean; reason?: string } => {
  const currentDay = saveState.context.currentDay || 1;
  const flags = saveState.context.flags || {};

  switch (location.status) {
    case 'available':
      // 쿨다운 확인
      if (location.lastExploredDay && location.explorationCooldown > 0) {
        const daysSinceExplored = currentDay - location.lastExploredDay;
        if (daysSinceExplored < location.explorationCooldown) {
          return {
            accessible: false,
            reason: `최근에 탐색함 (${location.explorationCooldown - daysSinceExplored}일 후 재탐색 가능)`,
          };
        }
      }
      return { accessible: true };

    case 'explored':
      return { accessible: false, reason: '이미 탐색 완료' };

    case 'destroyed':
      return { accessible: false, reason: location.statusReason || '파괴됨' };

    case 'blocked':
      return { accessible: false, reason: location.statusReason || '차단됨' };

    case 'hidden':
      // v1.2: hidden 상태도 requiredDay 조건으로 자동 해금 가능
      if (location.unlockCondition?.requiredDay && currentDay >= location.unlockCondition.requiredDay) {
        return { accessible: true };
      }
      return { accessible: false, reason: '아직 발견되지 않음' };

    case 'locked':
      // 잠금 해제 조건 확인
      if (location.unlockCondition) {
        if (location.unlockCondition.requiredDay && currentDay < location.unlockCondition.requiredDay) {
          return { accessible: false, reason: `Day ${location.unlockCondition.requiredDay}부터 접근 가능` };
        }
        if (location.unlockCondition.requiredFlag && !flags[location.unlockCondition.requiredFlag]) {
          return { accessible: false, reason: '특정 조건 충족 필요' };
        }
        if (location.unlockCondition.requiredItem) {
          if (!worldState.inventory.includes(location.unlockCondition.requiredItem)) {
            return { accessible: false, reason: '필요한 아이템 없음' };
          }
        }
      }
      return { accessible: true };

    default:
      return { accessible: false, reason: '알 수 없는 상태' };
  }
};

/**
 * 위치 상태 변경
 * @internal 내부에서만 사용됨
 */
const updateLocationStatus = (
  worldState: WorldState,
  locationId: string,
  newStatus: LocationStatus,
  reason?: string
): WorldState => {
  return {
    ...worldState,
    locations: worldState.locations.map((loc) =>
      loc.locationId === locationId
        ? {
            ...loc,
            status: newStatus,
            statusReason: reason,
            currentDescription: reason
              ? `${loc.baseDescription} (${reason})`
              : loc.baseDescription,
          }
        : loc
    ),
  };
};

/**
 * v1.2: 동적으로 새로운 위치 추가
 * AI 서사에서 발견된 장소를 WorldState에 추가
 * @internal addDiscoveredLocations에서 사용됨
 */
const addDiscoveredLocation = (
  worldState: WorldState,
  locationName: string,
  description?: string,
  icon?: WorldLocation['icon']
): WorldState => {
  // 이미 존재하는 위치인지 확인 (이름 기준)
  const existingLocation = worldState.locations.find(
    (loc) => loc.name === locationName || loc.locationId === locationName.toLowerCase().replace(/\s+/g, '_')
  );

  if (existingLocation) {
    console.log(`🗺️ 위치 "${locationName}"은(는) 이미 존재함`);
    return worldState;
  }

  // 고유 locationId 생성
  const locationId = `loc_${locationName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

  const newLocation: WorldLocation = {
    locationId,
    name: locationName,
    baseDescription: description || `${locationName}. 새로 발견된 장소입니다.`,
    currentDescription: description || `${locationName}. 새로 발견된 장소입니다.`,
    icon: icon || 'default',
    status: 'available',
    explorationCooldown: 1,
    dangerLevel: 0,
    possibleDiscoveries: [],
  };

  console.log(`🗺️ 새 위치 발견: "${locationName}" (${locationId})`);

  return {
    ...worldState,
    locations: [...worldState.locations, newLocation],
  };
};

/**
 * v1.2: 여러 위치를 한 번에 추가
 */
export const addDiscoveredLocations = (
  worldState: WorldState,
  locations: Array<{ name: string; description?: string; icon?: WorldLocation['icon'] }>
): WorldState => {
  let newWorldState = worldState;

  for (const loc of locations) {
    newWorldState = addDiscoveredLocation(newWorldState, loc.name, loc.description, loc.icon);
  }

  return newWorldState;
};

// =============================================================================
// 발견물 관리
// =============================================================================

/**
 * 위치에서 발견 가능한 아이템 반환
 */
export const getDiscoverableItems = (
  worldState: WorldState,
  locationId: string,
  saveState: SaveState
): ConcreteDiscovery[] => {
  const location = worldState.locations.find((l) => l.locationId === locationId);
  if (!location) return [];

  const flags = saveState.context.flags || {};
  const stats = saveState.context.scenarioStats || {};

  return worldState.discoveries.filter((disc) => {
    // 해당 위치의 발견물인지 확인
    if (disc.locationId !== locationId) return false;

    // 이미 발견했고 1회성이면 제외
    if (disc.discovered && disc.oneTimeOnly) return false;

    // 발견 조건 확인
    if (disc.discoveryCondition) {
      if (disc.discoveryCondition.requiredFlag && !flags[disc.discoveryCondition.requiredFlag]) {
        return false;
      }
      if (disc.discoveryCondition.requiredStat) {
        const { statId, minValue } = disc.discoveryCondition.requiredStat;
        if ((stats[statId] || 0) < minValue) return false;
      }
      if (disc.discoveryCondition.requiredItem) {
        if (!worldState.inventory.includes(disc.discoveryCondition.requiredItem)) {
          return false;
        }
      }
    }

    return true;
  });
};

/**
 * 발견물을 발견 상태로 변경하고 효과 적용
 * @internal 내부에서만 사용됨
 */
const discoverItem = (
  worldState: WorldState,
  discoveryId: string,
  currentDay: number
): { worldState: WorldState; discovery: ConcreteDiscovery | null } => {
  const discovery = worldState.discoveries.find((d) => d.discoveryId === discoveryId);
  if (!discovery) {
    return { worldState, discovery: null };
  }

  let newWorldState = {
    ...worldState,
    discoveries: worldState.discoveries.map((d) =>
      d.discoveryId === discoveryId
        ? { ...d, discovered: true, discoveredOnDay: currentDay }
        : d
    ),
  };

  // 아이템이면 인벤토리에 추가
  if (discovery.type === 'item' || discovery.type === 'equipment') {
    newWorldState = {
      ...newWorldState,
      inventory: [...newWorldState.inventory, discoveryId],
    };
  }

  // 문서/정보면 문서 목록에 추가
  if (discovery.type === 'document' || discovery.type === 'clue') {
    newWorldState = {
      ...newWorldState,
      documents: [...newWorldState.documents, discoveryId],
    };
  }

  // 새 위치 개방 효과
  if (discovery.effects?.newLocationsUnlocked) {
    for (const locId of discovery.effects.newLocationsUnlocked) {
      newWorldState = updateLocationStatus(newWorldState, locId, 'available');
    }
  }

  // 위치 파괴 효과
  if (discovery.effects?.locationsDestroyed) {
    for (const locId of discovery.effects.locationsDestroyed) {
      newWorldState = updateLocationStatus(newWorldState, locId, 'destroyed', '파괴됨');
    }
  }

  // 위치 차단 효과
  if (discovery.effects?.locationsBlocked) {
    for (const locId of discovery.effects.locationsBlocked) {
      newWorldState = updateLocationStatus(newWorldState, locId, 'blocked', '차단됨');
    }
  }

  return { worldState: newWorldState, discovery };
};

// =============================================================================
// 이벤트 관리
// =============================================================================

/**
 * 이벤트 트리거 조건 확인
 * @internal 내부에서만 사용됨
 */
const checkEventTrigger = (
  event: WorldEvent,
  saveState: SaveState,
  exploredLocationId?: string
): boolean => {
  const currentDay = saveState.context.currentDay || 1;
  const flags = saveState.context.flags || {};
  const stats = saveState.context.scenarioStats || {};

  const { trigger } = event;

  // 이미 트리거된 1회성 이벤트는 무시
  if (event.triggered && event.oneTime) {
    return false;
  }

  // Day 조건
  if (trigger.day && currentDay < trigger.day) {
    return false;
  }

  // 플래그 조건
  if (trigger.flag && !flags[trigger.flag]) {
    return false;
  }

  // 스탯 조건
  if (trigger.stat) {
    const { statId, comparison, value } = trigger.stat;
    const currentValue = stats[statId] || 0;
    switch (comparison) {
      case 'gte':
        if (currentValue < value) return false;
        break;
      case 'lte':
        if (currentValue > value) return false;
        break;
      case 'eq':
        if (currentValue !== value) return false;
        break;
    }
  }

  // 탐색 조건
  if (trigger.exploration && exploredLocationId !== trigger.exploration) {
    return false;
  }

  return true;
};

/**
 * 모든 대기 이벤트 확인 및 트리거
 * @internal 내부에서만 사용됨
 */
const processEvents = (
  worldState: WorldState,
  saveState: SaveState,
  exploredLocationId?: string
): WorldStateUpdateResult => {
  const currentDay = saveState.context.currentDay || 1;
  const triggeredEvents: WorldEvent[] = [];
  const changedLocations: WorldStateUpdateResult['changedLocations'] = [];
  const notifications: string[] = [];
  let newWorldState = { ...worldState };

  for (const event of newWorldState.pendingEvents) {
    if (checkEventTrigger(event, saveState, exploredLocationId)) {
      // 이벤트 발동
      const triggeredEvent: WorldEvent = {
        ...event,
        triggered: true,
        triggeredOnDay: currentDay,
      };
      triggeredEvents.push(triggeredEvent);

      // 위치 변경 효과 적용
      if (event.effects.locationChanges) {
        for (const change of event.effects.locationChanges) {
          const prevLoc = newWorldState.locations.find((l) => l.locationId === change.locationId);
          if (prevLoc) {
            changedLocations.push({
              locationId: change.locationId,
              previousStatus: prevLoc.status,
              newStatus: change.newStatus,
              reason: change.reason,
            });
            newWorldState = updateLocationStatus(
              newWorldState,
              change.locationId,
              change.newStatus,
              change.reason
            );
          }
        }
      }

      // 알림 추가
      notifications.push(event.description);
    }
  }

  // 트리거된 이벤트를 triggeredEvents로 이동
  if (triggeredEvents.length > 0) {
    const triggeredEventIds = new Set(triggeredEvents.map((e) => e.eventId));
    newWorldState = {
      ...newWorldState,
      pendingEvents: newWorldState.pendingEvents.filter(
        (e) => !triggeredEventIds.has(e.eventId) || !e.oneTime
      ),
      triggeredEvents: [...newWorldState.triggeredEvents, ...triggeredEvents],
    };
  }

  return {
    worldState: newWorldState,
    triggeredEvents,
    newDiscoveries: [],
    changedLocations,
    notifications,
  };
};

// =============================================================================
// 탐색 결과 처리
// =============================================================================

/**
 * 탐색 후 월드 상태 업데이트
 */
export const processExploration = (
  worldState: WorldState,
  locationId: string,
  saveState: SaveState
): WorldStateUpdateResult => {
  const currentDay = saveState.context.currentDay || 1;
  const actionIndex = (worldState.lastUpdated.actionIndex || 0) + 1;

  let newWorldState = { ...worldState };
  const newDiscoveries: ConcreteDiscovery[] = [];
  const notifications: string[] = [];

  // 위치 마지막 탐색일 업데이트
  newWorldState = {
    ...newWorldState,
    locations: newWorldState.locations.map((loc) =>
      loc.locationId === locationId
        ? { ...loc, lastExploredDay: currentDay }
        : loc
    ),
    lastUpdated: { day: currentDay, actionIndex },
  };

  // 발견 가능한 아이템 확인
  const discoverableItems = getDiscoverableItems(newWorldState, locationId, saveState);

  // 중요도에 따라 발견 확률 결정
  for (const item of discoverableItems) {
    let discoveryChance = 0;
    switch (item.importance) {
      case 'trivial':
        discoveryChance = 0.8; // 80%
        break;
      case 'minor':
        discoveryChance = 0.6; // 60%
        break;
      case 'major':
        discoveryChance = 0.4; // 40%
        break;
      case 'critical':
        discoveryChance = 0.3; // 30%
        break;
    }

    if (Math.random() < discoveryChance) {
      const result = discoverItem(newWorldState, item.discoveryId, currentDay);
      newWorldState = result.worldState;
      if (result.discovery) {
        newDiscoveries.push(result.discovery);
        notifications.push(`발견: ${result.discovery.name}`);
      }
    }
  }

  // 이벤트 처리
  const eventResult = processEvents(newWorldState, saveState, locationId);
  newWorldState = eventResult.worldState;
  notifications.push(...eventResult.notifications);

  return {
    worldState: newWorldState,
    triggeredEvents: eventResult.triggeredEvents,
    newDiscoveries,
    changedLocations: eventResult.changedLocations,
    notifications,
  };
};

// =============================================================================
// Day 전환 처리
// =============================================================================

/**
 * 새로운 Day로 전환 시 월드 상태 업데이트
 */
export const advanceWorldStateToNewDay = (
  worldState: WorldState,
  newDay: number,
  saveState: SaveState
): WorldStateUpdateResult => {
  let newWorldState = {
    ...worldState,
    lastUpdated: { day: newDay, actionIndex: 0 },
  };

  // Day 기반 잠금 해제 확인
  newWorldState = {
    ...newWorldState,
    locations: newWorldState.locations.map((loc) => {
      if (
        loc.status === 'locked' &&
        loc.unlockCondition?.requiredDay &&
        newDay >= loc.unlockCondition.requiredDay
      ) {
        return { ...loc, status: 'available' as LocationStatus };
      }
      return loc;
    }),
  };

  // 이벤트 처리
  return processEvents(newWorldState, saveState);
};

// =============================================================================
// 유틸리티
// =============================================================================

/**
 * 위치 정보를 ExplorationPanel에서 사용할 형식으로 변환
 */
export const getLocationsForUI = (
  worldState: WorldState,
  saveState: SaveState
): {
  locationId: string;
  name: string;
  description: string;
  icon: WorldLocation['icon'];
  available: boolean;
  statusReason?: string;
  wasDeactivated?: boolean; // 활성화됐다가 비활성화된 경우
}[] => {
  const results: {
    locationId: string;
    name: string;
    description: string;
    icon: WorldLocation['icon'];
    available: boolean;
    statusReason?: string;
    wasDeactivated?: boolean;
  }[] = [];

  for (const loc of worldState.locations) {
    const { accessible, reason } = isLocationAccessible(loc, worldState, saveState);

    // 노출 규칙:
    // 1. available인 경우 - 항상 노출
    // 2. destroyed/blocked인 경우 - 사유와 함께 노출 (활성화됐다가 비활성화)
    // 3. hidden, locked, explored, cooldown - 노출 안함

    if (accessible) {
      // 접근 가능 - 노출
      results.push({
        locationId: loc.locationId,
        name: loc.name,
        description: loc.currentDescription,
        icon: loc.icon,
        available: true,
      });
    } else if (loc.status === 'destroyed' || loc.status === 'blocked') {
      // 파괴/차단됨 - 사유와 함께 노출
      results.push({
        locationId: loc.locationId,
        name: loc.name,
        description: loc.currentDescription,
        icon: loc.icon,
        available: false,
        statusReason: reason,
        wasDeactivated: true,
      });
    }
    // hidden, locked, explored, cooldown은 노출 안함
  }

  return results;
};

/**
 * 월드 상태 요약 (프롬프트용)
 * v1.2: 알려진 장소 목록 추가 (중복 방지용)
 */
export const summarizeWorldState = (worldState: WorldState): string => {
  // v1.2: 이미 알려진 장소 목록 (중복 생성 방지)
  const knownLocations = worldState.locations
    .filter((l) => l.status === 'available' || l.status === 'explored')
    .map((l) => l.name)
    .join(', ');

  const destroyedLocations = worldState.locations
    .filter((l) => l.status === 'destroyed')
    .map((l) => `${l.name} (${l.statusReason || '파괴됨'})`)
    .join(', ');

  const blockedLocations = worldState.locations
    .filter((l) => l.status === 'blocked')
    .map((l) => `${l.name} (${l.statusReason || '차단됨'})`)
    .join(', ');

  const inventory = worldState.inventory
    .map((id) => worldState.discoveries.find((d) => d.discoveryId === id)?.name)
    .filter(Boolean)
    .join(', ');

  const parts: string[] = [];

  // v1.2: 알려진 장소 먼저 추가 (AI가 중복 생성하지 않도록)
  if (knownLocations) {
    parts.push(`알려진 장소: ${knownLocations}`);
  }
  if (destroyedLocations) {
    parts.push(`파괴된 장소: ${destroyedLocations}`);
  }
  if (blockedLocations) {
    parts.push(`차단된 장소: ${blockedLocations}`);
  }
  if (inventory) {
    parts.push(`보유 아이템: ${inventory}`);
  }

  return parts.length > 0 ? parts.join('\n') : '특이사항 없음';
};
