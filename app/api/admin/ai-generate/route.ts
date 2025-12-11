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
export type GenerationCategory =
  | 'scenario_overview'
  | 'characters'
  | 'relationships'
  | 'stats'
  | 'flags'
  | 'endings'
  | 'traits'
  | 'keywords'
  | 'genre'
  | 'idea_suggestions'
  | 'story_opening'
  | 'character_introductions'
  | 'hidden_relationships'
  | 'character_revelations'
  | 'gameplay_config'
  | 'emergent_narrative';

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

  flags: {
    type: SchemaType.OBJECT,
    properties: {
      flags: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            flagName: { type: SchemaType.STRING, description: 'FLAG_ 접두사 대문자 ID' },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              description: 'boolean 또는 count',
              enum: ['boolean', 'count'],
            },
            description: { type: SchemaType.STRING, description: '플래그 설명' },
            triggerCondition: { type: SchemaType.STRING, description: '발동 조건' },
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
                flags: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
              },
              required: ['stats', 'flags'],
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
  // 2025 Enhanced: 1:1 캐릭터 소개 시퀀스
  // ==========================================================================
  character_introductions: {
    type: SchemaType.OBJECT,
    properties: {
      characterIntroductionSequence: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            characterName: { type: SchemaType.STRING, description: '캐릭터 이름' },
            order: { type: SchemaType.INTEGER, description: '소개 순서 (1부터 시작)' },
            encounterContext: { type: SchemaType.STRING, description: '만남의 맥락 (50-100자)' },
            firstImpressionKeywords: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: '첫인상 키워드 (2-3개)',
            },
            expectedTiming: {
              type: SchemaType.STRING,
              format: 'enum',
              description: '만남 예상 시점',
              enum: ['opening', 'day1', 'day2', 'event-driven'],
            },
          },
          required: ['characterName', 'order', 'encounterContext', 'firstImpressionKeywords', 'expectedTiming'],
        },
        description: '캐릭터별 1:1 소개 시퀀스',
      },
    },
    required: ['characterIntroductionSequence'],
  },

  // ==========================================================================
  // 2025 Enhanced: 숨겨진 NPC 관계 시스템
  // ==========================================================================
  hidden_relationships: {
    type: SchemaType.OBJECT,
    properties: {
      hiddenNPCRelationships: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            relationId: { type: SchemaType.STRING, description: '관계 ID (예: REL_001)' },
            characterA: { type: SchemaType.STRING, description: 'NPC A 이름' },
            characterB: { type: SchemaType.STRING, description: 'NPC B 이름' },
            actualValue: { type: SchemaType.INTEGER, description: '실제 관계 값 (-100~100)' },
            relationshipType: { type: SchemaType.STRING, description: '관계 성격 (예: 과거 연인, 비밀 동료)' },
            backstory: { type: SchemaType.STRING, description: '상세 배경 (100-200자)' },
            visibility: {
              type: SchemaType.STRING,
              format: 'enum',
              description: '초기 가시성',
              enum: ['hidden', 'hinted'],
            },
            discoveryHint: { type: SchemaType.STRING, description: '발견 힌트 텍스트' },
            discoveryMethod: {
              type: SchemaType.STRING,
              format: 'enum',
              description: '주요 발견 방법',
              enum: ['dialogue', 'exploration', 'observation', 'event', 'item'],
            },
          },
          required: ['relationId', 'characterA', 'characterB', 'actualValue', 'relationshipType', 'backstory', 'visibility', 'discoveryHint', 'discoveryMethod'],
        },
        description: 'NPC들 간의 숨겨진 관계',
      },
    },
    required: ['hiddenNPCRelationships'],
  },

  // ==========================================================================
  // 2025 Enhanced: 점진적 캐릭터 공개 시스템
  // ==========================================================================
  character_revelations: {
    type: SchemaType.OBJECT,
    properties: {
      characterRevelations: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            characterName: { type: SchemaType.STRING, description: '캐릭터 이름' },
            revelationLayers: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  trustThreshold: { type: SchemaType.INTEGER, description: '신뢰도 임계값 (-100~100)' },
                  revelationType: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    description: '공개 정보 유형',
                    enum: ['personality', 'backstory', 'secret', 'motivation', 'relationship'],
                  },
                  content: { type: SchemaType.STRING, description: '공개 내용 (50-100자)' },
                  revelationStyle: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    description: '공개 방식',
                    enum: ['direct', 'subtle', 'accidental', 'confession'],
                  },
                },
                required: ['trustThreshold', 'revelationType', 'content', 'revelationStyle'],
              },
              description: '신뢰도별 공개 레이어',
            },
            ultimateSecret: { type: SchemaType.STRING, description: '최고 신뢰도에서만 공개되는 비밀' },
          },
          required: ['characterName', 'revelationLayers'],
        },
        description: '캐릭터별 점진적 공개 설정',
      },
    },
    required: ['characterRevelations'],
  },

  // ==========================================================================
  // 게임플레이 설정 (GameplayConfig)
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
      routeScores: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            routeName: { type: SchemaType.STRING, description: '루트 이름 (예: 탈출, 항전, 협상)' },
            flagScores: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  flagName: { type: SchemaType.STRING, description: '플래그 이름' },
                  score: { type: SchemaType.INTEGER, description: '점수 (10~50)' },
                },
                required: ['flagName', 'score'],
              },
              description: '플래그별 점수',
            },
            statScores: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  statId: { type: SchemaType.STRING, description: '스탯 ID' },
                  comparison: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['>=', '<=', '>', '<', '=='],
                  },
                  threshold: { type: SchemaType.INTEGER, description: '임계값' },
                  score: { type: SchemaType.INTEGER, description: '점수' },
                },
                required: ['statId', 'comparison', 'threshold', 'score'],
              },
              description: '스탯 조건별 점수 (선택)',
            },
          },
          required: ['routeName', 'flagScores'],
        },
        description: '루트별 점수 설정',
      },
      tokenBudgetMultiplier: {
        type: SchemaType.NUMBER,
        description: 'AI 토큰 예산 배수 (0.8~1.5, 복잡한 시나리오는 높게)',
      },
      useGenreFallback: {
        type: SchemaType.BOOLEAN,
        description: '장르 기반 폴백 선택지 사용 여부',
      },
      customFallbackChoices: {
        type: SchemaType.OBJECT,
        properties: {
          prompt: { type: SchemaType.STRING, description: '커스텀 폴백 프롬프트' },
          choice_a: { type: SchemaType.STRING, description: '선택지 A' },
          choice_b: { type: SchemaType.STRING, description: '선택지 B' },
        },
        required: ['prompt', 'choice_a', 'choice_b'],
      },
      reasoning: {
        type: SchemaType.STRING,
        description: '이 설정을 선택한 이유 설명',
      },
    },
    required: ['routeActivationRatio', 'endingCheckRatio', 'narrativePhaseRatios', 'actionPointsPerDay', 'criticalStatThreshold', 'warningStatThreshold', 'routeScores', 'tokenBudgetMultiplier', 'useGenreFallback', 'reasoning'],
  },

  // ==========================================================================
  // 이머전트 내러티브 (EmergentNarrative)
  // ==========================================================================
  emergent_narrative: {
    type: SchemaType.OBJECT,
    properties: {
      enabled: {
        type: SchemaType.BOOLEAN,
        description: '이머전트 내러티브 활성화 여부',
      },
      triggers: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            triggerId: { type: SchemaType.STRING, description: '트리거 ID (영문, 예: trigger_alliance_reveal)' },
            name: { type: SchemaType.STRING, description: '트리거 이름 (한글, 내부 식별용)' },
            conditions: {
              type: SchemaType.OBJECT,
              properties: {
                charactersMetTogether: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: '함께 만나야 하는 캐릭터 조합',
                },
                relationshipsDiscovered: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: '발견해야 하는 관계 (예: "캐릭터A-캐릭터B")',
                },
                flagCombination: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: '획득해야 하는 플래그 조합',
                },
                statConditions: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      statId: { type: SchemaType.STRING },
                      comparison: { type: SchemaType.STRING, format: 'enum', enum: ['gte', 'lte', 'eq'] },
                      value: { type: SchemaType.INTEGER },
                    },
                    required: ['statId', 'comparison', 'value'],
                  },
                  description: '스탯 조건',
                },
                dayRange: {
                  type: SchemaType.OBJECT,
                  properties: {
                    min: { type: SchemaType.INTEGER, description: '최소 일차' },
                    max: { type: SchemaType.INTEGER, description: '최대 일차' },
                  },
                  description: '발동 가능 일차 범위',
                },
                requiredTriggers: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: '선행 트리거 ID 목록',
                },
              },
            },
            generatedEvent: {
              type: SchemaType.OBJECT,
              properties: {
                eventType: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['revelation', 'confrontation', 'alliance', 'betrayal', 'discovery'],
                  description: '이벤트 유형',
                },
                eventSeed: { type: SchemaType.STRING, description: 'AI에게 전달할 이벤트 시드 (150자 이내)' },
                involvedCharacters: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: '관련 캐릭터들',
                },
                tone: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['dramatic', 'subtle', 'comedic', 'tragic'],
                  description: '이벤트 톤',
                },
              },
              required: ['eventType', 'eventSeed', 'involvedCharacters', 'tone'],
            },
            oneTime: { type: SchemaType.BOOLEAN, description: '1회성 여부 (true 권장)' },
          },
          required: ['triggerId', 'name', 'conditions', 'generatedEvent', 'oneTime'],
        },
        description: '스토리 시프팅 트리거 목록 (3-6개 권장)',
      },
      dynamicEventGuidelines: {
        type: SchemaType.STRING,
        description: 'AI가 동적 이벤트 생성 시 참고할 가이드라인',
      },
      reasoning: {
        type: SchemaType.STRING,
        description: '이 설정을 선택한 이유 설명',
      },
    },
    required: ['enabled', 'triggers', 'dynamicEventGuidelines', 'reasoning'],
  },
};

// 카테고리별 최적 temperature 설정
// 창의적 작업: 0.7-0.9, 구조적 작업: 0.3-0.5
const CATEGORY_TEMPERATURE: Record<GenerationCategory, number> = {
  scenario_overview: 0.8, // 창의적 - 독특한 시나리오 생성
  characters: 0.75, // 창의적 - 개성있는 캐릭터
  relationships: 0.5, // 중간 - 논리적이면서 흥미로운 관계
  stats: 0.3, // 구조적 - 일관된 게임 시스템
  flags: 0.4, // 구조적 - 명확한 플래그 명명
  endings: 0.6, // 중간 - 다양하면서 일관된 엔딩
  traits: 0.5, // 중간 - 균형잡힌 특성
  keywords: 0.6, // 중간 - 적절한 키워드
  genre: 0.4, // 구조적 - 정확한 장르 분류
  idea_suggestions: 0.9, // 매우 창의적 - 다양하고 독특한 아이디어
  // 스토리 오프닝 시스템 (Phase 7)
  story_opening: 0.75, // 창의적 - 몰입감 있는 오프닝 생성
  character_introductions: 0.65, // 중간 - 캐릭터 맥락에 맞는 소개
  hidden_relationships: 0.6, // 중간 - 흥미로우면서 논리적인 숨겨진 관계
  character_revelations: 0.65, // 중간 - 점진적 공개 레이어 설계
  // 게임플레이 설정
  gameplay_config: 0.4, // 구조적 - 일관된 게임 밸런스 설정
  // 이머전트 내러티브
  emergent_narrative: 0.7, // 창의적 - 흥미로운 트리거 조합 생성
};

// 카테고리별 maxOutputTokens 설정
const CATEGORY_MAX_TOKENS: Record<GenerationCategory, number> = {
  scenario_overview: 2000,
  characters: 4000, // 여러 캐릭터 생성
  relationships: 3000, // 다수의 관계
  stats: 2000,
  flags: 3000, // 8-12개 플래그
  endings: 4000, // 여러 엔딩 + 조건
  traits: 3000, // 버프/디버프 각 3-4개
  keywords: 1000, // 간단한 목록
  genre: 1000, // 간단한 목록
  idea_suggestions: 2000, // 여러 아이디어
  // 스토리 오프닝 시스템 (Phase 7)
  story_opening: 3000, // 프롤로그, 촉발 사건, 주인공 설정 포함
  character_introductions: 3000, // 캐릭터별 소개 시퀀스
  hidden_relationships: 4000, // 복잡한 숨겨진 관계 구조
  character_revelations: 4000, // 캐릭터별 다중 레이어 공개
  // 게임플레이 설정
  gameplay_config: 3000, // 루트 점수 설정 + 설명
  // 이머전트 내러티브
  emergent_narrative: 4000, // 복잡한 트리거 조건 + 이벤트
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
    existingFlags?: string[];
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
  ${context.existingFlags?.length ? `<existing_flags>${context.existingFlags.join(', ')}</existing_flags>` : ''}
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

    flags: {
      systemPrompt: `<role>게임 시스템 디자이너</role>

<task>시나리오 진행을 추적할 이벤트 플래그를 설계합니다.</task>

<guidelines>
  <guideline>flagName은 FLAG_ 접두사 + 영문 대문자 (예: FLAG_SECRET_DISCOVERED)</guideline>
  <guideline>type은 boolean(참/거짓) 또는 count(횟수)</guideline>
  <guideline>description은 한글 50자 이내</guideline>
  <guideline>triggerCondition은 플래그가 활성화되는 조건 설명</guideline>
</guidelines>

<route_system>
게임에는 3가지 주요 루트가 있으며, 각 루트 플래그를 반드시 포함해야 합니다:

<route name="탈출 (Escape)">
위험을 피해 안전한 곳으로 이동하는 선택
예시: FLAG_ESCAPE_ROUTE_FOUND, FLAG_VEHICLE_SECURED, FLAG_EXIT_DISCOVERED
</route>

<route name="항전 (Defense)">
현재 위치를 지키고 방어하는 선택
예시: FLAG_DEFENSES_COMPLETE, FLAG_RESOURCE_STOCKPILE, FLAG_TERRITORY_SECURED
</route>

<route name="협상 (Negotiation)">
외부 세력과 협력하거나 대화로 해결하는 선택
예시: FLAG_ALLY_NETWORK_FORMED, FLAG_PEACE_TREATY, FLAG_CONTACT_ESTABLISHED
</route>
</route_system>

<other_flags>FLAG_SECRET_DISCOVERED, FLAG_BETRAYAL_REVEALED, FLAG_LEADER_CHOSEN, FLAG_CRITICAL_DECISION</other_flags>

<design_tips>
- 모든 플래그는 엔딩 조건에서 사용될 수 있어야 합니다.
- 플래그명에서 의미를 명확히 알 수 있도록 작성하세요.
- triggerCondition은 AI가 플래그를 부여할 시점을 판단하는 데 사용됩니다.
</design_tips>`,
      userPrompt: `<request>다음 시나리오에 적합한 8-12개의 플래그를 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<important_instructions>
- 탈출/항전/협상 3가지 루트에 맞는 플래그를 각각 2개 이상 포함해주세요.
- 각 플래그는 엔딩 조건으로 사용될 수 있어야 합니다.
- triggerCondition을 구체적으로 작성하여 AI가 부여 시점을 명확히 알 수 있게 하세요.
</important_instructions>`,
    },

    endings: {
      systemPrompt: `<role>내러티브 디자이너</role>

<task>시나리오의 다양한 엔딩과 그 달성 조건을 설계합니다.</task>

<guidelines>
  <guideline>endingId는 ENDING_ 접두사 + 영문 대문자 (예: ENDING_TRIUMPH)</guideline>
  <guideline>title은 한글 엔딩 제목</guideline>
  <guideline>description은 100-200자 엔딩 설명</guideline>
  <guideline>isGoalSuccess: true(목표 달성) 또는 false(실패)</guideline>
  <guideline>suggestedConditions에 스탯과 플래그 조건 포함</guideline>
</guidelines>

<comparison_operators>>=, <=, ==, >, <, !=</comparison_operators>

<ending_balance>
좋은 엔딩(isGoalSuccess: true)과 나쁜 엔딩(isGoalSuccess: false)을 균형있게 포함하세요.
루트별 엔딩(탈출 성공, 항전 승리, 협상 타결)과 실패 엔딩을 모두 고려하세요.
</ending_balance>

<critical_constraint>
**중요**: suggestedConditions에 사용하는 statId와 flagName은 반드시 시나리오에 이미 정의된 것만 사용해야 합니다.
- 존재하지 않는 스탯 ID를 사용하면 게임에서 엔딩 조건 검증이 실패합니다.
- 존재하지 않는 플래그를 사용하면 해당 엔딩에 도달할 수 없습니다.
- context에서 제공되는 existing_stats와 existing_flags 목록을 참조하여 해당 ID만 사용하세요.
</critical_constraint>

<condition_design_tips>
- 하나의 엔딩에 스탯 조건 1-2개와 플래그 조건 0-2개가 적당합니다.
- 동일 스탯에 상충되는 조건을 넣지 마세요 (예: >= 80 AND <= 20)
- 좋은 엔딩은 높은 스탯 요구, 나쁜 엔딩은 낮은 스탯이나 특정 실패 플래그로 구분하세요.
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
        "stats": [{ "statId": "morale", "comparison": ">=", "value": 60 }],
        "flags": ["FLAG_ESCAPE_VEHICLE_SECURED"]
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
- **반드시** existing_stats와 existing_flags에 있는 ID만 사용하세요. 새로운 ID를 만들지 마세요.
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

<critical>firstCharacterToMeet은 context의 existing_characters에 있는 이름과 정확히 일치해야 합니다.</critical>`,
    },

    // ========================================================================
    // 2025 Enhanced: 1:1 캐릭터 소개 시퀀스
    // ========================================================================
    character_introductions: {
      systemPrompt: `<role>캐릭터 등장 시퀀스 디자이너</role>

<task>각 캐릭터가 주인공을 1:1로 만나는 순서와 맥락을 설계합니다. 영화적 구성으로 각 만남을 기억에 남게 만들어주세요.</task>

<principles>
- 각 캐릭터의 첫 등장은 그 인물의 성격과 역할을 암시해야 합니다.
- 만남의 순서는 스토리 전개상 자연스러워야 합니다.
- 첫인상 키워드는 AI가 캐릭터를 묘사할 때 참조합니다.
</principles>

<timing_guidelines>
- opening: 오프닝 시퀀스에서 만남 (촉발 사건 직후)
- day1: 1일차 중 만남
- day2: 2일차 이후 만남
- event-driven: 특정 이벤트/조건 충족 시 만남
</timing_guidelines>

<encounter_context_tips>
- 캐릭터의 역할에 맞는 상황에서 만나게 하세요 (의사는 치료 상황, 군인은 방어 상황 등)
- 첫 만남에서 갈등이나 긴장감이 있으면 더 기억에 남습니다.
- 단순한 소개보다 상호작용이 있는 만남이 좋습니다.
</encounter_context_tips>`,
      userPrompt: `<request>다음 캐릭터들의 1:1 소개 시퀀스를 설계해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- **반드시** existing_characters 목록에 있는 캐릭터 이름만 사용
- 모든 캐릭터에 대해 소개 순서 지정 (order: 1, 2, 3...)
- 각 만남의 구체적인 맥락 작성 (encounterContext)
- 첫인상 키워드 2-3개 (성격, 외모, 분위기 등)
- 만남 예상 시점 지정 (opening/day1/day2/event-driven)
- characterName 철자가 existing_characters와 정확히 일치해야 함
</requirements>`,
    },

    // ========================================================================
    // 2025 Enhanced: 숨겨진 NPC 관계 시스템
    // ========================================================================
    hidden_relationships: {
      systemPrompt: `<role>숨겨진 관계 설계자</role>

<task>NPC들 간의 비밀 관계를 설계합니다. 플레이어(주인공)는 게임 시작 시 이 관계들을 모르며, 탐색과 대화를 통해 점진적으로 발견합니다.</task>

<relationship_types>
- 과거 연인 / 전 배우자
- 비밀 동료 / 공모자
- 가족 관계 (숨겨진)
- 원수 / 적대 관계
- 빚진 관계 / 은혜
- 비밀 협정 / 거래
</relationship_types>

<discovery_methods>
- dialogue: 특정 캐릭터와의 대화에서 힌트
- exploration: 특정 장소 탐색 시 단서 발견
- observation: 두 캐릭터가 함께 있을 때 관찰
- event: 특정 이벤트 발생 시 드러남
- item: 아이템(편지, 사진 등) 발견 시
</discovery_methods>

<design_principles>
- 숨겨진 관계는 스토리 전개에 영향을 주어야 합니다.
- 발견했을 때 "아하!" 모먼트가 있어야 합니다.
- 너무 쉽게 발견되어서도, 너무 어려워서도 안 됩니다.
- 힌트는 미묘하지만 돌이켜보면 납득이 가는 수준으로.
</design_principles>`,
      userPrompt: `<request>다음 캐릭터들 간의 숨겨진 관계를 설계해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- **반드시** existing_characters 목록에 있는 캐릭터 이름만 사용
- characterA와 characterB는 existing_characters와 정확히 일치해야 함
- 캐릭터 수에 따라 2-4개의 숨겨진 관계 설계
- 각 관계의 배경 스토리 상세히 작성
- 발견 힌트와 발견 방법 지정
- 초기 visibility는 hidden 또는 hinted로 설정
- relationId는 REL_001, REL_002 형식으로
</requirements>

<critical>characterA와 characterB에 사용하는 이름은 반드시 context의 existing_characters에 있는 이름과 정확히 일치해야 합니다. 새로운 캐릭터 이름을 만들지 마세요.</critical>`,
    },

    // ========================================================================
    // 2025 Enhanced: 점진적 캐릭터 공개 시스템
    // ========================================================================
    character_revelations: {
      systemPrompt: `<role>캐릭터 심층 설계자</role>

<task>각 캐릭터의 숨겨진 면을 신뢰도에 따라 단계적으로 공개하도록 설계합니다. 플레이어와의 관계가 깊어질수록 더 깊은 비밀이 드러납니다.</task>

<revelation_types>
- personality: 겉으로 드러나지 않는 성격 측면
- backstory: 과거 사연
- secret: 숨기고 있는 비밀
- motivation: 진짜 동기, 목적
- relationship: 다른 인물과의 관계
</revelation_types>

<revelation_styles>
- direct: 직접 말해줌 ("사실 나는...")
- subtle: 행동이나 대화에서 자연스럽게 드러남
- accidental: 실수로 드러남 (말실수, 물건 발견 등)
- confession: 감정적 순간에 고백
</revelation_styles>

<trust_thresholds>
- -50 이하: 적대적 - 숨기려 함
- -20 ~ 20: 중립 - 표면적 정보만
- 20 ~ 50: 우호적 - 일부 개인 정보 공개
- 50 ~ 70: 친밀 - 과거사, 고민 공유
- 70 ~ 90: 깊은 신뢰 - 비밀 공유
- 90 이상: 완전한 신뢰 - 궁극의 비밀
</trust_thresholds>

<design_tips>
- 각 캐릭터마다 3-5개의 공개 레이어 설계
- 낮은 신뢰도에서 공개되는 정보는 표면적인 것
- 높은 신뢰도의 비밀은 캐릭터의 핵심과 연결
- ultimateSecret은 시나리오 전체에 영향을 줄 수 있는 중대한 비밀
</design_tips>`,
      userPrompt: `<request>다음 캐릭터들의 점진적 공개 레이어를 설계해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- **반드시** existing_characters 목록에 있는 캐릭터 이름만 사용
- characterName은 existing_characters와 정확히 일치해야 함
- 각 캐릭터마다 3-5개의 revelationLayers 설계
- 신뢰도 임계값은 점진적으로 증가 (예: 20, 40, 60, 80)
- 각 레이어의 공개 내용은 구체적으로 (50-100자)
- ultimateSecret은 가장 높은 신뢰도에서만 공개되는 핵심 비밀
- 공개 방식(revelationStyle)은 내용에 맞게 선택
</requirements>

<critical>characterName에 사용하는 이름은 반드시 context의 existing_characters에 있는 이름과 정확히 일치해야 합니다. 새로운 캐릭터 이름을 만들지 마세요.</critical>`,
    },

    // ========================================================================
    // 게임플레이 설정 (GameplayConfig)
    // ========================================================================
    gameplay_config: {
      systemPrompt: `<role>인터랙티브 게임 밸런스 설계자</role>

<task>시나리오의 특성(장르, 총 일수, 플래그, 스탯)에 맞는 최적의 게임플레이 설정을 생성합니다.</task>

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

7. **routeScores**: 루트별 점수 설정
   - 각 루트에 관련된 플래그를 매핑
   - 중요 플래그: 40-50점
   - 보조 플래그: 20-30점
   - 기본 플래그: 10-20점

8. **tokenBudgetMultiplier** (0.8~1.5): AI 토큰 예산 배수
   - 복잡한 시나리오: 1.2-1.5
   - 단순한 시나리오: 0.8-1.0

9. **useGenreFallback**: 장르 기반 폴백 선택지 사용 여부

10. **customFallbackChoices** (선택): 시나리오 맞춤 폴백 선택지
</gameplay_config_parameters>

<route_design_principles>
- 일반적으로 3개의 루트를 설계합니다: 탈출형, 방어형, 협상형
- 각 루트는 2-4개의 관련 플래그로 구성됩니다
- 플래그 점수 합계가 가장 높은 루트가 현재 루트로 표시됩니다
- 시나리오 특성에 따라 루트 이름과 구성을 조정하세요
</route_design_principles>

<genre_specific_tips>
- **액션/스릴러**: 높은 AP(4-5), 낮은 위험 임계값, 빠른 루트 활성화
- **미스터리/추리**: 낮은 AP(2-3), 느린 서사 전개, 높은 엔딩 체크 비율
- **호러/서바이벌**: 중간 AP, 높은 위험 임계값, 빠른 엔딩 체크
- **드라마/로맨스**: 낮은 AP(2-3), 느린 전개, 캐릭터 관계 중심
- **SF/판타지**: 높은 토큰 예산, 복잡한 루트 구조
</genre_specific_tips>`,
      userPrompt: `<request>다음 시나리오에 최적화된 게임플레이 설정을 생성해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- 시나리오의 장르, 분위기, 페이스에 맞는 설정 선택
- **반드시** existing_flags에 있는 플래그만 routeScores에 사용
- **반드시** existing_stats에 있는 스탯만 statScores에 사용 (사용하는 경우)
- 플래그를 탈출/방어/협상 등의 루트로 분류
- 각 설정값에 대한 이유를 reasoning에 설명
- customFallbackChoices는 시나리오 특성이 기본 장르 폴백과 맞지 않을 때만 제공
</requirements>

<critical>
- routeScores의 flagName은 existing_flags 목록에 있는 값만 사용
- statScores를 사용할 경우 existing_stats 목록에 있는 statId만 사용
</critical>`,
    },

    // ========================================================================
    // 이머전트 내러티브 (EmergentNarrative)
    // ========================================================================
    emergent_narrative: {
      systemPrompt: `<role>이머전트 내러티브 설계자</role>

<task>플레이어의 행동 조합에서 자연스럽게 발생하는 동적 스토리 이벤트 트리거를 설계합니다.</task>

<concept>
이머전트 내러티브는 개발자가 직접 작성하지 않은 스토리 이벤트가 플레이어의 선택 조합에서 자연스럽게 "창발"하는 시스템입니다.
예: 플레이어가 캐릭터 A와 B를 모두 만나고, 특정 플래그를 획득하면 → A와 B의 과거 관계가 드러나는 이벤트 발생
</concept>

<trigger_design>
각 트리거는 다음 요소로 구성됩니다:
1. **triggerId**: 영문 식별자 (예: trigger_alliance_reveal, trigger_betrayal_hint)
2. **name**: 한글 이름 (예: "동맹 관계 폭로", "배신의 조짐")
3. **conditions**: 발동 조건들
   - charactersMetTogether: 특정 캐릭터들을 모두 만났을 때
   - relationshipsDiscovered: 특정 관계를 발견했을 때
   - flagCombination: 특정 플래그들이 모두 활성화되었을 때
   - statConditions: 스탯이 특정 조건을 만족할 때
   - dayRange: 특정 일차 범위에서만 발동
   - requiredTriggers: 선행 트리거가 발동된 후에만 발동
4. **generatedEvent**: 발동 시 생성될 이벤트
   - eventType: revelation(폭로), confrontation(대립), alliance(동맹), betrayal(배신), discovery(발견)
   - eventSeed: AI가 이벤트 생성 시 참고할 시드 텍스트
   - involvedCharacters: 관련 캐릭터들
   - tone: dramatic(극적), subtle(은근), comedic(코믹), tragic(비극적)
5. **oneTime**: 1회성 여부 (대부분 true 권장)
</trigger_design>

<event_types>
- **revelation**: 숨겨진 정보가 드러남 (과거사, 비밀 관계)
- **confrontation**: 캐릭터 간 대립/충돌 발생
- **alliance**: 예상치 못한 협력 관계 형성
- **betrayal**: 배신이나 이중 정체 폭로
- **discovery**: 중요한 물건/정보/장소 발견
</event_types>

<design_principles>
- 3-6개의 트리거 설계 (너무 많으면 복잡해짐)
- 조건은 달성 가능하되 너무 쉽지 않게
- 이벤트는 스토리에 영향을 주되 게임을 망치지 않게
- 트리거 간 연쇄 가능하도록 설계 (requiredTriggers 활용)
- 장르 톤에 맞는 이벤트 유형 선택
</design_principles>`,
      userPrompt: `<request>다음 시나리오에 맞는 이머전트 내러티브 트리거를 설계해주세요.</request>

<scenario_context>
${input}
</scenario_context>
${baseContext}

<requirements>
- enabled는 항상 true로 설정
- 3-6개의 트리거 설계
- **반드시** existing_characters 목록에 있는 캐릭터 이름만 사용
- **반드시** existing_flags 목록에 있는 플래그만 flagCombination에 사용
- **반드시** existing_stats 목록에 있는 스탯만 statConditions에 사용
- eventSeed는 구체적이고 AI가 이벤트 생성 시 참고할 수 있도록 작성 (150자 이내)
- dynamicEventGuidelines는 전반적인 이벤트 생성 가이드라인 (200자 이내)
- reasoning에 설계 의도 설명
</requirements>

<critical>
- charactersMetTogether, involvedCharacters는 existing_characters에 있는 이름만 사용
- flagCombination은 existing_flags에 있는 플래그만 사용
- statConditions의 statId는 existing_stats에 있는 ID만 사용
</critical>`,
    },
  };

  return prompts[category];
};

export async function POST(request: NextRequest) {
  try {
    const body: AIGenerateRequestBody = await request.json();
    const { category, input, context } = body;

    // idea_suggestions, gameplay_config, emergent_narrative는 빈 입력 허용 (컨텍스트 기반 자동 생성)
    const categoriesAllowingEmptyInput = ['idea_suggestions', 'gameplay_config', 'emergent_narrative'];
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
