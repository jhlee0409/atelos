import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai';

const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY가 설정되지 않았습니다.');
  }
  return apiKey;
};

let genAI: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getApiKey());
  }
  return genAI;
};

// 카테고리별 생성 타입
// v1.2: 'locations' 카테고리 제거됨 (동적 위치 시스템으로 대체)
// v1.3: deprecated 카테고리들 제거 (플레이 시스템에서 미사용)
// v1.4: 'flags' 카테고리 추가 (flagDictionary 직접 생성)
export type GenerationCategory =
  | 'scenario_overview'
  | 'characters'
  | 'relationships'
  | 'stats'
  | 'flags'  // v1.4: flagDictionary 직접 생성
  | 'endings'
  | 'traits'
  | 'keywords'
  | 'genre'
  | 'idea_suggestions'
  | 'story_opening'
  | 'gameplay_config';

// 카테고리별 JSON 스키마 정의 (Gemini responseSchema)
const CATEGORY_SCHEMAS: Record<GenerationCategory, Schema> = {
  scenario_overview: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: '시나리오 제목 (한글)' },
      synopsis: { type: SchemaType.STRING, description: '시나리오 개요 (200-500자)' },
      playerGoal: { type: SchemaType.STRING, description: '플레이어 목표' },
      genre: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '장르 목록',
      },
      coreKeywords: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '핵심 키워드 (#으로 시작)',
      },
      scenarioId: { type: SchemaType.STRING, description: '영문 대문자 ID' },
    },
    required: ['title', 'synopsis', 'playerGoal', 'genre', 'coreKeywords', 'scenarioId'],
  },

  characters: {
    type: SchemaType.OBJECT,
    properties: {
      characters: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            roleId: { type: SchemaType.STRING, description: '영문 대문자 역할 ID' },
            roleName: { type: SchemaType.STRING, description: '한글 역할명' },
            characterName: { type: SchemaType.STRING, description: '캐릭터 이름' },
            backstory: { type: SchemaType.STRING, description: '배경 스토리 (100-200자)' },
            suggestedTraits: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: '추천 특성 ID',
            },
          },
          required: ['roleId', 'roleName', 'characterName', 'backstory', 'suggestedTraits'],
        },
      },
    },
    required: ['characters'],
  },

  relationships: {
    type: SchemaType.OBJECT,
    properties: {
      relationships: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            personA: { type: SchemaType.STRING, description: '캐릭터A 이름' },
            personB: { type: SchemaType.STRING, description: '캐릭터B 이름' },
            value: { type: SchemaType.INTEGER, description: '-100 ~ 100 관계 수치' },
            reason: { type: SchemaType.STRING, description: '관계 설명 (50자 이내)' },
          },
          required: ['personA', 'personB', 'value', 'reason'],
        },
      },
    },
    required: ['relationships'],
  },

  stats: {
    type: SchemaType.OBJECT,
    properties: {
      stats: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'camelCase 스탯 ID' },
            name: { type: SchemaType.STRING, description: '한글 스탯 이름' },
            description: { type: SchemaType.STRING, description: '스탯 설명' },
            min: { type: SchemaType.INTEGER },
            max: { type: SchemaType.INTEGER },
            initialValue: { type: SchemaType.INTEGER },
            polarity: {
              type: SchemaType.STRING,
              format: 'enum',
              description: 'positive 또는 negative',
              enum: ['positive', 'negative'],
            },
          },
          required: ['id', 'name', 'description', 'min', 'max', 'initialValue', 'polarity'],
        },
      },
    },
    required: ['stats'],
  },

  // v1.4: 플래그 생성 스키마 추가
  flags: {
    type: SchemaType.OBJECT,
    properties: {
      flags: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            flagName: { type: SchemaType.STRING, description: 'FLAG_ 접두사 + 영문 대문자 (예: FLAG_RESCUE_SUCCESS)' },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              description: 'boolean(참/거짓) 또는 count(카운트)',
              enum: ['boolean', 'count'],
            },
            description: { type: SchemaType.STRING, description: '플래그 설명 (50자 이내)' },
            triggerCondition: { type: SchemaType.STRING, description: '플래그가 획득되는 조건 설명 (AI 가이드용)' },
          },
          required: ['flagName', 'type', 'description', 'triggerCondition'],
        },
      },
    },
    required: ['flags'],
  },

  endings: {
    type: SchemaType.OBJECT,
    properties: {
      endings: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            endingId: { type: SchemaType.STRING, description: 'ENDING_ 접두사 대문자 ID' },
            title: { type: SchemaType.STRING, description: '엔딩 제목' },
            description: { type: SchemaType.STRING, description: '엔딩 설명 (100-200자)' },
            isGoalSuccess: { type: SchemaType.BOOLEAN, description: '목표 달성 여부' },
            suggestedConditions: {
              type: SchemaType.OBJECT,
              properties: {
                stats: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      statId: { type: SchemaType.STRING },
                      comparison: {
                        type: SchemaType.STRING,
                        format: 'enum',
                        enum: ['>=', '<=', '==', '>', '<', '!='],
                      },
                      value: { type: SchemaType.INTEGER },
                    },
                    required: ['statId', 'comparison', 'value'],
                  },
                },
              },
              required: ['stats'],
            },
          },
          required: ['endingId', 'title', 'description', 'isGoalSuccess', 'suggestedConditions'],
        },
      },
    },
    required: ['endings'],
  },

  traits: {
    type: SchemaType.OBJECT,
    properties: {
      buffs: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            traitId: { type: SchemaType.STRING, description: 'camelCase ID' },
            traitName: { type: SchemaType.STRING, description: 'snake_case 시스템명' },
            displayName: { type: SchemaType.STRING, description: '한글 표시명' },
            description: { type: SchemaType.STRING, description: '특성 설명' },
            effect: { type: SchemaType.STRING, description: '게임 내 효과' },
          },
          required: ['traitId', 'traitName', 'displayName', 'description', 'effect'],
        },
      },
      debuffs: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            traitId: { type: SchemaType.STRING, description: 'camelCase ID' },
            traitName: { type: SchemaType.STRING, description: 'snake_case 시스템명' },
            displayName: { type: SchemaType.STRING, description: '한글 표시명' },
            description: { type: SchemaType.STRING, description: '특성 설명' },
            effect: { type: SchemaType.STRING, description: '게임 내 효과' },
          },
          required: ['traitId', 'traitName', 'displayName', 'description', 'effect'],
        },
      },
    },
    required: ['buffs', 'debuffs'],
  },

  keywords: {
    type: SchemaType.OBJECT,
    properties: {
      keywords: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '#으로 시작하는 키워드',
      },
    },
    required: ['keywords'],
  },

  genre: {
    type: SchemaType.OBJECT,
    properties: {
      genres: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '장르 목록',
      },
    },
    required: ['genres'],
  },

  idea_suggestions: {
    type: SchemaType.OBJECT,
    properties: {
      ideas: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            idea: { type: SchemaType.STRING, description: '시나리오 아이디어 (1-2문장)' },
            genre: { type: SchemaType.STRING, description: '주요 장르' },
            hook: { type: SchemaType.STRING, description: '핵심 매력 포인트' },
            tone: {
              type: SchemaType.STRING,
              format: 'enum',
              description: '추천 분위기/톤',
              enum: ['dark', 'hopeful', 'thriller', 'dramatic', 'comedic', 'mysterious', 'romantic', 'action', 'melancholic', 'satirical', 'epic', 'intimate'],
            },
            targetLength: {
              type: SchemaType.STRING,
              format: 'enum',
              description: '추천 시놉시스 길이',
              enum: ['short', 'medium', 'long'],
            },
            setting: { type: SchemaType.STRING, description: '배경 설정 (시대, 장소)' },
          },
          required: ['idea', 'genre', 'hook', 'tone', 'targetLength', 'setting'],
        },
        description: '시나리오 아이디어 목록',
      },
    },
    required: ['ideas'],
  },

  // ==========================================================================
  // 스토리 오프닝 시스템 (Phase 7)
  // ==========================================================================
  story_opening: {
    type: SchemaType.OBJECT,
    properties: {
      prologue: { type: SchemaType.STRING, description: '프롤로그 - 주인공의 일상, 평범한 삶 묘사 (100-200자)' },
      incitingIncident: { type: SchemaType.STRING, description: '촉발 사건 - 일상을 깨뜨리는 결정적 순간 (100-200자)' },
      firstCharacterToMeet: { type: SchemaType.STRING, description: '첫 번째 만나는 캐릭터 이름' },
      firstEncounterContext: { type: SchemaType.STRING, description: '첫 대면 상황 설명 (50-100자)' },
      protagonistSetup: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: '주인공 이름 (선택적)' },
          occupation: { type: SchemaType.STRING, description: '직업/역할' },
          personality: { type: SchemaType.STRING, description: '성격 특성 (한 줄)' },
          dailyRoutine: { type: SchemaType.STRING, description: '일상 루틴 설명' },
          weakness: { type: SchemaType.STRING, description: '약점 또는 고민' },
        },
        required: ['occupation', 'personality'],
      },
      openingTone: {
        type: SchemaType.STRING,
        format: 'enum',
        description: '오프닝 톤',
        enum: ['calm', 'mysterious', 'urgent', 'dramatic', 'introspective'],
      },
      characterIntroductionStyle: {
        type: SchemaType.STRING,
        format: 'enum',
        description: '캐릭터 소개 방식',
        enum: ['gradual', 'immediate', 'contextual'],
      },
      timeOfDay: {
        type: SchemaType.STRING,
        format: 'enum',
        description: '오프닝 시간대',
        enum: ['dawn', 'morning', 'afternoon', 'evening', 'night'],
      },
      openingLocation: { type: SchemaType.STRING, description: '오프닝 장소 구체 설명' },
      thematicElements: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '강조할 테마/키워드 (3-5개)',
      },
      npcRelationshipExposure: {
        type: SchemaType.STRING,
        format: 'enum',
        description: 'NPC 관계 노출 모드',
        enum: ['hidden', 'partial', 'visible'],
      },
    },
    required: ['prologue', 'incitingIncident', 'firstCharacterToMeet', 'firstEncounterContext', 'protagonistSetup', 'openingTone', 'thematicElements'],
  },

  // ==========================================================================
  // 게임플레이 설정 (GameplayConfig)
  // v1.4: 실제 게임에서 사용되는 필드만 유지
  // ==========================================================================
  gameplay_config: {
    type: SchemaType.OBJECT,
    properties: {
      routeActivationRatio: {
        type: SchemaType.NUMBER,
        description: '루트 분기 활성화 시점 비율 (0.3~0.5 권장, 예: 0.4 = 총 일수의 40%)',
      },
      endingCheckRatio: {
        type: SchemaType.NUMBER,
        description: '엔딩 체크 시작 비율 (0.6~0.8 권장, 예: 0.7 = 총 일수의 70%)',
      },
      narrativePhaseRatios: {
        type: SchemaType.OBJECT,
        properties: {
          setup: { type: SchemaType.NUMBER, description: '도입부 끝나는 비율 (0.2~0.4)' },
          rising_action: { type: SchemaType.NUMBER, description: '전개부 끝나는 비율 (0.5~0.7)' },
          midpoint: { type: SchemaType.NUMBER, description: '중반부 끝나는 비율 (0.7~0.85)' },
          climax: { type: SchemaType.NUMBER, description: '클라이맥스 (항상 1.0)' },
        },
        required: ['setup', 'rising_action', 'midpoint', 'climax'],
      },
      actionPointsPerDay: {
        type: SchemaType.INTEGER,
        description: '하루당 행동 포인트 (2~5, 액션 많으면 높게)',
      },
      criticalStatThreshold: {
        type: SchemaType.NUMBER,
        description: '위험 스탯 임계값 비율 (0.3~0.5, 낮을수록 관대)',
      },
      warningStatThreshold: {
        type: SchemaType.NUMBER,
        description: '경고 스탯 임계값 비율 (criticalStatThreshold보다 높아야 함)',
      },
      reasoning: {
        type: SchemaType.STRING,
        description: '이 설정을 선택한 이유 설명',
      },
    },
    required: ['routeActivationRatio', 'endingCheckRatio', 'narrativePhaseRatios', 'actionPointsPerDay', 'criticalStatThreshold', 'warningStatThreshold', 'reasoning'],
  },
};

// 카테고리별 최적 temperature 설정
// 창의적 작업: 0.7-0.9, 구조적 작업: 0.3-0.5
// v1.4: deprecated 카테고리 제거, flags 추가
const CATEGORY_TEMPERATURE: Record<GenerationCategory, number> = {
  scenario_overview: 0.8, // 창의적 - 독특한 시나리오 생성
  characters: 0.75, // 창의적 - 개성있는 캐릭터
  relationships: 0.5, // 중간 - 논리적이면서 흥미로운 관계
  stats: 0.3, // 구조적 - 일관된 게임 시스템
  flags: 0.4, // 구조적 - 일관된 플래그 시스템 (v1.4)
  endings: 0.6, // 중간 - 다양하면서 일관된 엔딩
  traits: 0.5, // 중간 - 균형잡힌 특성
  keywords: 0.6, // 중간 - 적절한 키워드
  genre: 0.4, // 구조적 - 정확한 장르 분류
  idea_suggestions: 0.9, // 매우 창의적 - 다양하고 독특한 아이디어
  story_opening: 0.75, // 창의적 - 몰입감 있는 오프닝 생성
  gameplay_config: 0.4, // 구조적 - 일관된 게임 밸런스 설정
};

// 카테고리별 maxOutputTokens 설정
// v1.4: deprecated 카테고리 제거, flags 추가
const CATEGORY_MAX_TOKENS: Record<GenerationCategory, number> = {
  scenario_overview: 2000,
  characters: 4000, // 여러 캐릭터 생성
  relationships: 3000, // 다수의 관계
  stats: 2000,
  flags: 2500, // 여러 플래그 + 트리거 조건 (v1.4)
  endings: 4000, // 여러 엔딩 + 조건
  traits: 3000, // 버프/디버프 각 3-4개
  keywords: 1000, // 간단한 목록
  genre: 1000, // 간단한 목록
  idea_suggestions: 2000, // 여러 아이디어
  story_opening: 3000, // 프롤로그, 촉발 사건, 주인공 설정 포함
  gameplay_config: 2000, // 간소화된 게임 설정 + 설명
};

interface AIGenerateRequestBody {
  category: GenerationCategory;
  input: string;
  context?: {
    genre?: string[];
    title?: string;
    synopsis?: string;
    existingCharacters?: string[];
    existingStats?: string[];
    totalDays?: number;
  };
}

// 카테고리별 프롬프트 템플릿 (XML 구조화)
const getCategoryPrompt = (
  category: GenerationCategory,
  input: string,
  context?: AIGenerateRequestBody['context'],
): { systemPrompt: string; userPrompt: string } => {
  const baseContext = context
    ? `
<scenario_context>
  <genre>${context.genre?.join(', ') || '미정'}</genre>
  <title>${context.title || '미정'}</title>
  <synopsis>${context.synopsis || '미정'}</synopsis>
  ${context.existingCharacters?.length ? `<existing_characters>${context.existingCharacters.join(', ')}</existing_characters>` : ''}
  ${context.existingStats?.length ? `<existing_stats>${context.existingStats.join(', ')}</existing_stats>` : ''}
</scenario_context>`
    : '';

  const prompts: Record<
    GenerationCategory,
    { systemPrompt: string; userPrompt: string }
  > = {
    scenario_overview: {
      systemPrompt: `<role>인터랙티브 내러티브 게임 시나리오 전문가</role>

<task>사용자의 아이디어를 바탕으로 매력적인 시나리오 개요를 생성합니다.</task>

<guidelines>
  <guideline>제목은 한글 20자 이내, 창의적이고 기억에 남는 것</guideline>
  <guideline>시놉시스는 200-500자로 핵심 갈등과 설정을 포함</guideline>
  <guideline>플레이어 목표는 100자 이내로 명확하게</guideline>
  <guideline>장르는 3-5개 선택</guideline>
  <guideline>키워드는 반드시 #으로 시작 (5-7개)</guideline>
  <guideline>scenarioId는 영문 대문자와 언더스코어만 사용 (예: ZERO_HOUR)</guideline>
</guidelines>

<genre_examples>포스트아포칼립스, SF, 판타지, 호러, 미스터리, 로맨스, 스릴러, 역사, 현대, 액션, 서바이벌, 심리, 디스토피아</genre_examples>`,
      userPrompt: `<request>다음 아이디어로 시나리오 개요를 생성해주세요.</request>

<input_idea>${input}</input_idea>
${baseContext}`,
    },

    characters: {
      systemPrompt: `<role>인터랙티브 내러티브 게임의 캐릭터 디자이너</role>

<task>시나리오에 어울리는 입체적인 캐릭터를 생성합니다.</task>

<guidelines>
  <guideline>roleId는 영문 대문자 (예: LEADER, MEDIC, SOLDIER)</guideline>
  <guideline>roleName은 한글 역할명</guideline>
  <guideline>characterName은 시나리오 배경에 맞는 한글 이름</guideline>
  <guideline>backstory는 100-200자로 동기와 과거를 포함</guideline>
  <guideline>suggestedTraits는 성격 특성 ID 2-3개</guideline>
</guidelines>

<role_examples>LEADER, MEDIC, SOLDIER, SCIENTIST, SURVIVOR, MERCHANT, ANTAGONIST, MENTOR, CHILD, ELDER</role_examples>

<trait_examples>optimistic, pessimistic, brave, cautious, charismatic, analytical, aggressive, peaceful, loyal, suspicious</trait_examples>

<example>
{
  "characters": [
    {
      "roleId": "LEADER",
      "roleName": "지도자",
      "characterName": "박준영",
      "backstory": "전직 소방관으로 재난 상황에서 침착하게 대처하는 능력을 갖추고 있다. 가족을 잃은 후 생존자들을 이끌며 새로운 삶의 의미를 찾고 있다.",
      "suggestedTraits": ["brave", "charismatic", "responsible"]
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 설명을 바탕으로 2-4명의 캐릭터를 생성해주세요.</request>

<input_description>${input}</input_description>
${baseContext}`,
    },

    relationships: {
      systemPrompt: `<role>캐릭터 관계 디자이너</role>

<task>캐릭터들 간의 초기 관계를 설계하여 드라마틱한 상호작용을 만듭니다.</task>

<value_scale>
  <range min="80" max="100">깊은 신뢰/사랑/헌신</range>
  <range min="50" max="79">우호적/협력적</range>
  <range min="20" max="49">중립~약간 우호적</range>
  <range min="-19" max="19">중립</range>
  <range min="-49" max="-20">약간 적대적/경계</range>
  <range min="-79" max="-50">적대적/불신</range>
  <range min="-100" max="-80">극심한 적대/증오</range>
</value_scale>

<guidelines>
  <guideline>관계는 비대칭일 수 있음 (A→B와 B→A가 다를 수 있음)</guideline>
  <guideline>모든 캐릭터 쌍에 대해 양방향 관계를 정의</guideline>
  <guideline>갈등, 로맨스, 멘토-멘티, 라이벌 등 다양한 역학 포함</guideline>
  <guideline>reason은 50자 이내로 간결하게</guideline>
</guidelines>

<example>
{
  "relationships": [
    {
      "personA": "박준영",
      "personB": "김서연",
      "value": 75,
      "reason": "오랜 동료로서 서로를 신뢰하며 의지함"
    },
    {
      "personA": "김서연",
      "personB": "박준영",
      "value": 85,
      "reason": "리더십을 존경하며 깊은 신뢰를 보냄"
    },
    {
      "personA": "박준영",
      "personB": "이민호",
      "value": -30,
      "reason": "과거 갈등으로 인한 불신이 남아있음"
    },
    {
      "personA": "이민호",
      "personB": "박준영",
      "value": -45,
      "reason": "리더 자리를 노리며 경쟁심을 느낌"
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 캐릭터들 간의 초기 관계를 생성해주세요.</request>

<characters>${input}</characters>
${baseContext}

<important_instructions>
- **반드시** 위 characters 목록에 있는 캐릭터 이름만 사용하세요.
- 각 캐릭터 쌍마다 양방향(A→B, B→A) 관계를 정의해주세요.
- personA와 personB의 이름 철자가 정확히 일치해야 합니다.
</important_instructions>`,
    },

    stats: {
      systemPrompt: `<role>게임 시스템 디자이너</role>

<task>시나리오 진행에 영향을 주는 핵심 스탯을 설계합니다.</task>

<guidelines>
  <guideline>id는 camelCase 영문 (예: morale, resources)</guideline>
  <guideline>name은 한글 스탯 이름</guideline>
  <guideline>description은 50자 이내 설명</guideline>
  <guideline>min/max는 보통 0-100</guideline>
  <guideline>initialValue는 시나리오 시작 시 값</guideline>
  <guideline>polarity: positive(높을수록 좋음) 또는 negative(낮을수록 좋음)</guideline>
</guidelines>

<common_stats>
  <stat id="morale" polarity="positive">사기 - 그룹의 정신적 상태</stat>
  <stat id="resources" polarity="positive">자원 - 식량, 물자 등</stat>
  <stat id="safety" polarity="positive">안전도 - 위협으로부터의 보호 수준</stat>
  <stat id="trust" polarity="positive">신뢰도 - 그룹 내 결속력</stat>
  <stat id="chaos" polarity="negative">혼란도 - 불안정성 수준</stat>
  <stat id="threat" polarity="negative">위협 수준 - 외부 위험</stat>
</common_stats>

<example>
{
  "stats": [
    {
      "id": "morale",
      "name": "사기",
      "description": "생존자 그룹의 전반적인 정신 상태와 의지",
      "min": 0,
      "max": 100,
      "initialValue": 50,
      "polarity": "positive"
    },
    {
      "id": "resources",
      "name": "자원",
      "description": "식량, 의약품, 연료 등 생존에 필요한 물자",
      "min": 0,
      "max": 100,
      "initialValue": 40,
      "polarity": "positive"
    },
    {
      "id": "cityChaos",
      "name": "도시 혼란도",
      "description": "외부 환경의 위험 수준과 불안정성",
      "min": 0,
      "max": 100,
      "initialValue": 60,
      "polarity": "negative"
    },
    {
      "id": "groupCohesion",
      "name": "그룹 결속력",
      "description": "생존자들 간의 협력과 신뢰 수준",
      "min": 0,
      "max": 100,
      "initialValue": 55,
      "polarity": "positive"
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 시나리오에 적합한 4-6개의 스탯을 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<design_tips>
- 각 스탯은 엔딩 조건에서 사용될 수 있어야 합니다.
- 플레이어 선택이 스탯 변화에 영향을 줄 수 있는 구조로 설계하세요.
- positive/negative polarity를 명확히 하여 "높을수록 좋음" vs "낮을수록 좋음"을 구분하세요.
</design_tips>`,
    },

    // v1.4: 플래그 생성 프롬프트 추가
    flags: {
      systemPrompt: `<role>게임 시스템 디자이너</role>

<task>시나리오 진행을 추적하는 이벤트 플래그를 설계합니다.</task>

<guidelines>
  <guideline>flagName은 FLAG_ 접두사 + 영문 대문자 (예: FLAG_RESCUE_SUCCESS)</guideline>
  <guideline>type은 boolean(참/거짓 이벤트) 또는 count(누적 횟수 추적)</guideline>
  <guideline>description은 50자 이내 한글 설명</guideline>
  <guideline>triggerCondition은 AI가 이 플래그를 부여할 조건 설명 (한글, 구체적으로)</guideline>
</guidelines>

<flag_types>
- boolean: 단일 이벤트 발생 여부 (구출 성공, 비밀 발견 등)
- count: 반복 가능한 행동 횟수 (탐색 횟수, 대화 횟수 등)
</flag_types>

<flag_categories>
1. 주요 선택 관련: FLAG_CHOSE_COMBAT, FLAG_CHOSE_NEGOTIATION 등
2. 캐릭터 관련: FLAG_SAVED_[NAME], FLAG_TRUST_[NAME] 등
3. 탐색 관련: FLAG_FOUND_SECRET, FLAG_EXPLORED_ALL 등
4. 이벤트 관련: FLAG_WITNESSED_BETRAYAL, FLAG_SURVIVED_ATTACK 등
</flag_categories>

<design_tips>
- 엔딩 조건에서 사용될 수 있는 플래그를 우선 설계하세요.
- 루트 분기에 영향을 줄 수 있는 플래그를 포함하세요 (탈출/항전/협상 관련).
- 너무 세부적인 플래그보다는 서사적으로 의미있는 이벤트를 추적하세요.
</design_tips>

<example>
{
  "flags": [
    {
      "flagName": "FLAG_RESCUE_SUCCESS",
      "type": "boolean",
      "description": "포로 구출 작전 성공",
      "triggerCondition": "플레이어가 위험을 감수하고 포로를 성공적으로 구출했을 때"
    },
    {
      "flagName": "FLAG_EXPLORATION_COUNT",
      "type": "count",
      "description": "누적 탐색 횟수",
      "triggerCondition": "탐색 행동을 할 때마다 1씩 증가"
    },
    {
      "flagName": "FLAG_CHOSE_VIOLENCE",
      "type": "boolean",
      "description": "폭력적 해결 선택",
      "triggerCondition": "대립 상황에서 무력 사용을 선택했을 때"
    },
    {
      "flagName": "FLAG_ALLY_GAINED",
      "type": "count",
      "description": "획득한 동맹 수",
      "triggerCondition": "새로운 캐릭터의 신뢰를 얻어 동맹이 되었을 때"
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 시나리오에 적합한 6-10개의 이벤트 플래그를 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<design_requirements>
- 엔딩 분기에 영향을 줄 수 있는 중요한 선택/이벤트를 추적하세요.
- 루트 분기(탈출/항전/협상 등)와 관련된 플래그를 포함하세요.
- boolean과 count 타입을 적절히 혼합하세요.
- triggerCondition은 AI가 서사 생성 시 참고할 수 있도록 구체적으로 작성하세요.
</design_requirements>`,
    },

    endings: {
      systemPrompt: `<role>내러티브 디자이너</role>

<task>시나리오의 다양한 엔딩과 그 달성 조건을 설계합니다.</task>

<guidelines>
  <guideline>endingId는 ENDING_ 접두사 + 영문 대문자 (예: ENDING_TRIUMPH)</guideline>
  <guideline>title은 한글 엔딩 제목</guideline>
  <guideline>description은 100-200자 엔딩 설명</guideline>
  <guideline>isGoalSuccess: true(목표 달성) 또는 false(실패)</guideline>
  <guideline>suggestedConditions에 스탯 조건 포함</guideline>
</guidelines>

<comparison_operators>>=, <=, ==, >, <, !=</comparison_operators>

<ending_balance>
좋은 엔딩(isGoalSuccess: true)과 나쁜 엔딩(isGoalSuccess: false)을 균형있게 포함하세요.
루트별 엔딩(탈출 성공, 항전 승리, 협상 타결)과 실패 엔딩을 모두 고려하세요.
</ending_balance>

<critical_constraint>
**중요**: suggestedConditions에 사용하는 statId는 반드시 시나리오에 이미 정의된 것만 사용해야 합니다.
- 존재하지 않는 스탯 ID를 사용하면 게임에서 엔딩 조건 검증이 실패합니다.
- context에서 제공되는 existing_stats 목록을 참조하여 해당 ID만 사용하세요.
</critical_constraint>

<condition_design_tips>
- 하나의 엔딩에 스탯 조건 1-3개가 적당합니다.
- 동일 스탯에 상충되는 조건을 넣지 마세요 (예: >= 80 AND <= 20)
- 좋은 엔딩은 높은 스탯 요구, 나쁜 엔딩은 낮은 스탯으로 구분하세요.
</condition_design_tips>

<example>
{
  "endings": [
    {
      "endingId": "ENDING_ESCAPE_SUCCESS",
      "title": "새로운 시작",
      "description": "위험을 뚫고 안전 지대에 도달했다. 모든 것을 잃었지만, 새로운 삶을 시작할 수 있는 희망이 있다.",
      "isGoalSuccess": true,
      "suggestedConditions": {
        "stats": [{ "statId": "morale", "comparison": ">=", "value": 60 }]
      }
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 시나리오에 적합한 4-6개의 다양한 엔딩을 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<important_instructions>
- 좋은 엔딩과 나쁜 엔딩을 균형있게 포함해주세요.
- **반드시** existing_stats에 있는 ID만 사용하세요. 새로운 ID를 만들지 마세요.
- 조건이 논리적으로 충돌하지 않도록 설계하세요.
</important_instructions>`,
    },

    traits: {
      systemPrompt: `<role>캐릭터 시스템 디자이너</role>

<task>캐릭터에게 부여할 버프(긍정적 특성)와 디버프(부정적 특성)를 설계합니다.</task>

<guidelines>
  <guideline>traitId는 camelCase 영문 (예: leadership, trauma)</guideline>
  <guideline>traitName은 snake_case 시스템 식별자 (예: natural_leader)</guideline>
  <guideline>displayName은 한글 표시명 (예: 타고난 리더)</guideline>
  <guideline>description은 특성 설명 50자 이내</guideline>
  <guideline>effect는 게임 내 구체적 효과</guideline>
</guidelines>

<example>
{
  "buffs": [
    {
      "traitId": "leadership",
      "traitName": "natural_leader",
      "displayName": "타고난 리더",
      "description": "위기 상황에서 침착하게 그룹을 이끈다",
      "effect": "그룹 사기 감소 시 완충 효과, 협상 성공률 증가"
    }
  ],
  "debuffs": [
    {
      "traitId": "trauma",
      "traitName": "deep_trauma",
      "displayName": "깊은 트라우마",
      "description": "과거의 상처가 행동에 영향을 준다",
      "effect": "특정 상황에서 패닉 반응, 신뢰 형성 어려움"
    }
  ]
}
</example>`,
      userPrompt: `<request>다음 시나리오에 적합한 캐릭터 특성을 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<requirement>버프 3-4개, 디버프 3-4개를 제안해주세요.</requirement>`,
    },

    keywords: {
      systemPrompt: `<role>시나리오 태깅 전문가</role>

<task>시나리오를 대표하는 핵심 키워드를 생성합니다.</task>

<guidelines>
  <guideline>키워드는 반드시 #으로 시작</guideline>
  <guideline>한글 키워드 사용</guideline>
  <guideline>테마, 분위기, 설정, 핵심 요소를 표현</guideline>
  <guideline>6-10개의 키워드 생성</guideline>
</guidelines>

<keyword_categories>
  <category>장르/설정: #포스트아포칼립스 #디스토피아 #근미래</category>
  <category>분위기: #긴장감 #절망 #희망 #미스터리</category>
  <category>테마: #생존 #인간성 #선택 #신뢰</category>
  <category>요소: #좀비 #자원부족 #갈등 #협력</category>
</keyword_categories>`,
      userPrompt: `<request>다음 시나리오에 적합한 6-10개의 핵심 키워드를 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}`,
    },

    genre: {
      systemPrompt: `<role>게임 장르 분류 전문가</role>

<task>시나리오에 적합한 장르 태그를 분류합니다.</task>

<available_genres>
포스트아포칼립스, SF, 판타지, 호러, 미스터리, 로맨스, 스릴러, 역사, 현대, 액션, 어드벤처, 서바이벌, 심리, 사이버펑크, 스팀펑크, 디스토피아, 유토피아, 군사, 정치, 사회비평, 다크판타지, 도시판타지, 범죄, 느와르
</available_genres>

<guidelines>
  <guideline>메인 장르 2-3개 우선 선택</guideline>
  <guideline>서브 장르 2-3개 추가</guideline>
  <guideline>총 5-8개 장르 선택</guideline>
</guidelines>`,
      userPrompt: `<request>다음 시나리오에 적합한 5-8개의 장르를 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}`,
    },

    idea_suggestions: {
      systemPrompt: `<role>인터랙티브 게임 시나리오 아이디어 발상가</role>

<task>플레이어가 주인공이 되어 선택하는 인터랙티브 스토리 아이디어를 제안합니다.</task>

<principles>
  <principle>7일 등 명확한 시간 제한이 있는 구조</principle>
  <principle>도덕적 딜레마와 의미 있는 선택지</principle>
  <principle>다양한 엔딩으로 이어지는 분기점</principle>
  <principle>감정적 몰입이 가능한 상황</principle>
</principles>

<guidelines>
  <guideline>idea: 한글 1-2문장으로 핵심 상황과 목표 설명</guideline>
  <guideline>genre: 주요 장르 1-2개</guideline>
  <guideline>hook: 플레이어를 끌어당기는 핵심 매력 포인트</guideline>
  <guideline>tone: 아이디어에 가장 어울리는 분위기/톤</guideline>
  <guideline>targetLength: 시놉시스 적정 길이 (short/medium/long)</guideline>
  <guideline>setting: 구체적인 시대와 장소 배경</guideline>
</guidelines>

<tone_options>
dark(어둡고 절망적), hopeful(희망적 성장), thriller(긴장감 서스펜스), dramatic(감정적 갈등), comedic(유머러스 풍자), mysterious(수수께끼 반전), romantic(감정선 관계), action(빠른 전개), melancholic(쓸쓸한 애틋함), satirical(사회비평), epic(웅장한 서사), intimate(내밀한 감정)
</tone_options>

<genre_pool>
포스트아포칼립스, SF, 판타지, 호러, 미스터리, 스릴러, 심리, 서바이벌, 역사, 현대, 로맨스, 범죄, 정치, 군사, 사이버펑크, 디스토피아
</genre_pool>

<example>
{
  "ideas": [
    {
      "idea": "좀비 아포칼립스 속 아파트 단지에서 30명의 생존자를 이끌며 7일간 구조대를 기다린다.",
      "genre": "포스트아포칼립스, 서바이벌",
      "hook": "모두를 살릴 수 없는 상황에서의 선택",
      "tone": "dark",
      "targetLength": "long",
      "setting": "2024년 대한민국 서울 외곽 아파트 단지"
    },
    {
      "idea": "1920년대 호화 열차에서 벌어진 살인 사건의 범인을 찾는 탐정이 되어 승객들을 심문한다.",
      "genre": "미스터리, 역사",
      "hook": "제한된 시간과 공간 속 추리",
      "tone": "mysterious",
      "targetLength": "medium",
      "setting": "1923년 유럽, 파리-이스탄불 오리엔트 특급열차"
    },
    {
      "idea": "우주 정거장에서 산소가 고갈되기 전 탈출 방법을 찾아야 하는 엔지니어가 된다.",
      "genre": "SF, 스릴러",
      "hook": "극한 상황에서의 문제 해결",
      "tone": "thriller",
      "targetLength": "medium",
      "setting": "2157년 지구 궤도 국제우주정거장"
    }
  ]
}
</example>`,
      userPrompt: `<request>인터랙티브 게임에 적합한 시나리오 아이디어를 6-8개 제안해주세요.</request>

<preference>${input || '다양한 장르'}</preference>

<requirements>
  <requirement>서로 다른 장르와 설정을 가진 다양한 아이디어</requirement>
  <requirement>플레이어가 주인공으로 선택을 내리는 상황</requirement>
  <requirement>각 아이디어에 어울리는 tone, targetLength, setting 포함</requirement>
  <requirement>다양한 tone을 골고루 사용</requirement>
</requirements>`,
    },

    // ========================================================================
    // 스토리 오프닝 시스템 (Phase 7)
    // ========================================================================
    story_opening: {
      systemPrompt: `<role>인터랙티브 내러티브 오프닝 전문 작가</role>

<task>시나리오의 몰입감 있는 스토리 오프닝을 설계합니다. 3단계 구조로 플레이어를 자연스럽게 세계관에 진입시킵니다.</task>

<opening_structure>
1. **프롤로그**: 주인공의 평범한 일상을 묘사합니다. 반복되는 루틴, 사소한 고민, 일상적인 관계를 통해 "변하기 전의 세계"를 보여줍니다.
2. **촉발 사건 (Inciting Incident)**: 일상을 완전히 깨뜨리는 결정적 순간입니다. 되돌릴 수 없는 변화가 시작됩니다.
3. **첫 만남**: 촉발 사건 직후, 주인공이 만나는 첫 번째 중요 인물입니다. 이 만남이 앞으로의 여정을 결정짓습니다.
</opening_structure>

<protagonist_guidelines>
- 주인공은 플레이어의 아바타입니다. 너무 구체적인 성격보다는 플레이어가 투영할 수 있는 여지를 남겨주세요.
- 직업과 일상 루틴은 구체적으로, 성격은 핵심 특징만 간결하게.
- 약점이나 고민은 시나리오의 핵심 갈등과 연결되어야 합니다.
- **매우 중요**: 주인공 이름(protagonistSetup.name)은 반드시 existing_characters에 있는 NPC 이름과 달라야 합니다! 같은 이름을 사용하면 스토리가 혼란스러워집니다.
</protagonist_guidelines>

<tone_guidelines>
- calm: 평화로운 일상에서 시작, 점진적 변화
- mysterious: 처음부터 이상한 기운, 설명되지 않는 현상
- urgent: 이미 위기 상황, 급박한 분위기
- dramatic: 감정적으로 강렬한 시작
- introspective: 주인공의 내면 묘사, 성찰적 시작
</tone_guidelines>

<introduction_styles>
- gradual: 캐릭터들을 스토리 진행에 따라 한 명씩 자연스럽게 등장
- immediate: 첫 장면에 주요 캐릭터 대부분 등장
- contextual: 상황에 따라 필요할 때 등장
</introduction_styles>

<writing_principles>
- 한국어로 자연스럽고 문학적인 문장을 사용하세요.
- "보여주기"를 "말하기"보다 우선하세요. 주인공의 감정을 직접 설명하지 말고, 행동과 묘사로 보여주세요.
- 감각적 디테일(시각, 청각, 촉각)을 활용하여 장면을 생생하게 만드세요.
</writing_principles>`,
      userPrompt: `<request>다음 시나리오에 어울리는 몰입감 있는 스토리 오프닝을 생성해주세요.</request>

<scenario>
${input}
</scenario>
${baseContext}

<specific_requirements>
- prologue: 주인공의 평범한 일상 묘사 (100-200자, 감각적 디테일 포함)
- incitingIncident: 모든 것을 바꾸는 결정적 순간 (100-200자, 긴장감 있게)
- firstCharacterToMeet: **반드시** existing_characters 목록에 있는 캐릭터 이름 사용
- firstEncounterContext: 첫 만남이 어떤 상황에서 이루어지는지
- protagonistSetup: 플레이어가 투영할 수 있는 주인공 설정
- openingTone: 시나리오 분위기에 맞는 톤 선택
- thematicElements: 오프닝에서 암시할 핵심 테마 3-5개
</specific_requirements>

<critical>
1. firstCharacterToMeet은 context의 existing_characters에 있는 이름과 정확히 일치해야 합니다.
2. protagonistSetup.name은 절대로 existing_characters에 있는 NPC 이름과 같으면 안 됩니다! 이름이 겹치면 스토리에서 주인공과 NPC가 구분되지 않아 심각한 혼란이 발생합니다.
</critical>`,
    },

    // ========================================================================
    // 게임플레이 설정 (GameplayConfig)
    // v1.4: 실제 게임에서 사용되는 필드만 유지
    // ========================================================================
    gameplay_config: {
      systemPrompt: `<role>인터랙티브 게임 밸런스 설계자</role>

<task>시나리오의 특성(장르, 총 일수, 스탯)에 맞는 최적의 게임플레이 설정을 생성합니다.</task>

<gameplay_config_parameters>
1. **routeActivationRatio** (0.3~0.5): 전체 게임 일수 중 루트 분기가 활성화되는 시점
   - 7일 게임에서 0.4 = Day 3
   - 빠른 전개: 0.3, 느린 빌드업: 0.5

2. **endingCheckRatio** (0.6~0.8): 엔딩 조건 체크가 시작되는 시점
   - 7일 게임에서 0.7 = Day 5
   - 조기 엔딩 가능: 0.6, 끝까지 긴장감: 0.8

3. **narrativePhaseRatios**: 서사 단계 전환 비율
   - setup: 도입부 (0.2~0.4)
   - rising_action: 전개부 (0.5~0.7)
   - midpoint: 중반 전환점 (0.7~0.85)
   - climax: 클라이맥스 (항상 1.0)

4. **actionPointsPerDay** (2~5): 하루에 사용할 수 있는 행동 포인트
   - 액션 장르: 4-5 (많은 선택)
   - 미스터리/드라마: 2-3 (신중한 선택)

5. **criticalStatThreshold** (0.3~0.5): 스탯이 "위험" 상태로 표시되는 비율
   - 관대한 게임: 0.3
   - 긴장감 있는 게임: 0.4-0.5

6. **warningStatThreshold**: 경고 표시 비율 (critical보다 높아야 함)
</gameplay_config_parameters>

<genre_specific_tips>
- **액션/스릴러**: 높은 AP(4-5), 낮은 위험 임계값, 빠른 루트 활성화
- **미스터리/추리**: 낮은 AP(2-3), 느린 서사 전개, 높은 엔딩 체크 비율
- **호러/서바이벌**: 중간 AP, 높은 위험 임계값, 빠른 엔딩 체크
- **드라마/로맨스**: 낮은 AP(2-3), 느린 전개, 캐릭터 관계 중심
- **SF/판타지**: 중간-높은 AP, 중간 서사 전개
</genre_specific_tips>`,
      userPrompt: `<request>다음 시나리오에 최적화된 게임플레이 설정을 생성해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- 시나리오의 장르, 분위기, 페이스에 맞는 설정 선택
- 각 설정값에 대한 이유를 reasoning에 설명
</requirements>`,
    },
  };

  return prompts[category];
};

export async function POST(request: NextRequest) {
  try {
    const body: AIGenerateRequestBody = await request.json();
    const { category, input, context } = body;

    // idea_suggestions, gameplay_config는 빈 입력 허용 (컨텍스트 기반 자동 생성)
    // v1.4: deprecated 카테고리 제거
    const categoriesAllowingEmptyInput = ['idea_suggestions', 'gameplay_config'];
    if (!category || (!categoriesAllowingEmptyInput.includes(category) && !input)) {
      return NextResponse.json(
        { error: 'category와 input은 필수입니다.' },
        { status: 400 },
      );
    }

    const { systemPrompt, userPrompt } = getCategoryPrompt(
      category,
      input || '', // idea_suggestions의 경우 빈 문자열 허용
      context,
    );

    // 카테고리별 최적화된 설정 적용
    const temperature = CATEGORY_TEMPERATURE[category];
    const maxOutputTokens = CATEGORY_MAX_TOKENS[category];
    const responseSchema = CATEGORY_SCHEMAS[category];

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema, // JSON 스키마로 구조 보장
      },
      systemInstruction: systemPrompt,
    });

    console.log(
      `🤖 [AI Generate] 카테고리: ${category}, temp: ${temperature}, maxTokens: ${maxOutputTokens}`,
    );
    console.log(`📝 [AI Generate] 입력: ${input ? input.substring(0, 100) + '...' : '(빈 입력)'}`);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [AI Generate] 응답 성공: ${text.length}자`);

    // responseSchema가 있으면 파싱이 보장되지만, 안전하게 처리
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // 혹시 모를 경우를 위한 fallback
      const cleaned = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      category,
      data: parsed,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    });
  } catch (error) {
    console.error('❌ [AI Generate] 생성 실패:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `AI 생성 오류: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'AI 생성 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
