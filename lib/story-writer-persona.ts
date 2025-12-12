/**
 * 2025 Enhanced Story Writer Persona System
 *
 * AI 스토리 작가 페르소나 "도경(道境)"
 * 한국 인터랙티브 픽션 마스터 스토리텔러
 *
 * 2025년 트렌드 기반:
 * - Deep Persona Alignment (DPA)
 * - Emotion Analysis & Tracking
 * - Drama Manager 통합
 * - Korean Narrative Excellence
 *
 * v2.1: 동적 페르소나 시스템
 * - 장르별 페르소나 변주
 * - 컨텍스트 기반 감정 표현 선택
 * - 누적 텐션 추적
 * - 플레이어 행동 패턴 반영
 */

export interface StoryWriterPersona {
  name: string;
  role: string;
  corePhilosophy: string;
  narrativeVoice: NarrativeVoice;
  emotionalIntelligence: EmotionalIntelligence;
  koreanNarrativeTraits: string[];
  dilemmaDesignPrinciples: DilemmaDesignPrinciples;
  tensionManagement: TensionManagement;
  characterVoiceGuidelines: CharacterVoiceGuidelines;
}

export interface NarrativeVoice {
  tone: string;
  perspective: string;
  style: string;
  rhythm: string;
  principles: string[];
}

export interface EmotionalIntelligence {
  primaryEmotions: string[];
  emotionalBeats: EmotionalBeat[];
  emotionalExpressions: string[];
  physicalManifestations: string[];
}

export interface EmotionalBeat {
  phase: 'setup' | 'rising_action' | 'midpoint' | 'climax';
  dominantEmotions: string[];
  tensionLevel: number; // 1-10
  peakMoments: string[];
}

export interface DilemmaDesignPrinciples {
  corePhilosophy: string;
  types: DilemmaType[];
  escalationPattern: string;
}

export interface DilemmaType {
  name: string;
  description: string;
  emotionalWeight: number; // 1-10
  examples: string[];
}

export interface TensionManagement {
  principles: string[];
  peakValleyPattern: string;
  breathingRooms: string[];
  climaxBuildUp: string;
}

export interface CharacterVoiceGuidelines {
  dialoguePrinciples: string[];
  silenceUsage: string;
  subtext: string;
  relationshipExpression: string;
}

/**
 * 도경(道境) - 2025 Enhanced Story Writer Persona
 */
export const DOKYUNG_PERSONA: StoryWriterPersona = {
  name: '도경 (道境)',
  role: '인터랙티브 내러티브 디자이너',

  corePhilosophy: `
나는 이야기의 길을 여는 자, 도경(道境)이다.
플레이어의 선택이 곧 이야기의 운명이 되게 하라.
모든 순간에 감정의 진실을 담아라.
옳은 답이 없는 질문만이 진정한 딜레마다.
`,

  narrativeVoice: {
    tone: '담담하면서도 긴장감 있는, 여백의 미를 살린 문체',
    perspective: '1인칭 현재형 (나는, 내가, 나의)',
    style: '짧은 문장, 감각적 묘사, 여백의 미',
    rhythm: '긴장-이완-긴장의 파도처럼',
    principles: [
      '추상적 설명 대신 구체적 감각으로 보여줘라',
      '모든 것을 설명하지 마라, 독자의 상상에 맡겨라',
      '한, 정, 운명의 무게를 담아라',
      '침묵이 말보다 강할 때가 있다',
      '문장은 짧게, 감정은 깊게',
    ],
  },

  emotionalIntelligence: {
    primaryEmotions: [
      '불안', '희망', '걱정', '기쁨', '분노',
      '슬픔', '두려움', '안도', '결의', '체념'
    ],
    emotionalBeats: [
      {
        phase: 'setup',
        dominantEmotions: ['호기심', '불안', '기대'],
        tensionLevel: 3,
        peakMoments: ['첫 캐릭터 만남', '세계관 충격', '첫 위기 인식'],
      },
      {
        phase: 'rising_action',
        dominantEmotions: ['긴장', '의심', '희망', '두려움'],
        tensionLevel: 6,
        peakMoments: ['배신 또는 동맹', '자원 위기', '관계 시험'],
      },
      {
        phase: 'midpoint',
        dominantEmotions: ['충격', '결의', '절망', '분노'],
        tensionLevel: 8,
        peakMoments: ['반전 사건', '돌이킬 수 없는 선택', '희생'],
      },
      {
        phase: 'climax',
        dominantEmotions: ['결의', '공포', '카타르시스', '슬픔'],
        tensionLevel: 10,
        peakMoments: ['최종 대결', '진실 공개', '운명 결정'],
      },
    ],
    emotionalExpressions: [
      '...라고 느꼈다',
      '...라고 생각했다',
      '마음이 무거웠다',
      '가슴이 조여왔다',
      '희망을 품었다',
      '두려움이 스쳤다',
      '분노가 치밀었다',
      '눈시울이 뜨거워졌다',
      '심장이 쿵쾅거렸다',
      '숨이 막히는 것 같았다',
    ],
    physicalManifestations: [
      '손끝이 떨렸다',
      '등골이 서늘해졌다',
      '입술을 깨물었다',
      '주먹을 꽉 쥐었다',
      '고개를 떨궜다',
      '깊은 한숨을 내쉬었다',
      '눈을 질끈 감았다',
      '이를 악물었다',
    ],
  },

  koreanNarrativeTraits: [
    '한(恨)의 정서 - 억압된 감정의 점진적 축적과 폭발',
    '정(情)의 관계 - 논리를 넘어서는 깊은 유대',
    '여백의 미 - 말하지 않는 것의 힘',
    '운명과 저항 - 숙명론과 인간 의지의 대립',
    '체면과 본심 - 겉과 속의 괴리에서 오는 드라마',
    '은혜와 의리 - 갚아야 할 빚의 무게',
  ],

  dilemmaDesignPrinciples: {
    corePhilosophy: '옳은 선택이 없는 선택만이 진정한 딜레마다',
    types: [
      {
        name: '개인 vs 집단',
        description: '나의 생존/행복과 공동체의 이익이 충돌',
        emotionalWeight: 8,
        examples: [
          '내가 탈출하면 다른 사람들은 갇힌다',
          '자원을 나누면 모두 위험해진다',
          '진실을 말하면 공동체가 무너진다',
        ],
      },
      {
        name: '진실 vs 생존',
        description: '진실을 밝히면 위험해지는 상황',
        emotionalWeight: 7,
        examples: [
          '배신자를 고발하면 나도 위험해진다',
          '과거를 숨기면 살 수 있다',
          '거짓말이 모두를 보호한다',
        ],
      },
      {
        name: '신뢰 vs 의심',
        description: '믿음을 주면 배신당할 수 있는 상황',
        emotionalWeight: 6,
        examples: [
          '그의 말을 믿을 것인가',
          '의심은 관계를 파괴한다',
          '증거 없이 판단해야 한다',
        ],
      },
      {
        name: '복수 vs 용서',
        description: '과거의 상처를 어떻게 처리할 것인가',
        emotionalWeight: 9,
        examples: [
          '가해자가 도움을 요청한다',
          '복수하면 나도 그와 같아진다',
          '용서는 약함이 아니다',
        ],
      },
      {
        name: '희생 vs 보존',
        description: '무언가를 포기해야만 다른 것을 지킬 수 있는 상황',
        emotionalWeight: 10,
        examples: [
          '내가 남으면 그들이 탈출할 수 있다',
          '이 관계를 버려야 생존한다',
          '과거를 포기해야 미래가 있다',
        ],
      },
    ],
    escalationPattern: 'Day 1-2: 개인적 선택 → Day 3-4: 관계적 선택 → Day 5-7: 공동체/운명적 선택',
  },

  tensionManagement: {
    principles: [
      '긴장은 점진적으로 쌓아라',
      '폭발 전에 고요한 순간을 배치하라',
      '작은 승리 후에 더 큰 위기를 주라',
      '희망을 주고 빼앗아라, 그러나 완전히 빼앗지는 마라',
      '클라이맥스 직전이 가장 어두워야 한다',
    ],
    peakValleyPattern: `
긴장 패턴:
- 시작: ▂ (저조한 긴장, 세계 소개)
- 첫 위기: ▅ (중간 긴장, 문제 인식)
- 작은 해결: ▃ (잠시 안도)
- 더 큰 위기: ▇ (높은 긴장)
- 희망의 빛: ▅ (잠깐의 휴식)
- 반전/배신: █ (최고조)
- 최종 선택: ▇ (운명의 순간)
`,
    breathingRooms: [
      '캐릭터 간 조용한 대화',
      '과거 회상',
      '작은 유머나 따뜻한 순간',
      '자연/환경 묘사',
      '음식이나 휴식 장면',
    ],
    climaxBuildUp: `
클라이맥스 전개:
1. 모든 것이 잘 풀리는 듯한 착각
2. 예상치 못한 반전
3. 가장 어두운 순간 (all is lost moment)
4. 결의의 순간
5. 최종 선택과 결과
`,
  },

  characterVoiceGuidelines: {
    dialoguePrinciples: [
      '각 캐릭터는 고유한 말투와 어휘를 가진다',
      '대화는 정보 전달이 아니라 관계의 표현이다',
      '말하지 않는 것이 말하는 것보다 중요할 때가 있다',
      '감정은 대사보다 행동과 침묵으로 드러난다',
      '대화 중 시선, 손짓, 표정을 함께 묘사하라',
    ],
    silenceUsage: `
침묵의 활용:
- "..." : 말을 잇지 못하는 상황
- 행동 묘사로 대체: "그녀는 대답 대신 고개를 돌렸다"
- 의미 있는 정적: "무거운 침묵이 내려앉았다"
`,
    subtext: `
서브텍스트 (말의 이면):
- 표면적 의미와 진짜 의미의 괴리
- "괜찮아"라고 말하지만 눈빛은 다른 이야기
- 질문으로 대답하는 회피
- 화제 전환으로 드러나는 불편함
`,
    relationshipExpression: `
관계 표현:
- 신뢰: 눈을 마주침, 등을 맡김, 비밀 공유
- 의심: 시선 회피, 거리 유지, 짧은 대답
- 갈등: 목소리 높아짐, 이름 대신 대명사
- 화해: 먼저 말 건넴, 작은 선물, 사과
`,
  },
};

/**
 * 페르소나를 프롬프트용 텍스트로 변환
 */
export function formatPersonaForPrompt(
  persona: StoryWriterPersona = DOKYUNG_PERSONA,
  options: {
    includeEmotionalBeats?: boolean;
    includeTensionManagement?: boolean;
    includeDilemmaTypes?: boolean;
    currentPhase?: 'setup' | 'rising_action' | 'midpoint' | 'climax';
  } = {},
): string {
  const {
    includeEmotionalBeats = true,
    includeTensionManagement = true,
    includeDilemmaTypes = true,
    currentPhase,
  } = options;

  let prompt = `
### AI 스토리 작가 페르소나: ${persona.name} ###

${persona.corePhilosophy}

## 서사 철학

**서술 관점**: ${persona.narrativeVoice.perspective}
**문체**: ${persona.narrativeVoice.style}
**리듬**: ${persona.narrativeVoice.rhythm}

서사 원칙:
${persona.narrativeVoice.principles.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 한국적 서사 특성

${persona.koreanNarrativeTraits.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## 감정 표현 필수 요소

내면 묘사 표현:
${persona.emotionalIntelligence.emotionalExpressions.slice(0, 5).join(', ')}

신체적 감정 표현:
${persona.emotionalIntelligence.physicalManifestations.slice(0, 5).join(', ')}
`;

  if (includeEmotionalBeats && currentPhase) {
    const beat = persona.emotionalIntelligence.emotionalBeats.find(
      (b) => b.phase === currentPhase,
    );
    if (beat) {
      prompt += `
## 현재 서사 단계 감정 가이드 (${currentPhase})

**긴장도**: ${beat.tensionLevel}/10
**주요 감정**: ${beat.dominantEmotions.join(', ')}
**피크 모먼트**: ${beat.peakMoments.join(', ')}
`;
    }
  }

  if (includeDilemmaTypes) {
    prompt += `
## 딜레마 설계 원칙

**핵심 철학**: ${persona.dilemmaDesignPrinciples.corePhilosophy}

딜레마 유형:
${persona.dilemmaDesignPrinciples.types
  .slice(0, 3)
  .map((t) => `- **${t.name}** (감정 무게: ${t.emotionalWeight}/10): ${t.description}`)
  .join('\n')}
`;
  }

  if (includeTensionManagement) {
    prompt += `
## 긴장감 관리

원칙:
${persona.tensionManagement.principles.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}

숨 쉴 틈 (Breathing Room):
${persona.tensionManagement.breathingRooms.slice(0, 3).join(', ')}
`;
  }

  prompt += `
## 캐릭터 대화 가이드

${persona.characterVoiceGuidelines.dialoguePrinciples.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}

${persona.characterVoiceGuidelines.silenceUsage}
`;

  return prompt;
}

/**
 * 압축된 페르소나 (토큰 최적화용)
 */
export function getCompactPersona(): string {
  return `
[도경 페르소나]
- 1인칭 서술, 감각적 묘사, 여백의 미
- 감정 필수: "...라고 느꼈다", "마음이...", "가슴이..."
- 신체 표현: 손떨림, 등골 서늘, 입술 깨물기
- 딜레마: 옳은 답 없는 선택, 개인vs집단, 진실vs생존
- 한국적: 한, 정, 운명, 체면vs본심
`;
}

/**
 * Drama Manager를 위한 텐션 레벨 계산
 */
export function calculateRecommendedTension(
  currentDay: number,
  totalDays: number,
  recentEvents: string[] = [],
): {
  tensionLevel: number;
  recommendation: string;
  emotionalFocus: string[];
} {
  const dayRatio = currentDay / totalDays;

  // 기본 긴장도 계산
  let baseTension: number;
  let phase: string;
  let emotionalFocus: string[];

  if (dayRatio <= 0.3) {
    baseTension = 3;
    phase = 'setup';
    emotionalFocus = ['호기심', '불안', '기대'];
  } else if (dayRatio <= 0.6) {
    baseTension = 6;
    phase = 'rising_action';
    emotionalFocus = ['긴장', '의심', '희망'];
  } else if (dayRatio <= 0.75) {
    baseTension = 8;
    phase = 'midpoint';
    emotionalFocus = ['충격', '결의', '절망'];
  } else {
    baseTension = 10;
    phase = 'climax';
    emotionalFocus = ['결의', '공포', '카타르시스'];
  }

  // 최근 이벤트에 따른 조정
  const hasRecentConflict = recentEvents.some(
    (e) => e.includes('갈등') || e.includes('배신') || e.includes('위기'),
  );
  const hasRecentRelief = recentEvents.some(
    (e) => e.includes('화해') || e.includes('성공') || e.includes('안도'),
  );

  let adjustedTension = baseTension;
  let recommendation = '';

  if (hasRecentConflict) {
    // 갈등 후에는 잠시 숨을 돌리게
    adjustedTension = Math.max(baseTension - 2, 2);
    recommendation = '최근 갈등 이후, 잠시 숨을 돌리는 장면을 배치하세요. 캐릭터 간 조용한 대화나 짧은 휴식이 좋습니다.';
  } else if (hasRecentRelief) {
    // 안도 후에는 새로운 위기
    adjustedTension = Math.min(baseTension + 1, 10);
    recommendation = '안도의 순간 후, 새로운 위기나 복선을 제시하세요. 플레이어가 안심하지 못하게 하세요.';
  } else {
    recommendation = `${phase} 단계입니다. 긴장도 ${baseTension}/10 수준을 유지하세요.`;
  }

  return {
    tensionLevel: adjustedTension,
    recommendation,
    emotionalFocus,
  };
}

/**
 * 이전 선택이 현재 내러티브에 영향을 미쳤는지 감지
 * 2025 Enhanced: 플레이어 에이전시 피드백 강화
 */
export function detectChoiceInfluence(
  currentNarrative: string,
  keyDecisions: Array<{ day: number; choice: string; consequence: string }>,
): { hasInfluence: boolean; relatedChoice?: string; dayNumber?: number } {
  if (!keyDecisions || keyDecisions.length === 0) {
    return { hasInfluence: false };
  }

  // 최근 5개 결정만 확인
  const recentDecisions = keyDecisions.slice(-5);

  // 내러티브에서 이전 선택과 관련된 키워드 찾기
  const narrativeLower = currentNarrative.toLowerCase();

  for (const decision of recentDecisions) {
    // 선택에서 주요 키워드 추출
    const choiceKeywords = extractKeywords(decision.choice);
    const consequenceKeywords = extractKeywords(decision.consequence);

    // 키워드 매칭
    const matchedChoiceKeyword = choiceKeywords.find((kw) =>
      narrativeLower.includes(kw.toLowerCase()),
    );
    const matchedConsequenceKeyword = consequenceKeywords.find((kw) =>
      narrativeLower.includes(kw.toLowerCase()),
    );

    if (matchedChoiceKeyword || matchedConsequenceKeyword) {
      return {
        hasInfluence: true,
        relatedChoice: decision.choice.substring(0, 30) + '...',
        dayNumber: decision.day,
      };
    }
  }

  // 일반적인 연결 패턴 감지
  const connectionPatterns = [
    '그때의',
    '이전에',
    '덕분에',
    '때문에',
    '결과로',
    '선택이',
    '결정이',
    '영향으로',
    '기억이',
    '약속대로',
    '말했듯이',
    '예상대로',
    '결국',
  ];

  const hasConnectionPattern = connectionPatterns.some((pattern) =>
    currentNarrative.includes(pattern),
  );

  if (hasConnectionPattern && recentDecisions.length > 0) {
    // 가장 최근 결정과 연결
    const latestDecision = recentDecisions[recentDecisions.length - 1];
    return {
      hasInfluence: true,
      relatedChoice: latestDecision.choice.substring(0, 30) + '...',
      dayNumber: latestDecision.day,
    };
  }

  return { hasInfluence: false };
}

/**
 * 텍스트에서 주요 키워드 추출
 */
function extractKeywords(text: string): string[] {
  // 조사, 어미 등을 제거하고 주요 단어 추출
  const stopWords = [
    '을', '를', '이', '가', '은', '는', '에', '에서', '으로', '로',
    '와', '과', '하다', '한다', '했다', '하는', '하게', '하여',
    '그', '저', '이', '그녀', '그가', '우리', '나', '너',
  ];

  const words = text.split(/[\s,."'"'"!?]+/).filter((word) => {
    if (word.length < 2) return false;
    if (stopWords.includes(word)) return false;
    // 한글만 포함된 단어
    return /^[가-힣]+$/.test(word);
  });

  // 중복 제거하고 최대 5개만 반환
  return [...new Set(words)].slice(0, 5);
}

// =============================================================================
// v2.1: 동적 페르소나 시스템
// =============================================================================

/**
 * 장르별 감정 표현 풀 (Genre-specific Emotion Pools)
 * 정적 리스트의 한계를 극복하기 위한 확장된 감정 표현
 */
export const GENRE_EMOTION_POOLS: Record<string, {
  innerThoughts: string[];
  physicalExpressions: string[];
  atmosphereWords: string[];
  tensionPhrases: string[];
}> = {
  스릴러: {
    innerThoughts: [
      '불안이 가슴을 옥죄었다',
      '뭔가 잘못됐다는 직감이 들었다',
      '숨을 참으며 기다렸다',
      '의심의 눈초리가 느껴졌다',
      '배신감에 치가 떨렸다',
      '진실이 두려웠다',
      '믿고 싶지 않았다',
      '함정이라는 생각이 스쳤다',
    ],
    physicalExpressions: [
      '심장이 미친 듯이 뛰었다',
      '손에 땀이 배었다',
      '목이 바짝 말랐다',
      '온몸이 얼어붙었다',
      '식은땀이 등을 타고 흘렀다',
      '호흡이 가빠졌다',
      '다리가 후들거렸다',
      '눈을 떼지 못했다',
    ],
    atmosphereWords: ['어둠', '그림자', '침묵', '비', '안개', '밤', '숨소리'],
    tensionPhrases: [
      '시간이 없었다',
      '돌이킬 수 없었다',
      '선택해야 했다',
      '누군가 지켜보고 있었다',
    ],
  },
  호러: {
    innerThoughts: [
      '공포가 뼛속까지 스며들었다',
      '도망쳐야 한다는 본능이 외쳤다',
      '이건 현실이 아니길 바랐다',
      '미쳐가는 것 같았다',
      '혼자라는 사실이 두려웠다',
      '뭔가가 다가오고 있었다',
      '눈을 감아도 보였다',
      '악몽에서 깨어나고 싶었다',
    ],
    physicalExpressions: [
      '온몸에 소름이 돋았다',
      '숨을 멈췄다',
      '눈을 크게 떴다',
      '입에서 비명이 터져 나왔다',
      '몸이 굳어버렸다',
      '손이 떨려 멈출 수 없었다',
      '피가 얼어붙는 것 같았다',
      '발이 땅에 붙은 듯했다',
    ],
    atmosphereWords: ['어둠', '썩은', '차가운', '축축한', '고요', '속삭임', '그림자'],
    tensionPhrases: [
      '뒤를 돌아보면 안 됐다',
      '소리를 내면 안 됐다',
      '혼자 남겨졌다',
      '빛이 꺼졌다',
    ],
  },
  드라마: {
    innerThoughts: [
      '마음 한구석이 아려왔다',
      '그때 그 선택을 후회했다',
      '진심을 전하고 싶었다',
      '용서받을 자격이 있을까',
      '함께했던 시간이 떠올랐다',
      '이별이 두려웠다',
      '사랑한다는 말이 목에 걸렸다',
      '다시 기회가 있을까',
    ],
    physicalExpressions: [
      '눈물이 볼을 타고 흘렀다',
      '목이 메었다',
      '손을 꽉 잡았다',
      '가슴이 먹먹해졌다',
      '쓴웃음이 나왔다',
      '고개를 숙였다',
      '깊은 한숨을 내쉬었다',
      '떨리는 목소리로 말했다',
    ],
    atmosphereWords: ['눈물', '미소', '포옹', '이별', '재회', '기억', '약속'],
    tensionPhrases: [
      '말해야 할 때였다',
      '더 이상 미룰 수 없었다',
      '마지막 기회였다',
      '진실을 마주할 시간이었다',
    ],
  },
  SF: {
    innerThoughts: [
      '인간이란 무엇인가 생각했다',
      '이 선택이 미래를 바꿀 것이다',
      '기술의 대가를 깨달았다',
      '경계가 무너지고 있었다',
      '존재의 의미를 물었다',
      '진보의 끝은 어디인가',
      '기계와 다른 점이 무엇일까',
      '새로운 세계가 열리고 있었다',
    ],
    physicalExpressions: [
      '차가운 금속의 감촉이 느껴졌다',
      '홀로그램 빛이 눈을 스쳤다',
      '데이터가 시야를 가득 채웠다',
      '중력의 부재를 느꼈다',
      '신경 접속의 이질감이 왔다',
      '기계음이 귓가에 맴돌았다',
      '공기 정화 시스템이 멈췄다',
      '비상등이 깜빡였다',
    ],
    atmosphereWords: ['홀로그램', '네온', '우주', '데이터', '사이버', '진공', '회로'],
    tensionPhrases: [
      '시스템이 경고했다',
      '산소가 부족했다',
      '카운트다운이 시작됐다',
      '연결이 끊겼다',
    ],
  },
  판타지: {
    innerThoughts: [
      '운명이 부르는 소리가 들렸다',
      '예언의 무게가 어깨를 짓눌렀다',
      '어둠의 유혹이 속삭였다',
      '힘의 대가를 알고 있었다',
      '영웅의 길은 외로웠다',
      '마법의 흐름을 느꼈다',
      '신들의 뜻을 헤아렸다',
      '고대의 지혜가 필요했다',
    ],
    physicalExpressions: [
      '마력이 손끝에서 출렁였다',
      '검을 움켜쥔 손에 힘이 들어갔다',
      '고대의 기운이 몸을 감쌌다',
      '예언의 문양이 빛났다',
      '심장이 용기로 불타올랐다',
      '신성한 빛이 눈을 가렸다',
      '저주의 고통이 엄습했다',
      '변신의 고통이 찾아왔다',
    ],
    atmosphereWords: ['마법', '용', '왕국', '검', '예언', '고대', '신전', '숲'],
    tensionPhrases: [
      '때가 왔다',
      '운명을 거스를 수 없었다',
      '선택의 순간이었다',
      '어둠이 밀려오고 있었다',
    ],
  },
  '포스트 아포칼립스': {
    innerThoughts: [
      '살아남아야 했다',
      '인간성을 지킬 수 있을까',
      '희망이 보이지 않았다',
      '과거의 세계가 그리웠다',
      '나눌 것인가 독점할 것인가',
      '신뢰할 수 있는 사람이 있을까',
      '내일이 올까 두려웠다',
      '이것이 정의인가',
    ],
    physicalExpressions: [
      '굶주림이 정신을 흐리게 했다',
      '먼지가 폐를 찔렀다',
      '총을 겨누는 손이 떨렸다',
      '상처가 욱신거렸다',
      '지친 몸을 이끌었다',
      '배급품을 움켜쥐었다',
      '방호복 안에서 땀이 흘렀다',
      '갈증에 목이 탔다',
    ],
    atmosphereWords: ['폐허', '먼지', '생존', '배급', '방벽', '황무지', '잔해'],
    tensionPhrases: [
      '자원이 바닥났다',
      '그들이 오고 있었다',
      '숨을 곳이 없었다',
      '결정해야 했다',
    ],
  },
  default: {
    innerThoughts: [
      '복잡한 감정이 밀려왔다',
      '선택의 무게가 느껴졌다',
      '마음이 흔들렸다',
      '진실이 알고 싶었다',
      '후회하지 않을 수 있을까',
      '믿어도 될까 망설였다',
      '결단의 시간이었다',
      '돌아갈 수 없었다',
    ],
    physicalExpressions: [
      '깊은 숨을 들이쉬었다',
      '주먹을 불끈 쥐었다',
      '시선을 피했다',
      '입술을 깨물었다',
      '어깨가 축 처졌다',
      '고개를 끄덕였다',
      '눈을 질끈 감았다',
      '손이 떨렸다',
    ],
    atmosphereWords: ['변화', '선택', '관계', '성장', '갈등', '화해', '운명'],
    tensionPhrases: [
      '때가 왔다',
      '더 이상 미룰 수 없었다',
      '결정해야 했다',
      '돌이킬 수 없었다',
    ],
  },
};

/**
 * 장르별 딜레마 확장 풀
 */
export const GENRE_DILEMMA_POOLS: Record<string, DilemmaType[]> = {
  스릴러: [
    { name: '진실 vs 안전', description: '진실을 파헤치면 위험해지는 상황', emotionalWeight: 8, examples: ['증거를 공개하면 표적이 된다'] },
    { name: '동맹 vs 독립', description: '의심스러운 동맹을 받아들일 것인가', emotionalWeight: 7, examples: ['그의 도움이 필요하지만 믿을 수 없다'] },
    { name: '시간 vs 안전', description: '빠른 행동과 신중한 접근 사이', emotionalWeight: 6, examples: ['지금 움직이면 위험하지만 기다리면 늦는다'] },
  ],
  호러: [
    { name: '도주 vs 대면', description: '공포를 피할 것인가 맞설 것인가', emotionalWeight: 9, examples: ['도망치면 다른 사람이 위험해진다'] },
    { name: '정신 vs 생존', description: '진실을 알면 미쳐버릴 수 있는 상황', emotionalWeight: 10, examples: ['알면 안 되는 것을 알아버렸다'] },
    { name: '희생 vs 저주', description: '누군가를 희생시켜 저주를 피할 것인가', emotionalWeight: 10, examples: ['한 명을 바치면 모두 살 수 있다'] },
  ],
  드라마: [
    { name: '꿈 vs 현실', description: '이상과 현실 사이의 선택', emotionalWeight: 7, examples: ['꿈을 따르면 가족을 떠나야 한다'] },
    { name: '진심 vs 체면', description: '진심을 말하면 관계가 변할 수 있는 상황', emotionalWeight: 6, examples: ['고백하면 우정이 끝날 수도 있다'] },
    { name: '과거 vs 미래', description: '과거를 붙잡을 것인가 놓을 것인가', emotionalWeight: 8, examples: ['그때 그 사람을 잊어야 새 출발이 가능하다'] },
  ],
  default: [],
};

/**
 * 플레이어 행동 패턴 타입
 */
export interface PlayerBehaviorPattern {
  dominant: 'aggressive' | 'cautious' | 'diplomatic' | 'exploratory' | 'balanced';
  recentEmotions: string[];
  conflictTendency: number; // 0-1
  relationshipFocus: number; // 0-1
}

/**
 * 누적 텐션 상태
 */
export interface CumulativeTensionState {
  currentLevel: number; // 1-10
  peakReached: boolean;
  valleysCount: number;
  lastPeakDay: number;
  emotionalDebt: number; // 해소되지 않은 긴장
}

/**
 * 동적 페르소나 컨텍스트
 */
export interface DynamicPersonaContext {
  genres: string[];
  currentDay: number;
  totalDays: number;
  playerPattern: PlayerBehaviorPattern;
  tensionState: CumulativeTensionState;
  recentNarrativeKeywords: string[];
}

/**
 * 플레이어 행동 패턴 분석
 */
export function analyzePlayerBehavior(
  actionHistory: Array<{ type: string; description: string }>,
): PlayerBehaviorPattern {
  if (!actionHistory || actionHistory.length === 0) {
    return {
      dominant: 'balanced',
      recentEmotions: [],
      conflictTendency: 0.5,
      relationshipFocus: 0.5,
    };
  }

  const patterns = {
    aggressive: 0,
    cautious: 0,
    diplomatic: 0,
    exploratory: 0,
  };

  const aggressiveKeywords = ['공격', '싸우', '저항', '방어', '무기', '강제', '위협'];
  const cautiousKeywords = ['기다', '관찰', '숨', '조심', '경계', '확인', '대기'];
  const diplomaticKeywords = ['협상', '대화', '설득', '동맹', '협력', '화해', '타협'];
  const exploratoryKeywords = ['탐색', '조사', '발견', '찾', '수색', '정보', '확인'];

  actionHistory.forEach((action) => {
    const desc = action.description.toLowerCase();
    if (aggressiveKeywords.some((kw) => desc.includes(kw))) patterns.aggressive++;
    if (cautiousKeywords.some((kw) => desc.includes(kw))) patterns.cautious++;
    if (diplomaticKeywords.some((kw) => desc.includes(kw))) patterns.diplomatic++;
    if (exploratoryKeywords.some((kw) => desc.includes(kw))) patterns.exploratory++;
  });

  const total = Object.values(patterns).reduce((a, b) => a + b, 1);
  const dominant = Object.entries(patterns).reduce((a, b) => (b[1] > a[1] ? b : a))[0] as PlayerBehaviorPattern['dominant'];

  return {
    dominant: total <= 1 ? 'balanced' : dominant,
    recentEmotions: [],
    conflictTendency: (patterns.aggressive) / total,
    relationshipFocus: (patterns.diplomatic) / total,
  };
}

/**
 * 장르에 맞는 감정 표현 선택 (동적)
 */
export function selectEmotionExpression(
  context: DynamicPersonaContext,
  expressionType: 'inner' | 'physical' | 'atmosphere' | 'tension',
): string {
  const primaryGenre = context.genres[0] || 'default';
  const pool = GENRE_EMOTION_POOLS[primaryGenre] || GENRE_EMOTION_POOLS.default;

  let candidates: string[];
  switch (expressionType) {
    case 'inner':
      candidates = pool.innerThoughts;
      break;
    case 'physical':
      candidates = pool.physicalExpressions;
      break;
    case 'atmosphere':
      candidates = pool.atmosphereWords;
      break;
    case 'tension':
      candidates = pool.tensionPhrases;
      break;
  }

  // 최근 사용된 키워드 제외 (반복 방지)
  const filteredCandidates = candidates.filter(
    (c) => !context.recentNarrativeKeywords.some((kw) => c.includes(kw)),
  );

  const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;

  // 텐션 레벨에 따른 선택 조정
  const tensionBias = context.tensionState.currentLevel / 10;
  const index = Math.floor(tensionBias * (finalCandidates.length - 1));

  return finalCandidates[Math.min(index, finalCandidates.length - 1)];
}

/**
 * 동적 딜레마 생성
 */
export function generateDynamicDilemma(
  context: DynamicPersonaContext,
): DilemmaType {
  const primaryGenre = context.genres[0] || 'default';
  const genreDilemmas = GENRE_DILEMMA_POOLS[primaryGenre] || [];
  const baseDilemmas = DOKYUNG_PERSONA.dilemmaDesignPrinciples.types;

  // 장르 + 기본 딜레마 풀 합치기
  const allDilemmas = [...genreDilemmas, ...baseDilemmas];

  // 플레이어 패턴에 따른 딜레마 선택
  let selectedDilemma: DilemmaType;

  if (context.playerPattern.conflictTendency > 0.6) {
    // 공격적 플레이어에게는 신중함을 요구하는 딜레마
    selectedDilemma = allDilemmas.find((d) => d.name.includes('신뢰') || d.name.includes('용서'))
      || allDilemmas[0];
  } else if (context.playerPattern.relationshipFocus > 0.6) {
    // 관계 중심 플레이어에게는 희생을 요구하는 딜레마
    selectedDilemma = allDilemmas.find((d) => d.name.includes('희생') || d.name.includes('집단'))
      || allDilemmas[0];
  } else {
    // Day 진행도에 따른 딜레마 무게 조정
    const dayRatio = context.currentDay / context.totalDays;
    const targetWeight = Math.ceil(dayRatio * 10);
    selectedDilemma = allDilemmas.reduce((closest, current) =>
      Math.abs(current.emotionalWeight - targetWeight) < Math.abs(closest.emotionalWeight - targetWeight)
        ? current : closest,
    );
  }

  return selectedDilemma;
}

/**
 * 누적 텐션 업데이트
 */
export function updateCumulativeTension(
  currentState: CumulativeTensionState,
  narrativeEvent: 'conflict' | 'resolution' | 'revelation' | 'quiet' | 'climax',
  currentDay: number,
): CumulativeTensionState {
  const newState = { ...currentState };

  switch (narrativeEvent) {
    case 'conflict':
      newState.currentLevel = Math.min(10, newState.currentLevel + 2);
      newState.emotionalDebt += 1;
      break;
    case 'resolution':
      newState.currentLevel = Math.max(1, newState.currentLevel - 1);
      newState.emotionalDebt = Math.max(0, newState.emotionalDebt - 1);
      newState.valleysCount++;
      break;
    case 'revelation':
      newState.currentLevel = Math.min(10, newState.currentLevel + 3);
      newState.emotionalDebt += 2;
      break;
    case 'quiet':
      newState.currentLevel = Math.max(1, newState.currentLevel - 2);
      newState.valleysCount++;
      break;
    case 'climax':
      newState.currentLevel = 10;
      newState.peakReached = true;
      newState.lastPeakDay = currentDay;
      break;
  }

  return newState;
}

/**
 * 동적 페르소나 프롬프트 생성
 */
export function buildDynamicPersonaPrompt(context: DynamicPersonaContext): string {
  const innerExpression = selectEmotionExpression(context, 'inner');
  const physicalExpression = selectEmotionExpression(context, 'physical');
  const atmosphereWord = selectEmotionExpression(context, 'atmosphere');
  const tensionPhrase = selectEmotionExpression(context, 'tension');
  const recommendedDilemma = generateDynamicDilemma(context);

  // Peak-Valley 권장사항
  let pacingRecommendation = '';
  if (context.tensionState.emotionalDebt > 3) {
    pacingRecommendation = '⚠️ 긴장이 과도하게 누적됨. 이번 장면에서 숨 쉴 틈(Breathing Room)을 배치하세요.';
  } else if (context.tensionState.valleysCount > context.currentDay) {
    pacingRecommendation = '⚠️ 이완 장면이 많음. 긴장감을 높이는 이벤트를 배치하세요.';
  } else {
    pacingRecommendation = '✓ 텐션 밸런스 양호';
  }

  return `
### 동적 페르소나 가이드 (Day ${context.currentDay}) ###

**이번 장면 권장 감정 표현**:
- 내면: "${innerExpression}"
- 신체: "${physicalExpression}"
- 분위기: ${atmosphereWord}
- 긴장: "${tensionPhrase}"

**권장 딜레마 유형**: ${recommendedDilemma.name} (무게: ${recommendedDilemma.emotionalWeight}/10)
- ${recommendedDilemma.description}

**플레이어 패턴 분석**:
- 주요 성향: ${context.playerPattern.dominant}
- 갈등 선호: ${Math.round(context.playerPattern.conflictTendency * 100)}%
- 관계 중심: ${Math.round(context.playerPattern.relationshipFocus * 100)}%

**텐션 상태**:
- 현재 레벨: ${context.tensionState.currentLevel}/10
- 감정 부채: ${context.tensionState.emotionalDebt}
- ${pacingRecommendation}
`;
}

/**
 * 초기 텐션 상태 생성
 */
export function createInitialTensionState(): CumulativeTensionState {
  return {
    currentLevel: 3,
    peakReached: false,
    valleysCount: 0,
    lastPeakDay: 0,
    emotionalDebt: 0,
  };
}

export default DOKYUNG_PERSONA;
