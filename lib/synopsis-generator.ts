// 시놉시스 생성 API 클라이언트

export type ToneType = 'dark' | 'hopeful' | 'thriller' | 'dramatic' | 'comedic' | 'mysterious' | 'romantic' | 'action' | 'melancholic' | 'satirical' | 'epic' | 'intimate';

export interface SynopsisGenerateRequest {
  idea: string;
  tone?: ToneType;
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
export const TONE_OPTIONS: { value: ToneType; label: string; description: string }[] = [
  { value: 'dark', label: '다크', description: '절망적인 분위기, 생존과 도덕적 딜레마' },
  { value: 'hopeful', label: '희망적', description: '성장 서사, 역경을 이겨내는 이야기' },
  { value: 'thriller', label: '스릴러', description: '긴장감 넘치는 서스펜스' },
  { value: 'dramatic', label: '드라마틱', description: '감정적 깊이와 인물 간 갈등' },
  { value: 'comedic', label: '코믹', description: '유머러스하고 풍자적 요소' },
  { value: 'mysterious', label: '미스터리', description: '수수께끼와 반전, 진실 추적' },
  { value: 'romantic', label: '로맨틱', description: '감정선과 관계 변화 중심' },
  { value: 'action', label: '액션', description: '빠른 전개와 긴박한 상황' },
  { value: 'melancholic', label: '멜랑콜릭', description: '쓸쓸하고 애틋한 분위기' },
  { value: 'satirical', label: '풍자적', description: '사회 비평과 아이러니' },
  { value: 'epic', label: '서사시적', description: '웅장한 스케일, 영웅적 여정' },
  { value: 'intimate', label: '내밀한', description: '개인적이고 섬세한 감정' },
];

// 길이 옵션
export const LENGTH_OPTIONS = [
  { value: 'short', label: '짧게', description: '100-200자' },
  { value: 'medium', label: '보통', description: '200-400자' },
  { value: 'long', label: '길게', description: '400-600자' },
] as const;
