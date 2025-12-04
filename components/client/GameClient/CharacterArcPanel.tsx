import { CharacterArc } from '@/types';

// 분위기 이모지 매핑
const MOOD_EMOJI: Record<string, string> = {
  hopeful: '😊',
  anxious: '😰',
  angry: '😠',
  resigned: '😔',
  determined: '💪',
};

// 신뢰도에 따른 색상
const getTrustColor = (trustLevel: number): string => {
  if (trustLevel >= 30) return 'border-green-500/50';
  if (trustLevel >= -30) return 'border-gray-600/50';
  return 'border-red-500/50';
};

export const CharacterArcPanel = ({
  characterArcs,
  isCompact = false,
}: {
  characterArcs?: CharacterArc[];
  isCompact?: boolean;
}) => {
  if (!characterArcs || characterArcs.length === 0) {
    return null;
  }

  // 컴팩트 모드: 이모지만 표시
  if (isCompact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">생존자</span>
        <div className="flex gap-0.5">
          {characterArcs.slice(0, 5).map((arc) => (
            <span
              key={arc.characterName}
              className="text-sm"
              title={arc.characterName}
            >
              {MOOD_EMOJI[arc.currentMood]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // 확장 모드: 이름과 이모지
  return (
    <div className="flex flex-wrap gap-2">
      {characterArcs.map((arc) => (
        <div
          key={arc.characterName}
          className={`flex items-center gap-1.5 rounded-full border bg-gray-800/30 px-2.5 py-1 ${getTrustColor(arc.trustLevel)}`}
        >
          <span className="text-sm">{MOOD_EMOJI[arc.currentMood]}</span>
          <span className="text-xs text-gray-300">{arc.characterName}</span>
        </div>
      ))}
    </div>
  );
};
