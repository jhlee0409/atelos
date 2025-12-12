import { cn } from '@/lib/utils';
import { CharacterDialogueOption, DialogueTopic, CharacterArc, ScenarioData, SaveState } from '@/types';
import { getKoreanRoleName } from '@/constants/korean-english-mapping';
import { MessageCircle, ArrowLeft, User, Info, Lightbulb, Heart, HelpCircle, Loader2, Lock, Sparkles, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  generateDynamicDialogueTopics,
  type DynamicDialogueTopic,
} from '@/lib/action-engagement-system';

interface CharacterDialoguePanelProps {
  scenario: ScenarioData;
  saveState: SaveState;
  onSelectCharacter: (characterName: string, topic: DialogueTopic) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// 역할별 대화 주제 생성
const generateTopicsForRole = (role: string, characterName: string): DialogueTopic[] => {
  const baseTopics: DialogueTopic[] = [
    { topicId: 'situation', label: '현재 상황에 대해 묻는다', category: 'info' },
    { topicId: 'advice', label: '조언을 구한다', category: 'advice' },
    { topicId: 'feelings', label: '기분이 어떤지 묻는다', category: 'personal' },
  ];

  // 역할별 추가 주제
  const roleLower = role.toLowerCase();

  if (roleLower.includes('리더') || roleLower.includes('leader')) {
    baseTopics.push(
      { topicId: 'plan', label: '앞으로의 계획에 대해 묻는다', category: 'info' },
      { topicId: 'survivors', label: '생존자들 상태를 묻는다', category: 'info' }
    );
  }

  if (roleLower.includes('의료') || roleLower.includes('medical') || roleLower.includes('의사') || roleLower.includes('간호')) {
    baseTopics.push(
      { topicId: 'medical', label: '부상자 상태를 묻는다', category: 'info' },
      { topicId: 'supplies', label: '의료 물자 현황을 묻는다', category: 'info' }
    );
  }

  if (roleLower.includes('전투') || roleLower.includes('경비') || roleLower.includes('보안') || roleLower.includes('군인')) {
    baseTopics.push(
      { topicId: 'defense', label: '방어 현황을 묻는다', category: 'info' },
      { topicId: 'threat', label: '외부 위협에 대해 묻는다', category: 'info' }
    );
  }

  if (roleLower.includes('기술') || roleLower.includes('engineer') || roleLower.includes('통신')) {
    baseTopics.push(
      { topicId: 'equipment', label: '장비 상태를 묻는다', category: 'info' },
      { topicId: 'communication', label: '외부 연락 가능성을 묻는다', category: 'info' }
    );
  }

  return baseTopics;
};

// 신뢰도에 따른 테두리 색상
const getTrustBorderColor = (trustLevel: number): string => {
  if (trustLevel >= 50) return 'border-green-600';
  if (trustLevel >= 20) return 'border-green-700/50';
  if (trustLevel >= -20) return 'border-zinc-700';
  if (trustLevel >= -50) return 'border-red-700/50';
  return 'border-red-600';
};

// 분위기에 따른 표시
const getMoodDisplay = (mood: CharacterArc['currentMood']): { emoji: string; label: string; color: string } => {
  switch (mood) {
    case 'hopeful':
      return { emoji: '😊', label: '희망적', color: 'text-green-400' };
    case 'anxious':
      return { emoji: '😰', label: '불안', color: 'text-yellow-400' };
    case 'angry':
      return { emoji: '😠', label: '분노', color: 'text-red-400' };
    case 'resigned':
      return { emoji: '😔', label: '체념', color: 'text-zinc-400' };
    case 'determined':
      return { emoji: '😤', label: '결의', color: 'text-blue-400' };
    default:
      return { emoji: '😐', label: '평온', color: 'text-zinc-400' };
  }
};

// 주제 카테고리별 아이콘
const getTopicIcon = (category: DialogueTopic['category']) => {
  switch (category) {
    case 'info':
      return Info;
    case 'advice':
      return Lightbulb;
    case 'relationship':
      return Heart;
    case 'personal':
      return HelpCircle;
    default:
      return MessageCircle;
  }
};

// 캐릭터 카드
const CharacterCard = ({
  character,
  isSelected,
  onClick,
}: {
  character: CharacterDialogueOption;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const moodDisplay = getMoodDisplay(character.currentMood || 'anxious');
  const trustLevel = character.trustLevel || 0;
  const trustBorder = getTrustBorderColor(trustLevel);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border-2 p-3 text-left transition-all",
        trustBorder,
        isSelected
          ? "bg-zinc-800 ring-1 ring-white/20"
          : "bg-zinc-900/50 hover:bg-zinc-800/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
          <User className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200 truncate">
              {character.characterName}
            </span>
            <span className={cn("text-sm", moodDisplay.color)}>
              {moodDisplay.emoji}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            {getKoreanRoleName(character.role) || character.role}
          </div>
        </div>
      </div>
    </button>
  );
};

// 대화 주제 선택 (동적 주제 지원)
const TopicSelection = ({
  character,
  topics,
  onSelect,
  onBack,
  isLoading,
}: {
  character: CharacterDialogueOption;
  topics: DynamicDialogueTopic[];
  onSelect: (topic: DialogueTopic) => void;
  onBack: () => void;
  isLoading?: boolean;
}) => {
  const moodDisplay = getMoodDisplay(character.currentMood || 'anxious');
  const trustLevel = character.trustLevel || 0;

  return (
    <div className="space-y-2">
      {/* 캐릭터 정보 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-200">{character.characterName}</span>
          <span className={cn("text-sm", moodDisplay.color)}>
            {moodDisplay.emoji}
          </span>
        </div>
        {/* 신뢰도 표시 */}
        <div className={cn(
          "text-[10px] px-2 py-0.5 rounded",
          trustLevel >= 40 ? "bg-green-900/30 text-green-400" :
          trustLevel >= 0 ? "bg-zinc-800 text-zinc-400" :
          "bg-red-900/30 text-red-400"
        )}>
          신뢰도 {trustLevel > 0 ? '+' : ''}{trustLevel}
        </div>
      </div>

      {/* 대화 주제 목록 */}
      {topics.map((topic) => {
        const TopicIcon = getTopicIcon(topic.category);
        const isLocked = topic.trustRequired && trustLevel < topic.trustRequired;
        const isSecret = topic.isSecret;
        const hasUnlockCondition = topic.unlockCondition;

        return (
          <button
            key={topic.topicId}
            onClick={() => !isLocked && onSelect(topic)}
            disabled={isLoading || isLocked}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-all",
              isLocked
                ? "border-zinc-800 bg-zinc-900/30 opacity-60 cursor-not-allowed"
                : isSecret
                  ? "border-amber-800/50 bg-amber-950/20 hover:bg-amber-900/30 hover:border-amber-700/50"
                  : hasUnlockCondition
                    ? "border-blue-800/50 bg-blue-950/20 hover:bg-blue-900/30 hover:border-blue-700/50"
                    : "border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-zinc-600"
            )}
          >
            <div className="flex items-start gap-2">
              {isLocked ? (
                <Lock className="h-4 w-4 text-zinc-600 mt-0.5" />
              ) : isSecret ? (
                <Eye className="h-4 w-4 text-amber-400 mt-0.5" />
              ) : hasUnlockCondition ? (
                <Sparkles className="h-4 w-4 text-blue-400 mt-0.5" />
              ) : (
                <TopicIcon className="h-4 w-4 text-zinc-500 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-sm",
                  isLocked ? "text-zinc-500" :
                  isSecret ? "text-amber-200" :
                  hasUnlockCondition ? "text-blue-200" :
                  "text-zinc-200"
                )}>
                  {topic.label}
                </span>

                {/* 힌트 표시 */}
                {topic.impactHint && !isLocked && (
                  <p className="text-[10px] text-zinc-500 mt-1">{topic.impactHint}</p>
                )}

                {/* 잠긴 경우 언락 조건 표시 */}
                {isLocked && topic.trustRequired && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    신뢰도 {topic.trustRequired} 필요
                  </p>
                )}

                {/* 언락 조건 뱃지 */}
                {hasUnlockCondition && !isLocked && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">
                      {topic.unlockCondition}
                    </span>
                  </div>
                )}
              </div>
              {isLoading && !isLocked && (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              )}
            </div>
          </button>
        );
      })}

      {/* 돌아가기 버튼 */}
      <button
        onClick={onBack}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-3 w-3" />
        돌아가기
      </button>
    </div>
  );
};

// 확장된 캐릭터 대화 옵션 (동적 주제 포함)
interface ExtendedCharacterDialogueOption extends Omit<CharacterDialogueOption, 'availableTopics'> {
  availableTopics: DynamicDialogueTopic[];
}

export const CharacterDialoguePanel = ({
  scenario,
  saveState,
  onSelectCharacter,
  onClose,
  isLoading = false,
}: CharacterDialoguePanelProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<ExtendedCharacterDialogueOption | null>(null);

  // 대화 가능한 캐릭터 목록 생성 (동적 주제 시스템 사용)
  const availableCharacters: ExtendedCharacterDialogueOption[] = useMemo(() => {
    return saveState.community.survivors
      .filter((survivor) => survivor.name !== '(플레이어)' && survivor.status !== 'dead')
      .map((survivor) => {
        // 캐릭터 아크에서 mood와 trustLevel 가져오기
        const arc = saveState.characterArcs?.find(
          (a) => a.characterName === survivor.name
        );

        // 동적 대화 주제 생성 (신뢰도, 발견물, 맥락 기반)
        const dynamicTopics = generateDynamicDialogueTopics(
          survivor.name,
          survivor.role,
          saveState,
          scenario
        );

        // 정적 주제도 폴백으로 포함 (없는 경우)
        const staticTopics = generateTopicsForRole(survivor.role, survivor.name);
        const mergedTopics = [...dynamicTopics];

        // 정적 주제 중 동적에 없는 것 추가
        for (const staticTopic of staticTopics) {
          if (!mergedTopics.find(t => t.topicId === staticTopic.topicId)) {
            mergedTopics.push(staticTopic);
          }
        }

        return {
          characterName: survivor.name,
          role: survivor.role,
          availableTopics: mergedTopics,
          currentMood: arc?.currentMood || 'anxious',
          trustLevel: arc?.trustLevel || 0,
        };
      });
  }, [saveState, scenario]);

  const handleCharacterSelect = (character: ExtendedCharacterDialogueOption) => {
    setSelectedCharacter(character);
  };

  const handleTopicSelect = (topic: DialogueTopic) => {
    if (selectedCharacter) {
      onSelectCharacter(selectedCharacter.characterName, topic);
    }
  };

  const handleBack = () => {
    setSelectedCharacter(null);
  };

  if (availableCharacters.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="text-center text-zinc-500 py-4">
          대화할 수 있는 사람이 없다.
        </div>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3 w-3" />
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
      {/* 캐릭터 선택 또는 주제 선택 */}
      {selectedCharacter ? (
        <TopicSelection
          character={selectedCharacter}
          topics={selectedCharacter.availableTopics}
          onSelect={handleTopicSelect}
          onBack={handleBack}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-2">
          {availableCharacters.map((character) => (
            <CharacterCard
              key={character.characterName}
              character={character}
              isSelected={false}
              onClick={() => handleCharacterSelect(character)}
            />
          ))}
          {/* 돌아가기 버튼 */}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3 w-3" />
            돌아가기
          </button>
        </div>
      )}
    </div>
  );
};
