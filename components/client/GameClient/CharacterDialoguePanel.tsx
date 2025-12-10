import { cn } from '@/lib/utils';
import { CharacterDialogueOption, DialogueTopic, CharacterArc, ScenarioData, SaveState } from '@/types';
import { getKoreanRoleName } from '@/constants/korean-english-mapping';
import { MessageCircle, ArrowLeft, User, Info, Lightbulb, Heart, HelpCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

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

// 대화 주제 선택
const TopicSelection = ({
  character,
  topics,
  onSelect,
  onBack,
  isLoading,
}: {
  character: CharacterDialogueOption;
  topics: DialogueTopic[];
  onSelect: (topic: DialogueTopic) => void;
  onBack: () => void;
  isLoading?: boolean;
}) => {
  const moodDisplay = getMoodDisplay(character.currentMood || 'anxious');

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={onBack}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-200">{character.characterName}</span>
          <span className={cn("text-sm", moodDisplay.color)}>
            {moodDisplay.emoji} {moodDisplay.label}
          </span>
        </div>
      </div>

      {/* 대화 주제 목록 */}
      <div className="space-y-2">
        {topics.map((topic) => {
          const TopicIcon = getTopicIcon(topic.category);
          return (
            <button
              key={topic.topicId}
              onClick={() => onSelect(topic)}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-left transition-all",
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-zinc-800/50 hover:border-zinc-700"
              )}
            >
              <TopicIcon className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-300">{topic.label}</span>
              {isLoading && (
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CharacterDialoguePanel = ({
  scenario,
  saveState,
  onSelectCharacter,
  onClose,
  isLoading = false,
}: CharacterDialoguePanelProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDialogueOption | null>(null);

  // 대화 가능한 캐릭터 목록 생성
  const availableCharacters: CharacterDialogueOption[] = saveState.community.survivors
    .filter((survivor) => survivor.name !== '(플레이어)' && survivor.status !== 'dead')
    .map((survivor) => {
      // 캐릭터 아크에서 mood와 trustLevel 가져오기
      const arc = saveState.characterArcs?.find(
        (a) => a.characterName === survivor.name
      );

      return {
        characterName: survivor.name,
        role: survivor.role,
        availableTopics: generateTopicsForRole(survivor.role, survivor.name),
        currentMood: arc?.currentMood || 'anxious',
        trustLevel: arc?.trustLevel || 0,
      };
    });

  const handleCharacterSelect = (character: CharacterDialogueOption) => {
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
        <div className="text-center text-zinc-500">
          대화할 수 있는 캐릭터가 없습니다.
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
      {/* 헤더 - 간소화 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-200">누구와 이야기할까?</span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300"
          disabled={isLoading}
        >
          돌아가기
        </button>
      </div>

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
          <button
            onClick={onClose}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            다음으로
          </button>
        </div>
      )}
    </div>
  );
};
