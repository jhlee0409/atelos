/**
 * 플레이 테스트 로거
 *
 * 사용법:
 * 1. 개발 서버 실행: pnpm dev
 * 2. 브라우저 콘솔에서:
 *    - window.__ATELOS__.getReport() : 전체 리포트 출력
 *    - window.__ATELOS__.export()    : 복사용 JSON 문자열
 *    - window.__ATELOS__.verify()    : 검증 체크리스트
 *    - window.__ATELOS__.clear()     : 로그 초기화
 *
 * 복사하기:
 *    copy(window.__ATELOS__.export())
 */

import type { SaveState, ScenarioData } from '@/types';

// ============================================================
// Types
// ============================================================

export interface StageSnapshot {
  timestamp: string;
  stage: string;
  action?: string;
  data: Record<string, unknown>;
}

export interface VerificationItem {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warn' | 'unchecked';
  details?: string;
}

export interface PlayTestReport {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  startTime: string;
  endTime?: string;
  snapshots: StageSnapshot[];
  verifications: VerificationItem[];
  summary: {
    totalActions: number;
    currentDay: number;
    endingTriggered?: string;
    errors: string[];
  };
}

// ============================================================
// Logger Class
// ============================================================

class PlayTestLogger {
  private report: PlayTestReport;
  private enabled: boolean = false;

  constructor() {
    this.report = this.createEmptyReport();
  }

  private createEmptyReport(): PlayTestReport {
    return {
      sessionId: `session_${Date.now()}`,
      scenarioId: '',
      scenarioTitle: '',
      startTime: new Date().toISOString(),
      snapshots: [],
      verifications: this.createInitialVerifications(),
      summary: {
        totalActions: 0,
        currentDay: 1,
        errors: [],
      },
    };
  }

  private createInitialVerifications(): VerificationItem[] {
    return [
      // Stage 1: 초기화
      { category: 'Stage 1', item: 'protagonistKnowledge.metCharacters 초기화', status: 'unchecked' },
      { category: 'Stage 1', item: 'characterArcs.trustLevel이 initialRelationships 반영', status: 'unchecked' },
      { category: 'Stage 1', item: 'worldState.locations 초기화', status: 'unchecked' },
      { category: 'Stage 1', item: 'actionContext.currentLocation 설정', status: 'unchecked' },

      // Stage 2: 오프닝
      { category: 'Stage 2', item: '오프닝 서사 chatHistory 추가', status: 'unchecked' },
      { category: 'Stage 2', item: 'metCharacters 첫 만남 캐릭터 추가', status: 'unchecked' },
      { category: 'Stage 2', item: 'characterArcs 첫 만남 moment 추가', status: 'unchecked' },
      { category: 'Stage 2', item: 'actionContext.currentSituation 업데이트', status: 'unchecked' },

      // Stage 3: 메인 루프
      { category: 'Stage 3', item: 'handlePlayerChoice 정상 동작', status: 'unchecked' },
      { category: 'Stage 3', item: 'handleDialogueSelect metCharacters 자동 추가', status: 'unchecked' },
      { category: 'Stage 3', item: 'handleExplore informationPieces 추가', status: 'unchecked' },
      { category: 'Stage 3', item: 'keyDecisions 기록', status: 'unchecked' },
      { category: 'Stage 3', item: '시너지 보너스 적용', status: 'unchecked' },
      { category: 'Stage 3', item: 'AP 소모 정상 동작', status: 'unchecked' },

      // Stage 4: AI 응답 처리
      { category: 'Stage 4', item: '스탯 변화 적용 (증폭 시스템)', status: 'unchecked' },
      { category: 'Stage 4', item: 'urgentMatters 자동 업데이트', status: 'unchecked' },
      { category: 'Stage 4', item: 'informationPieces 중복 제거', status: 'unchecked' },
      { category: 'Stage 4', item: 'NPC 관계 힌트 감지 (hidden→hinted)', status: 'unchecked' },
      { category: 'Stage 4', item: 'NPC 관계 공개 (hinted→revealed)', status: 'unchecked' },

      // Stage 5: 엔딩
      { category: 'Stage 5', item: 'Dynamic Ending 트리거', status: 'unchecked' },
      { category: 'Stage 5', item: 'characterArcs 엔딩 프롬프트 전달', status: 'unchecked' },
      { category: 'Stage 5', item: 'discoveredInfo 엔딩 프롬프트 전달', status: 'unchecked' },

      // 기타
      { category: '기타', item: '레거시 시나리오 (storyOpening 없음) 호환', status: 'unchecked' },
      { category: '기타', item: 'AI 응답 언어 검증 (한국어)', status: 'unchecked' },
    ];
  }

  // ============================================================
  // Public API
  // ============================================================

  enable(): void {
    this.enabled = true;
    console.log('🎮 [PlayTestLogger] 활성화됨');
  }

  disable(): void {
    this.enabled = false;
    console.log('🎮 [PlayTestLogger] 비활성화됨');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  clear(): void {
    this.report = this.createEmptyReport();
    console.log('🎮 [PlayTestLogger] 로그 초기화됨');
  }

  // ============================================================
  // Stage Snapshots
  // ============================================================

  logStage1(scenario: ScenarioData, saveState: SaveState): void {
    if (!this.enabled) return;

    this.report.scenarioId = scenario.scenarioId;
    this.report.scenarioTitle = scenario.title;

    const snapshot: StageSnapshot = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 1: 게임 초기화',
      data: {
        protagonistKnowledge: {
          metCharacters: saveState.context.protagonistKnowledge?.metCharacters || [],
          hintedRelationships: saveState.context.protagonistKnowledge?.hintedRelationships || [],
          discoveredRelationships: saveState.context.protagonistKnowledge?.discoveredRelationships || [],
          informationPiecesCount: saveState.context.protagonistKnowledge?.informationPieces?.length || 0,
        },
        characterArcs: saveState.characterArcs?.map((arc) => ({
          name: arc.characterName,
          trustLevel: arc.trustLevel,
          mood: arc.currentMood,
          momentsCount: arc.moments?.length || 0,
        })),
        worldState: {
          locationsCount: saveState.context.worldState?.locations?.length || 0,
          locations: saveState.context.worldState?.locations?.map((l) => l.id) || [],
        },
        actionContext: {
          currentLocation: saveState.context.actionContext?.currentLocation,
          urgentMatters: saveState.context.actionContext?.urgentMatters || [],
        },
        stats: saveState.context.scenarioStats,
        actionPoints: saveState.context.actionPoints,
        maxActionPoints: saveState.context.maxActionPoints,
      },
    };

    this.report.snapshots.push(snapshot);
    this.autoVerifyStage1(saveState, scenario);

    console.log('📸 [Stage 1] 초기화 스냅샷:', snapshot.data);
  }

  logStage2(saveState: SaveState, openingCompleted: boolean): void {
    if (!this.enabled) return;

    const snapshot: StageSnapshot = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 2: 스토리 오프닝',
      data: {
        openingCompleted,
        chatHistoryLength: saveState.chatHistory?.length || 0,
        metCharacters: saveState.context.protagonistKnowledge?.metCharacters || [],
        characterArcs: saveState.characterArcs?.map((arc) => ({
          name: arc.characterName,
          momentsCount: arc.moments?.length || 0,
          latestMoment: arc.moments?.[arc.moments.length - 1],
        })),
        actionContext: {
          currentSituation: saveState.context.actionContext?.currentSituation?.substring(0, 100) + '...',
          todayActions: saveState.context.actionContext?.todayActions,
        },
      },
    };

    this.report.snapshots.push(snapshot);
    this.autoVerifyStage2(saveState, openingCompleted);

    console.log('📸 [Stage 2] 오프닝 스냅샷:', snapshot.data);
  }

  logStage3Action(
    actionType: 'choice' | 'dialogue' | 'exploration',
    details: Record<string, unknown>,
    saveState: SaveState
  ): void {
    if (!this.enabled) return;

    this.report.summary.totalActions++;

    const snapshot: StageSnapshot = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 3: 메인 게임 루프',
      action: actionType,
      data: {
        actionType,
        details,
        afterAction: {
          metCharacters: saveState.context.protagonistKnowledge?.metCharacters || [],
          informationPiecesCount: saveState.context.protagonistKnowledge?.informationPieces?.length || 0,
          keyDecisionsCount: saveState.keyDecisions?.length || 0,
          latestKeyDecision: saveState.keyDecisions?.[saveState.keyDecisions.length - 1],
          actionPoints: saveState.context.actionPoints,
          currentDay: saveState.context.currentDay,
        },
      },
    };

    this.report.snapshots.push(snapshot);
    this.report.summary.currentDay = saveState.context.currentDay;

    console.log(`📸 [Stage 3] ${actionType} 액션:`, snapshot.data);
  }

  logStage4AIResponse(
    aiResponse: Record<string, unknown>,
    beforeState: SaveState,
    afterState: SaveState
  ): void {
    if (!this.enabled) return;

    const statChanges: Record<string, { before: number; after: number; diff: number }> = {};
    for (const [key, value] of Object.entries(afterState.context.scenarioStats)) {
      const before = beforeState.context.scenarioStats[key] || 0;
      const after = value as number;
      if (before !== after) {
        statChanges[key] = { before, after, diff: after - before };
      }
    }

    const snapshot: StageSnapshot = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 4: AI 응답 처리',
      data: {
        aiResponse: {
          logLength: (aiResponse.log as string)?.length || 0,
          hasStatChanges: !!aiResponse.statChanges,
          hasRelationshipChanges: !!aiResponse.relationshipChanges,
          flagsAcquired: aiResponse.flagsAcquired,
        },
        statChanges,
        urgentMatters: afterState.context.actionContext?.urgentMatters || [],
        npcRelationshipStates: afterState.context.npcRelationshipStates,
        protagonistKnowledge: {
          hintedRelationships: afterState.context.protagonistKnowledge?.hintedRelationships || [],
          discoveredRelationships: afterState.context.protagonistKnowledge?.discoveredRelationships || [],
        },
      },
    };

    this.report.snapshots.push(snapshot);
    this.autoVerifyStage4(beforeState, afterState, aiResponse);

    console.log('📸 [Stage 4] AI 응답 처리:', snapshot.data);
  }

  logStage5Ending(endingType: string, endingData: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.report.summary.endingTriggered = endingType;
    this.report.endTime = new Date().toISOString();

    const snapshot: StageSnapshot = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 5: 엔딩 시스템',
      data: {
        endingType,
        endingData,
      },
    };

    this.report.snapshots.push(snapshot);
    this.updateVerification('Stage 5', 'Dynamic Ending 트리거', 'pass');

    console.log('📸 [Stage 5] 엔딩:', snapshot.data);
  }

  logError(stage: string, error: string): void {
    this.report.summary.errors.push(`[${stage}] ${error}`);
    console.error(`❌ [${stage}] ${error}`);
  }

  // ============================================================
  // Auto Verification
  // ============================================================

  private autoVerifyStage1(saveState: SaveState, scenario: ScenarioData): void {
    // metCharacters 초기화
    const metChars = saveState.context.protagonistKnowledge?.metCharacters || [];
    this.updateVerification(
      'Stage 1',
      'protagonistKnowledge.metCharacters 초기화',
      metChars.length > 0 ? 'pass' : 'warn',
      `${metChars.length}명: ${metChars.join(', ')}`
    );

    // trustLevel 검증
    const arcs = saveState.characterArcs || [];
    const hasNonZeroTrust = arcs.some((arc) => arc.trustLevel !== 0);
    const initialRels = scenario.initialRelationships?.filter(
      (rel) => rel.pair.includes('(플레이어)')
    );
    this.updateVerification(
      'Stage 1',
      'characterArcs.trustLevel이 initialRelationships 반영',
      hasNonZeroTrust || !initialRels?.length ? 'pass' : 'warn',
      arcs.map((a) => `${a.characterName}: ${a.trustLevel}`).join(', ')
    );

    // worldState.locations
    const locations = saveState.context.worldState?.locations || [];
    this.updateVerification(
      'Stage 1',
      'worldState.locations 초기화',
      locations.length > 0 ? 'pass' : 'fail',
      `${locations.length}개 위치`
    );

    // actionContext.currentLocation
    const currentLoc = saveState.context.actionContext?.currentLocation;
    this.updateVerification(
      'Stage 1',
      'actionContext.currentLocation 설정',
      currentLoc ? 'pass' : 'warn',
      currentLoc || '미설정'
    );
  }

  private autoVerifyStage2(saveState: SaveState, openingCompleted: boolean): void {
    if (!openingCompleted) return;

    // chatHistory
    const chatLen = saveState.chatHistory?.length || 0;
    this.updateVerification(
      'Stage 2',
      '오프닝 서사 chatHistory 추가',
      chatLen > 0 ? 'pass' : 'fail',
      `${chatLen}개 메시지`
    );

    // characterArcs moments
    const arcsWithMoments = saveState.characterArcs?.filter((a) => a.moments?.length > 0) || [];
    this.updateVerification(
      'Stage 2',
      'characterArcs 첫 만남 moment 추가',
      arcsWithMoments.length > 0 ? 'pass' : 'warn',
      `${arcsWithMoments.length}명에게 moment 추가`
    );

    // actionContext.currentSituation
    const situation = saveState.context.actionContext?.currentSituation;
    this.updateVerification(
      'Stage 2',
      'actionContext.currentSituation 업데이트',
      situation && situation.length > 50 ? 'pass' : 'warn',
      situation?.substring(0, 50) + '...'
    );
  }

  private autoVerifyStage4(
    beforeState: SaveState,
    afterState: SaveState,
    aiResponse: Record<string, unknown>
  ): void {
    // 스탯 변화
    if (aiResponse.statChanges) {
      this.updateVerification('Stage 4', '스탯 변화 적용 (증폭 시스템)', 'pass');
    }

    // urgentMatters
    const urgentMatters = afterState.context.actionContext?.urgentMatters || [];
    if (urgentMatters.length > 0) {
      this.updateVerification(
        'Stage 4',
        'urgentMatters 자동 업데이트',
        'pass',
        urgentMatters.join(', ')
      );
    }

    // NPC 관계 힌트
    const beforeHinted = beforeState.context.protagonistKnowledge?.hintedRelationships?.length || 0;
    const afterHinted = afterState.context.protagonistKnowledge?.hintedRelationships?.length || 0;
    if (afterHinted > beforeHinted) {
      this.updateVerification('Stage 4', 'NPC 관계 힌트 감지 (hidden→hinted)', 'pass');
    }

    // NPC 관계 공개
    const beforeRevealed = beforeState.context.protagonistKnowledge?.discoveredRelationships?.length || 0;
    const afterRevealed = afterState.context.protagonistKnowledge?.discoveredRelationships?.length || 0;
    if (afterRevealed > beforeRevealed) {
      this.updateVerification('Stage 4', 'NPC 관계 공개 (hinted→revealed)', 'pass');
    }
  }

  updateVerification(category: string, item: string, status: VerificationItem['status'], details?: string): void {
    const verification = this.report.verifications.find(
      (v) => v.category === category && v.item === item
    );
    if (verification) {
      verification.status = status;
      if (details) verification.details = details;
    }
  }

  // ============================================================
  // Output Methods
  // ============================================================

  getReport(): PlayTestReport {
    return this.report;
  }

  export(): string {
    return JSON.stringify(this.report, null, 2);
  }

  verify(): void {
    console.log('\n📋 ========== 검증 체크리스트 ==========\n');

    const categories = [...new Set(this.report.verifications.map((v) => v.category))];

    for (const category of categories) {
      console.log(`\n【${category}】`);
      const items = this.report.verifications.filter((v) => v.category === category);

      for (const item of items) {
        const icon =
          item.status === 'pass' ? '✅' :
          item.status === 'fail' ? '❌' :
          item.status === 'warn' ? '⚠️' : '⬜';

        console.log(`  ${icon} ${item.item}`);
        if (item.details) {
          console.log(`     └─ ${item.details}`);
        }
      }
    }

    // Summary
    const passed = this.report.verifications.filter((v) => v.status === 'pass').length;
    const failed = this.report.verifications.filter((v) => v.status === 'fail').length;
    const warned = this.report.verifications.filter((v) => v.status === 'warn').length;
    const unchecked = this.report.verifications.filter((v) => v.status === 'unchecked').length;

    console.log('\n📊 ========== 요약 ==========');
    console.log(`  ✅ 통과: ${passed}`);
    console.log(`  ❌ 실패: ${failed}`);
    console.log(`  ⚠️ 경고: ${warned}`);
    console.log(`  ⬜ 미확인: ${unchecked}`);
    console.log(`  📝 총 액션: ${this.report.summary.totalActions}`);
    console.log(`  📅 현재 Day: ${this.report.summary.currentDay}`);
    if (this.report.summary.endingTriggered) {
      console.log(`  🎉 엔딩: ${this.report.summary.endingTriggered}`);
    }
    if (this.report.summary.errors.length > 0) {
      console.log(`  ❌ 에러: ${this.report.summary.errors.length}개`);
      this.report.summary.errors.forEach((e) => console.log(`     - ${e}`));
    }
    console.log('\n');
  }

  printCopyableReport(): void {
    console.log('\n📋 ========== 복사용 리포트 ==========');
    console.log('아래를 복사하세요 (또는 copy(window.__ATELOS__.export()) 실행):\n');
    console.log('```json');
    console.log(this.export());
    console.log('```\n');
  }
}

// ============================================================
// Singleton & Global Registration
// ============================================================

const playTestLogger = new PlayTestLogger();

// 브라우저 환경에서 전역 객체로 등록
if (typeof window !== 'undefined') {
  (window as unknown as { __ATELOS__: PlayTestLogger }).__ATELOS__ = playTestLogger;

  // 개발 환경에서 자동 활성화
  if (process.env.NODE_ENV === 'development') {
    playTestLogger.enable();
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🎮 ATELOS 플레이 테스트 로거 활성화                         ║
╠════════════════════════════════════════════════════════════╣
║  사용법:                                                    ║
║  • window.__ATELOS__.verify()    : 검증 체크리스트 출력      ║
║  • window.__ATELOS__.getReport() : 전체 리포트 객체          ║
║  • window.__ATELOS__.export()    : JSON 문자열 (복사용)      ║
║  • copy(window.__ATELOS__.export()) : 클립보드에 복사        ║
║  • window.__ATELOS__.clear()     : 로그 초기화               ║
╚════════════════════════════════════════════════════════════╝
    `);
  }
}

export default playTestLogger;
export { PlayTestLogger };
