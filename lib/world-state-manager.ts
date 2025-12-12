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
 * 시나리오에 맞는 기본 위치 생성 (폴백용)
 */
const createDefaultLocations = (scenario: ScenarioData): WorldLocation[] => {
  // 시나리오에 커스텀 위치가 정의되어 있으면 사용
  if (scenario.locations && scenario.locations.length > 0) {
    console.log(`🗺️ 시나리오 정의 위치 ${scenario.locations.length}개 사용`);
    return createLocationsFromScenario(scenario.locations);
  }

  // 폴백: 장르 기반 기본 위치 생성
  console.log('🗺️ 장르 기반 기본 위치 생성');
  const genre = scenario.genre || [];
  const isSpaceScenario = genre.includes('SF') || genre.includes('우주');
  const isMilitaryScenario = genre.includes('밀리터리') || genre.includes('군사');
  const isHorrorScenario = genre.includes('호러') || genre.includes('공포');

  const baseLocations: WorldLocation[] = [
    {
      locationId: 'storage',
      name: '창고',
      baseDescription: '물자가 보관된 창고.',
      currentDescription: '물자가 보관된 창고. 유용한 자원을 찾을 수 있을지도.',
      icon: 'warehouse',
      status: 'available',
      explorationCooldown: 1,
      dangerLevel: 0,
      possibleDiscoveries: ['disc_storage_supplies', 'disc_storage_map'],
    },
    {
      locationId: 'entrance',
      name: '입구',
      baseDescription: '외부 상황을 살펴볼 수 있는 곳.',
      currentDescription: '외부 상황을 살펴볼 수 있는 곳.',
      icon: 'entrance',
      status: 'available',
      explorationCooldown: 0,
      dangerLevel: 1,
      possibleDiscoveries: ['disc_entrance_intel'],
    },
    {
      locationId: 'medical',
      name: '의무실',
      baseDescription: '부상자와 의료 물자가 있는 곳.',
      currentDescription: '부상자와 의료 물자가 있는 곳.',
      icon: 'medical',
      status: 'available',
      explorationCooldown: 1,
      dangerLevel: 0,
      possibleDiscoveries: ['disc_medical_kit', 'disc_medical_records'],
    },
    {
      locationId: 'roof',
      name: '옥상',
      baseDescription: '전체 상황을 조망할 수 있지만 위험할 수 있다.',
      currentDescription: '전체 상황을 조망할 수 있지만 위험할 수 있다.',
      icon: 'roof',
      status: 'locked',
      unlockCondition: { requiredDay: 3 },
      explorationCooldown: 1,
      dangerLevel: 2,
      possibleDiscoveries: ['disc_roof_signal', 'disc_roof_threat'],
    },
    {
      locationId: 'basement',
      name: '지하',
      baseDescription: '아직 탐색하지 않은 지하 공간.',
      currentDescription: '아직 탐색하지 않은 어두운 지하 공간. 뭔가 숨겨져 있을지도.',
      icon: 'basement',
      status: 'hidden',
      unlockCondition: { requiredDay: 5 },
      explorationCooldown: 2,
      dangerLevel: 3,
      possibleDiscoveries: ['disc_basement_cache', 'disc_basement_secret'],
    },
  ];

  // 장르별 추가 위치
  if (isSpaceScenario) {
    baseLocations.push({
      locationId: 'quarters',
      name: '승무원 숙소',
      baseDescription: '개인 물품이나 단서를 찾을 수 있는 숙소 구역.',
      currentDescription: '개인 물품이나 단서를 찾을 수 있는 숙소 구역.',
      icon: 'quarters',
      status: 'locked',
      unlockCondition: { requiredDay: 2 },
      explorationCooldown: 1,
      dangerLevel: 0,
      possibleDiscoveries: ['disc_quarters_diary', 'disc_quarters_keycard'],
    });
  }

  if (isMilitaryScenario) {
    baseLocations.push({
      locationId: 'armory',
      name: '무기고',
      baseDescription: '무기와 장비가 보관된 곳.',
      currentDescription: '무기와 장비가 보관된 곳. 접근이 제한되어 있다.',
      icon: 'hidden',
      status: 'locked',
      unlockCondition: { requiredFlag: 'FLAG_ARMORY_ACCESS' },
      explorationCooldown: 2,
      dangerLevel: 1,
      possibleDiscoveries: ['disc_armory_weapon', 'disc_armory_intel'],
    });
  }

  if (isHorrorScenario) {
    baseLocations.push({
      locationId: 'dark_corridor',
      name: '어두운 복도',
      baseDescription: '불길한 기운이 감도는 복도.',
      currentDescription: '불길한 기운이 감도는 복도. 무언가가 숨어있는 것 같다.',
      icon: 'corridor',
      status: 'available',
      explorationCooldown: 0,
      dangerLevel: 3,
      possibleDiscoveries: ['disc_corridor_clue', 'disc_corridor_danger'],
    });
  }

  return baseLocations;
};

/**
 * 시나리오에 맞는 기본 발견물 생성
 */
const createDefaultDiscoveries = (scenario: ScenarioData): ConcreteDiscovery[] => {
  const discoveries: ConcreteDiscovery[] = [
    // 창고 발견물
    {
      discoveryId: 'disc_storage_supplies',
      type: 'resource',
      name: '비상 보급품 상자',
      description: '통조림, 물, 기본 의료품이 담긴 상자',
      locationId: 'storage',
      effects: {
        statChanges: { survivalFoundation: 5 },
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'minor',
    },
    {
      discoveryId: 'disc_storage_map',
      type: 'document',
      name: '건물 도면',
      description: '이 건물의 구조가 표시된 도면. 지하로 가는 통로가 표시되어 있다.',
      locationId: 'storage',
      effects: {
        newLocationsUnlocked: ['basement'],
        flagsAcquired: ['FLAG_BASEMENT_DISCOVERED'],
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'major',
    },
    // 입구 발견물
    {
      discoveryId: 'disc_entrance_intel',
      type: 'clue',
      name: '외부 상황 정보',
      description: '멀리서 연기가 피어오르고 간헐적으로 폭발음이 들린다.',
      locationId: 'entrance',
      effects: {},
      discovered: false,
      oneTimeOnly: false,
      importance: 'trivial',
    },
    // 의무실 발견물
    {
      discoveryId: 'disc_medical_kit',
      type: 'item',
      name: '의료 키트',
      description: '붕대, 소독약, 진통제가 들어있는 응급 처치 키트',
      locationId: 'medical',
      effects: {
        statChanges: { survivalFoundation: 3 },
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'minor',
    },
    {
      discoveryId: 'disc_medical_records',
      type: 'document',
      name: '환자 기록',
      description: '최근 입원 환자들의 기록. 특이한 증상들이 기록되어 있다.',
      locationId: 'medical',
      effects: {
        flagsAcquired: ['FLAG_MEDICAL_INFO'],
      },
      discoveryCondition: {
        requiredFlag: 'FLAG_TRUST_MEDICAL_STAFF',
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'major',
    },
    // 옥상 발견물
    {
      discoveryId: 'disc_roof_signal',
      type: 'clue',
      name: '구조 신호 발견',
      description: '멀리서 빛 신호가 깜빡인다. 누군가 살아있다.',
      locationId: 'roof',
      effects: {
        newLocationsUnlocked: ['signal_source'],
        flagsAcquired: ['FLAG_SURVIVOR_SIGNAL'],
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'major',
    },
    {
      discoveryId: 'disc_roof_threat',
      type: 'clue',
      name: '위협 세력 발견',
      description: '동쪽에서 무장 집단이 이동 중인 것이 보인다.',
      locationId: 'roof',
      effects: {
        statChanges: { cityChaos: 5 },
        flagsAcquired: ['FLAG_THREAT_DETECTED'],
      },
      discoveryCondition: {
        requiredStat: { statId: 'cityChaos', minValue: 50 },
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'major',
    },
    // 지하 발견물
    {
      discoveryId: 'disc_basement_cache',
      type: 'resource',
      name: '비밀 물자 저장고',
      description: '누군가 숨겨둔 대량의 물자가 발견되었다.',
      locationId: 'basement',
      effects: {
        statChanges: { survivalFoundation: 10 },
        flagsAcquired: ['FLAG_SECRET_CACHE'],
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'critical',
    },
    {
      discoveryId: 'disc_basement_secret',
      type: 'document',
      name: '비밀 문서',
      description: '이 사태의 원인에 대한 단서가 담긴 문서.',
      locationId: 'basement',
      effects: {
        flagsAcquired: ['FLAG_TRUTH_REVEALED'],
      },
      discoveryCondition: {
        requiredItem: 'disc_storage_map',
      },
      discovered: false,
      oneTimeOnly: true,
      importance: 'critical',
    },
  ];

  return discoveries;
};

/**
 * 초기 월드 상태 생성
 */
export const createInitialWorldState = (
  scenario: ScenarioData,
  currentDay: number = 1
): WorldState => {
  const locations = createDefaultLocations(scenario);
  const discoveries = createDefaultDiscoveries(scenario);

  // 기본 관계 생성 (캐릭터-위치)
  const relations: ObjectRelation[] = scenario.characters.map((char, index) => ({
    relationId: `rel_char_loc_${index}`,
    type: 'character-location' as const,
    subject: { type: 'character' as const, id: char.characterName },
    object: { type: 'location' as const, id: 'entrance' }, // 기본 위치
    description: `${char.characterName}이(가) 입구 근처에 있음`,
    strength: 50,
    active: true,
  }));

  // 기본 이벤트 생성
  const pendingEvents: WorldEvent[] = [
    {
      eventId: 'event_medical_collapse',
      type: 'location_destroyed',
      description: '의무실이 폭발로 인해 무너졌다',
      trigger: {
        stat: { statId: 'cityChaos', comparison: 'gte', value: 80 },
      },
      effects: {
        locationChanges: [
          { locationId: 'medical', newStatus: 'destroyed', reason: '폭발로 무너짐' },
        ],
      },
      triggered: false,
      oneTime: true,
    },
    {
      eventId: 'event_entrance_blocked',
      type: 'location_blocked',
      description: '입구가 적대 세력에 의해 봉쇄되었다',
      trigger: {
        flag: 'FLAG_THREAT_DETECTED',
        day: 4,
      },
      effects: {
        locationChanges: [
          { locationId: 'entrance', newStatus: 'blocked', reason: '적대 세력이 감시 중' },
        ],
      },
      triggered: false,
      oneTime: true,
    },
    {
      eventId: 'event_roof_unlock',
      type: 'location_unlocked',
      description: '옥상으로 가는 길이 열렸다',
      trigger: {
        day: 3,
      },
      effects: {
        locationChanges: [
          { locationId: 'roof', newStatus: 'available' },
        ],
      },
      triggered: false,
      oneTime: true,
    },
    {
      eventId: 'event_basement_reveal',
      type: 'location_unlocked',
      description: '지하로 가는 통로가 발견되었다',
      trigger: {
        flag: 'FLAG_BASEMENT_DISCOVERED',
      },
      effects: {
        locationChanges: [
          { locationId: 'basement', newStatus: 'available' },
        ],
      },
      triggered: false,
      oneTime: true,
    },
  ];

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
 */
export const isLocationAccessible = (
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
 * 접근 가능한 위치 목록 반환
 */
export const getAccessibleLocations = (
  worldState: WorldState,
  saveState: SaveState
): WorldLocation[] => {
  return worldState.locations.filter((loc) => {
    const { accessible } = isLocationAccessible(loc, worldState, saveState);
    return accessible;
  });
};

/**
 * 위치 상태 변경
 */
export const updateLocationStatus = (
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
 */
export const discoverItem = (
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
 */
export const checkEventTrigger = (
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
 */
export const processEvents = (
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
// 관계 관리
// =============================================================================

/**
 * 캐릭터-위치 관계 업데이트
 */
export const updateCharacterLocation = (
  worldState: WorldState,
  characterName: string,
  locationId: string
): WorldState => {
  return {
    ...worldState,
    relations: worldState.relations.map((rel) =>
      rel.type === 'character-location' && rel.subject.id === characterName
        ? {
            ...rel,
            object: { type: 'location' as const, id: locationId },
            description: `${characterName}이(가) ${locationId}에 있음`,
          }
        : rel
    ),
  };
};

/**
 * 특정 위치에 있는 캐릭터 목록
 */
export const getCharactersAtLocation = (
  worldState: WorldState,
  locationId: string
): string[] => {
  return worldState.relations
    .filter(
      (rel) =>
        rel.type === 'character-location' &&
        rel.object.id === locationId &&
        rel.active
    )
    .map((rel) => rel.subject.id);
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
 */
export const summarizeWorldState = (worldState: WorldState): string => {
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
