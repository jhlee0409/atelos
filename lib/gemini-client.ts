// 제미나이 API 호출 인터페이스
export interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// API Route를 통한 제미나이 API 호출 함수
export const callGeminiAPI = async ({
  systemPrompt,
  userPrompt,
  model = 'gemini-2.5-flash-lite',
  temperature = 0.5,
  maxTokens = 2000,
}: GeminiRequest): Promise<GeminiResponse> => {
  try {
    console.log('🤖 제미나이 API 호출 시작...');
    console.log('📝 시스템 프롬프트:', systemPrompt.substring(0, 200) + '...');
    console.log('👤 사용자 프롬프트:', userPrompt.substring(0, 200) + '...');

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        model,
        temperature,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ 제미나이 API 응답 성공');
    console.log('📄 응답 길이:', data.text.length, '문자');

    if (data.usage) {
      console.log('📊 토큰 사용량:', data.usage);
    }

    return {
      text: data.text,
      usage: data.usage,
    };
  } catch (error) {
    console.error('❌ 제미나이 API 호출 실패:', error);

    // 에러 타입별 처리
    if (error instanceof Error) {
      throw new Error(`제미나이 API 오류: ${error.message}`);
    }

    throw new Error('제미나이 API 호출 중 알 수 없는 오류가 발생했습니다.');
  }
};

/**
 * 잘못된 이스케이프 시퀀스 수정
 * JSON에서 허용되는 이스케이프: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
 * AI가 생성하는 \... \( \) 같은 잘못된 시퀀스를 수정
 */
const fixInvalidEscapeSequences = (text: string): string => {
  // 잘못된 이스케이프 시퀀스를 수정
  // JSON 표준에서 허용되는 이스케이프: " \ / b f n r t uXXXX
  let fixed = text;

  // \. \( \) \[ \] \{ \} \: \; \, \' \! \? \- \_ \= \+ \# \@ \$ \% \^ \& \* \~ \` 등을 수정
  // 역슬래시 뒤에 JSON에서 허용되지 않는 문자가 오면 역슬래시 제거
  fixed = fixed.replace(/\\(?!["\\/bfnrtu])/g, (match) => {
    // \u 다음에 4자리 16진수가 아닌 경우도 처리
    return '';
  });

  // \u 다음에 정확히 4자리 16진수가 아닌 경우 처리
  fixed = fixed.replace(/\\u(?![0-9a-fA-F]{4})/g, 'u');

  return fixed;
};

/**
 * 문자열 필드 내부의 제어 문자 제거
 */
const removeControlCharacters = (text: string): string => {
  // JSON 문자열 내에서 허용되지 않는 제어 문자 제거 (U+0000 ~ U+001F, 단 \t \n \r 제외)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

/**
 * 마크다운 코드 블록에서 JSON 추출
 */
const extractJsonFromMarkdown = (text: string): string => {
  // ```json ... ``` 또는 ``` ... ``` 패턴에서 JSON 추출
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return text;
};

/**
 * 정규식 기반 JSON 필드 추출 (최후의 폴백)
 * JSON 파싱이 완전히 실패할 경우 정규식으로 필수 필드 추출
 */
const extractFieldsWithRegex = <T>(text: string): T | null => {
  try {
    // log 필드 추출
    const logMatch = text.match(/"log"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const log = logMatch ? logMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '';

    // dilemma.prompt 추출
    const promptMatch = text.match(/"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const prompt = promptMatch ? promptMatch[1].replace(/\\"/g, '"') : '다음 행동을 선택하세요.';

    // choice_a 추출
    const choiceAMatch = text.match(/"choice_a"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const choice_a = choiceAMatch ? choiceAMatch[1].replace(/\\"/g, '"') : '신중하게 상황을 지켜본다';

    // choice_b 추출
    const choiceBMatch = text.match(/"choice_b"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const choice_b = choiceBMatch ? choiceBMatch[1].replace(/\\"/g, '"') : '즉시 행동에 나선다';

    // scenarioStats 추출 (간단한 숫자 값들)
    const scenarioStats: { [key: string]: number } = {};
    const statsMatch = text.match(/"scenarioStats"\s*:\s*\{([^}]*)\}/);
    if (statsMatch) {
      const statsContent = statsMatch[1];
      const statPattern = /"(\w+)"\s*:\s*(-?\d+)/g;
      let statPairMatch;
      while ((statPairMatch = statPattern.exec(statsContent)) !== null) {
        scenarioStats[statPairMatch[1]] = parseInt(statPairMatch[2], 10);
      }
    }

    // survivorStatus 추출
    const survivorStatus: { name: string; newStatus: string }[] = [];
    const statusPattern = /"name"\s*:\s*"([^"]*)"\s*,\s*"newStatus"\s*:\s*"([^"]*)"/g;
    let statusMatch;
    while ((statusMatch = statusPattern.exec(text)) !== null) {
      survivorStatus.push({ name: statusMatch[1], newStatus: statusMatch[2] });
    }

    // flags_acquired 추출
    const flags_acquired: string[] = [];
    const flagsMatch = text.match(/"flags_acquired"\s*:\s*\[(.*?)\]/);
    if (flagsMatch) {
      const flagPattern = /"([^"]+)"/g;
      let flagMatch;
      while ((flagMatch = flagPattern.exec(flagsMatch[1])) !== null) {
        flags_acquired.push(flagMatch[1]);
      }
    }

    // shouldAdvanceTime 추출
    const shouldAdvanceMatch = text.match(/"shouldAdvanceTime"\s*:\s*(true|false)/);
    const shouldAdvanceTime = shouldAdvanceMatch ? shouldAdvanceMatch[1] === 'true' : false;

    const result = {
      log,
      dilemma: {
        prompt,
        choice_a,
        choice_b,
      },
      statChanges: {
        scenarioStats,
        survivorStatus,
        hiddenRelationships_change: [],
        flags_acquired,
        shouldAdvanceTime,
      },
    };

    console.log('🔧 정규식 기반 필드 추출 완료');
    return result as T;
  } catch (error) {
    console.error('❌ 정규식 기반 추출도 실패:', error);
    return null;
  }
};

/**
 * 깨진 JSON 문자열 복구 시도
 */
const tryRepairJson = (text: string): string => {
  let repaired = text;

  // 1. 후행 쉼표 제거 (,} 또는 ,])
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // 2. 누락된 쉼표 추가 ("}{ 또는 "][)
  repaired = repaired.replace(/}(\s*){/g, '},\n{');
  repaired = repaired.replace(/](\s*)\[/g, '],\n[');

  // 3. 불완전한 문자열 닫기 (끝에 "가 없는 경우)
  // 마지막 필드가 열린 채로 끝나면 닫아줌
  if (repaired.match(/"[^"]*$/)) {
    repaired = repaired + '"';
  }

  // 4. 누락된 닫는 괄호 추가
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    repaired = repaired + '}'.repeat(openBraces - closeBraces);
  }

  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  if (openBrackets > closeBrackets) {
    repaired = repaired + ']'.repeat(openBrackets - closeBrackets);
  }

  return repaired;
};

// JSON 응답 파싱 유틸리티 (강화된 버전)
export const parseGeminiJsonResponse = <T>(response: GeminiResponse): T => {
  const parsingStrategies: { name: string; transform: (text: string) => string }[] = [
    // 1단계: 기본 전처리
    {
      name: '기본 전처리',
      transform: (text) => {
        let cleaned = text.trim();
        // 숫자 앞의 + 기호 제거
        cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
        return cleaned;
      },
    },
    // 2단계: 마크다운 제거 + 기본 전처리
    {
      name: '마크다운 제거',
      transform: (text) => {
        let cleaned = extractJsonFromMarkdown(text);
        cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
        return cleaned.trim();
      },
    },
    // 3단계: 잘못된 이스케이프 시퀀스 수정
    {
      name: '이스케이프 시퀀스 수정',
      transform: (text) => {
        let cleaned = extractJsonFromMarkdown(text);
        cleaned = fixInvalidEscapeSequences(cleaned);
        cleaned = removeControlCharacters(cleaned);
        cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
        return cleaned.trim();
      },
    },
    // 4단계: JSON 복구 시도
    {
      name: 'JSON 복구',
      transform: (text) => {
        let cleaned = extractJsonFromMarkdown(text);
        cleaned = fixInvalidEscapeSequences(cleaned);
        cleaned = removeControlCharacters(cleaned);
        cleaned = tryRepairJson(cleaned);
        cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
        return cleaned.trim();
      },
    },
    // 5단계: 특수문자 완전 제거
    {
      name: '특수문자 완전 제거',
      transform: (text) => {
        let cleaned = extractJsonFromMarkdown(text);
        // 모든 역슬래시를 공백으로 대체 (극단적 조치)
        cleaned = cleaned.replace(/\\/g, '');
        cleaned = removeControlCharacters(cleaned);
        cleaned = tryRepairJson(cleaned);
        cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
        return cleaned.trim();
      },
    },
  ];

  console.log('🔄 JSON 파싱 전처리 완료');

  // 각 전략을 순차적으로 시도
  for (const strategy of parsingStrategies) {
    try {
      const transformedText = strategy.transform(response.text);
      const result = JSON.parse(transformedText);

      if (strategy.name !== '기본 전처리') {
        console.log(`✅ "${strategy.name}" 전략으로 파싱 성공`);
      }

      return result;
    } catch {
      // 다음 전략 시도
      continue;
    }
  }

  // 모든 JSON 파싱 전략 실패 시 정규식 기반 추출 시도
  console.warn('⚠️ 모든 JSON 파싱 전략 실패, 정규식 기반 추출 시도...');
  console.log('📄 원본 응답:', response.text.substring(0, 500) + '...');

  const regexResult = extractFieldsWithRegex<T>(response.text);
  if (regexResult) {
    console.log('✅ 정규식 기반 추출 성공');
    return regexResult;
  }

  // 최종 실패
  console.error('❌ 모든 파싱 방법 실패');
  console.log('📄 전체 원본 응답:', response.text);

  throw new Error('제미나이 응답을 JSON으로 파싱할 수 없습니다.');
};

// 제미나이 연결 테스트 함수
export const testGeminiConnection = async (): Promise<boolean> => {
  try {
    const response = await callGeminiAPI({
      systemPrompt: '당신은 도움이 되는 AI 어시스턴트입니다.',
      userPrompt:
        '간단한 JSON 형태로 {"status": "ok", "message": "연결 성공"}을 반환해주세요.',
      maxTokens: 100,
    });

    const parsed = parseGeminiJsonResponse<{ status: string; message: string }>(
      response,
    );
    return parsed.status === 'ok';
  } catch (error) {
    console.error('제미나이 연결 테스트 실패:', error);
    return false;
  }
};
