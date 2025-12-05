// 시놉시스 생성 API 클라이언트

export interface SynopsisGenerateRequest {
  idea: string;
  tone?: 'dark' | 'hopeful' | 'thriller' | 'dramatic' | 'comedic';
  setting?: string;
  targetLength?: 'short' | 'medium' | 'long';
}

export interface SynopsisResult {
  title: string;
  scenarioId: string;
  synopsis: string;
  playerGoal: string;
  genre: string[];
  coreKeywords: string[];
  setting: {
    time: string;
    place: string;
    atmosphere: string;
  };
  suggestedThemes: string[];
  conflictType: string;
  narrativeHooks: string[];
}

export interface SynopsisGenerateResponse {
  success: boolean;
  data: SynopsisResult;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateSynopsis(
  request: SynopsisGenerateRequest,
): Promise<SynopsisGenerateResponse> {
  const response = await fetch('/api/admin/ai-generate/synopsis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시놉시스 생성에 실패했습니다.');
  }

  return response.json();
}

// 톤 옵션
export const TONE_OPTIONS = [
  { value: 'dark', label: '어두운', description: '절망적인 분위기, 생존과 도덕적 딜레마' },
  { value: 'hopeful', label: '희망적', description: '성장 서사, 역경을 이겨내는 이야기' },
  { value: 'thriller', label: '스릴러', description: '긴장감 넘치는 서스펜스' },
  { value: 'dramatic', label: '드라마틱', description: '감정적 깊이와 인물 간 갈등' },
  { value: 'comedic', label: '유머러스', description: '풍자적 요소 포함' },
] as const;

// 길이 옵션
export const LENGTH_OPTIONS = [
  { value: 'short', label: '짧게', description: '100-200자' },
  { value: 'medium', label: '보통', description: '200-400자' },
  { value: 'long', label: '길게', description: '400-600자' },
] as const;
