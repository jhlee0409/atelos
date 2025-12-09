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
  | 'idea_suggestions';

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
          },
          required: ['idea', 'genre', 'hook'],
        },
        description: '시나리오 아이디어 목록',
      },
    },
    required: ['ideas'],
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

<note>각 캐릭터 쌍마다 양방향(A→B, B→A) 관계를 정의해주세요.</note>`,
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
${baseContext}`,
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

<other_flags>FLAG_SECRET_DISCOVERED, FLAG_BETRAYAL_REVEALED, FLAG_LEADER_CHOSEN, FLAG_CRITICAL_DECISION</other_flags>`,
      userPrompt: `<request>다음 시나리오에 적합한 8-12개의 플래그를 제안해주세요.</request>

<scenario>${input}</scenario>
${baseContext}

<important>탈출/항전/협상 3가지 루트에 맞는 플래그를 각각 2개 이상 포함해주세요.</important>`,
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

<note>좋은 엔딩과 나쁜 엔딩을 균형있게 포함해주세요.</note>`,
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
</guidelines>

<genre_pool>
포스트아포칼립스, SF, 판타지, 호러, 미스터리, 스릴러, 심리, 서바이벌, 역사, 현대, 로맨스, 범죄, 정치, 군사, 사이버펑크, 디스토피아
</genre_pool>

<example>
{
  "ideas": [
    {
      "idea": "좀비 아포칼립스 속 아파트 단지에서 30명의 생존자를 이끌며 7일간 구조대를 기다린다.",
      "genre": "포스트아포칼립스, 서바이벌",
      "hook": "모두를 살릴 수 없는 상황에서의 선택"
    },
    {
      "idea": "1920년대 호화 열차에서 벌어진 살인 사건의 범인을 찾는 탐정이 되어 승객들을 심문한다.",
      "genre": "미스터리, 역사",
      "hook": "제한된 시간과 공간 속 추리"
    },
    {
      "idea": "우주 정거장에서 산소가 고갈되기 전 탈출 방법을 찾아야 하는 엔지니어가 된다.",
      "genre": "SF, 스릴러",
      "hook": "극한 상황에서의 문제 해결"
    }
  ]
}
</example>`,
      userPrompt: `<request>인터랙티브 게임에 적합한 시나리오 아이디어를 6-8개 제안해주세요.</request>

<preference>${input || '다양한 장르'}</preference>

<requirements>
  <requirement>서로 다른 장르와 설정을 가진 다양한 아이디어</requirement>
  <requirement>플레이어가 주인공으로 선택을 내리는 상황</requirement>
  <requirement>간단하지만 흥미를 끄는 핵심 설정</requirement>
</requirements>`,
    },
  };

  return prompts[category];
};

export async function POST(request: NextRequest) {
  try {
    const body: AIGenerateRequestBody = await request.json();
    const { category, input, context } = body;

    if (!category || !input) {
      return NextResponse.json(
        { error: 'category와 input은 필수입니다.' },
        { status: 400 },
      );
    }

    const { systemPrompt, userPrompt } = getCategoryPrompt(
      category,
      input,
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
    console.log(`📝 [AI Generate] 입력: ${input.substring(0, 100)}...`);

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
