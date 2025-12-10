import { DialogueTopic, DialogueResponse, SaveState, ScenarioData, CharacterArc } from '@/types';
import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { getKoreanRoleName, getKoreanStatName, getKoreanFlagName } from '@/constants/korean-english-mapping';
import { buildContextSummary, buildCluesSummary } from './context-manager';

// 대화 프롬프트 빌드
const buildDialoguePrompt = (
  characterName: string,
  topic: DialogueTopic,
  saveState: SaveState,
  scenario: ScenarioData
): string => {
  // 캐릭터 정보 가져오기
  const characterData = scenario.characters.find(
    (c) => c.characterName === characterName
  );
  const characterArc = saveState.characterArcs?.find(
    (a) => a.characterName === characterName
  );
  const survivorInfo = saveState.community.survivors.find(
    (s) => s.name === characterName
  );

  // 현재 상황 요약
  const currentDay = saveState.context.currentDay || 1;
  const statsSummary = Object.entries(saveState.context.scenarioStats)
    .map(([id, value]) => {
      const statDef = scenario.scenarioStats.find((s) => s.id === id);
      const koreanName = statDef?.name || getKoreanStatName(id) || id;
      const max = statDef?.max || 100;
      const percentage = Math.round((value / max) * 100);
      return `${koreanName}: ${percentage}%`;
    })
    .join(', ');

  // 획득한 플래그 (한국어로)
  const acquiredFlags = Object.entries(saveState.context.flags)
    .filter(([_, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([name]) => getKoreanFlagName(name) || name.replace('FLAG_', ''))
    .slice(0, 5)
    .join(', ');

  // 캐릭터 관계도
  const playerRelations = Object.entries(saveState.community.hiddenRelationships)
    .filter(([key]) => key.includes('(플레이어)') || key.includes(characterName))
    .map(([key, value]) => {
      const otherPerson = key.replace('(플레이어)', '').replace(characterName, '').replace(/-/g, '').trim();
      if (!otherPerson) return null;
      return `${otherPerson}과의 관계: ${value > 0 ? '+' : ''}${value}`;
    })
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  // 오늘의 맥락 (이전 행동들)
  const actionContext = saveState.context.actionContext;
  const contextSummary = actionContext ? buildContextSummary(actionContext) : '첫 대화';
  const cluesSummary = actionContext ? buildCluesSummary(actionContext) : '없음';

  // 이 캐릭터와의 이전 상호작용
  const previousInteraction = actionContext?.characterPresences?.find(
    (p) => p.characterName === characterName
  )?.lastInteraction;
  const previousInteractionInfo = previousInteraction
    ? `마지막 상호작용: Day ${previousInteraction.day} - ${previousInteraction.summary}`
    : '이전 대화 없음';

  const prompt = `당신은 ${scenario.title}의 캐릭터 "${characterName}"입니다.

## 캐릭터 정보
- 이름: ${characterName}
- 역할: ${characterData?.roleName || survivorInfo?.role || '생존자'}
- 배경: ${characterData?.backstory || '정보 없음'}
- 특성: ${survivorInfo?.traits?.join(', ') || '정보 없음'}
- 현재 상태: ${survivorInfo?.status || 'normal'}
- 현재 기분: ${characterArc?.currentMood || 'anxious'}
- 플레이어 신뢰도: ${characterArc?.trustLevel || 0} (-100~100)
- ${previousInteractionInfo}

## 현재 상황
- Day ${currentDay}/${scenario.endCondition.value || 7}
- 주요 스탯: ${statsSummary}
- 획득 플래그: ${acquiredFlags || '없음'}
- 관계: ${playerRelations || '정보 없음'}

## 오늘의 맥락 (플레이어가 오늘 한 일 - 대화에 반영할 것)
${contextSummary}

## 플레이어가 발견한 단서 (캐릭터가 아는 정보와 연결)
${cluesSummary}

## 대화 주제
플레이어가 "${topic.label}"에 대해 물어봅니다.
주제 카테고리: ${topic.category}

## 응답 규칙
1. 캐릭터의 성격, 역할, 현재 기분에 맞게 대사를 작성하세요
2. 신뢰도가 높으면 더 친밀하고 정보를 많이 공유합니다
3. 신뢰도가 낮으면 경계하며 간단히 답합니다
4. 플레이어가 오늘 탐색한 장소나 다른 캐릭터와의 대화를 자연스럽게 언급할 수 있습니다
5. 반드시 한국어로만 응답하세요
6. 대사는 자연스러운 구어체로 2-4문장 정도로 작성하세요
7. 캐릭터의 감정과 상태가 대사에 드러나야 합니다

## 출력 형식 (JSON만 출력)
{
  "dialogue": "캐릭터의 대사 (따옴표 없이)",
  "mood": "hopeful|anxious|angry|resigned|determined",
  "infoGained": "플레이어가 얻은 정보 요약 (있는 경우, 없으면 null)",
  "relationshipChange": 0
}

relationshipChange 값:
- 좋은 대화: +2~+5
- 중립적 대화: 0
- 불쾌한 대화: -2~-5

JSON만 출력하세요.`;

  return prompt;
};

// 기본 대화 응답 (폴백)
const generateFallbackDialogue = (
  characterName: string,
  topic: DialogueTopic,
  characterArc?: CharacterArc
): DialogueResponse => {
  const mood = characterArc?.currentMood || 'anxious';
  const trustLevel = characterArc?.trustLevel || 0;

  let dialogue = '';
  let infoGained: string | undefined;

  // 신뢰도에 따른 기본 대화
  if (trustLevel >= 30) {
    switch (topic.category) {
      case 'info':
        dialogue = `음... 내가 아는 건 많지 않지만, 최선을 다해 알려줄게.`;
        infoGained = '일반적인 상황 정보';
        break;
      case 'advice':
        dialogue = `내 생각엔... 신중하게 결정하는 게 좋을 것 같아. 지금은 모두가 불안한 상황이니까.`;
        break;
      case 'relationship':
        dialogue = `고마워, 이렇게 신경 써줘서. 함께라면 해낼 수 있을 거야.`;
        break;
      case 'personal':
        dialogue = `솔직히... 불안하기도 하지만, 희망을 잃지 않으려고 노력 중이야.`;
        break;
      default:
        dialogue = `무슨 일이야? 내가 도울 수 있는 게 있으면 말해.`;
    }
  } else if (trustLevel >= 0) {
    switch (topic.category) {
      case 'info':
        dialogue = `글쎄... 나도 잘 모르겠어. 상황이 복잡해서.`;
        break;
      case 'advice':
        dialogue = `조언을 해달라고? 나도 정확히 뭘 해야 할지 모르겠는데.`;
        break;
      case 'relationship':
        dialogue = `... 아직은 잘 모르겠어. 시간이 좀 필요해.`;
        break;
      case 'personal':
        dialogue = `그냥... 버티고 있어. 다들 그렇지 않아?`;
        break;
      default:
        dialogue = `무슨 일인데?`;
    }
  } else {
    switch (topic.category) {
      case 'info':
        dialogue = `왜 내게 물어보는 거지? 다른 사람한테 물어봐.`;
        break;
      case 'advice':
        dialogue = `내 조언이 필요하다고? 우습군.`;
        break;
      case 'relationship':
        dialogue = `... 지금은 이야기할 기분이 아니야.`;
        break;
      case 'personal':
        dialogue = `내 일에 신경 쓰지 마.`;
        break;
      default:
        dialogue = `뭐야?`;
    }
  }

  return {
    characterName,
    dialogue,
    mood,
    infoGained,
    relationshipChange: 0,
  };
};

// 대화 응답 생성
export const generateDialogueResponse = async (
  characterName: string,
  topic: DialogueTopic,
  saveState: SaveState,
  scenario: ScenarioData
): Promise<DialogueResponse> => {
  try {
    const userPrompt = buildDialoguePrompt(characterName, topic, saveState, scenario);

    console.log(`💬 캐릭터 대화 생성 요청: ${characterName} - ${topic.label}`);

    const response = await callGeminiAPI({
      systemPrompt: `당신은 ${scenario.title}의 캐릭터 "${characterName}"입니다. 플레이어와의 대화에 자연스럽게 응답합니다. JSON 형식으로 응답하세요.`,
      userPrompt,
      temperature: 0.8, // 대화는 좀 더 다양하게
      maxTokens: 500, // 짧은 응답
    });

    if (!response) {
      console.warn('💬 대화 API 응답 없음, 폴백 사용');
      const characterArc = saveState.characterArcs?.find(
        (a) => a.characterName === characterName
      );
      return generateFallbackDialogue(characterName, topic, characterArc);
    }

    const parsed = parseGeminiJsonResponse<{
      dialogue: string;
      mood: CharacterArc['currentMood'];
      infoGained?: string | null;
      relationshipChange?: number;
    }>(response);

    if (!parsed || !parsed.dialogue) {
      console.warn('💬 대화 파싱 실패, 폴백 사용');
      const characterArc = saveState.characterArcs?.find(
        (a) => a.characterName === characterName
      );
      return generateFallbackDialogue(characterName, topic, characterArc);
    }

    console.log(`💬 대화 생성 완료: "${parsed.dialogue.substring(0, 50)}..."`);

    return {
      characterName,
      dialogue: parsed.dialogue,
      mood: parsed.mood || 'anxious',
      infoGained: parsed.infoGained || undefined,
      relationshipChange: parsed.relationshipChange || 0,
    };
  } catch (error) {
    console.error('💬 대화 생성 오류:', error);
    const characterArc = saveState.characterArcs?.find(
      (a) => a.characterName === characterName
    );
    return generateFallbackDialogue(characterName, topic, characterArc);
  }
};
