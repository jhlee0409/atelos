import { CharacterArc, CharacterMoment } from '@/types';
import { Heart, HeartCrack, User, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

// 분위기 이모지 매핑
const MOOD_EMOJI: Record<string, string> = {
  hopeful: '😊',
  anxious: '😰',
  angry: '😠',
  resigned: '😔',
  determined: '💪',
};

// 분위기 한국어 매핑
const MOOD_KR: Record<string, string> = {
  hopeful: '희망적',
  anxious: '불안',
  angry: '분노',
  resigned: '체념',
  determined: '결연함',
};

// 신뢰도 레벨
const getTrustLabel = (trustLevel: number): { label: string; color: string } => {
  if (trustLevel >= 50) return { label: '깊은 신뢰', color: 'text-green-400' };
  if (trustLevel >= 20) return { label: '우호적', color: 'text-green-300' };
  if (trustLevel >= -20) return { label: '중립', color: 'text-gray-400' };
  if (trustLevel >= -50) return { label: '경계', color: 'text-orange-400' };
  return { label: '적대적', color: 'text-red-400' };
};

// 개별 캐릭터 카드
const CharacterCard = ({ arc }: { arc: CharacterArc }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const trustInfo = getTrustLabel(arc.trustLevel);

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-white">{arc.characterName}</span>
          <span className="text-lg">{MOOD_EMOJI[arc.currentMood]}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 신뢰도 표시 */}
          {arc.trustLevel >= 0 ? (
            <Heart className={`h-3 w-3 ${trustInfo.color}`} />
          ) : (
            <HeartCrack className={`h-3 w-3 ${trustInfo.color}`} />
          )}
          <span className={`text-xs ${trustInfo.color}`}>{trustInfo.label}</span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* 현재 상태 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">현재 분위기</span>
            <span className="text-gray-300">
              {MOOD_EMOJI[arc.currentMood]} {MOOD_KR[arc.currentMood]}
            </span>
          </div>

          {/* 신뢰도 바 */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-500">신뢰도</span>
              <span className={trustInfo.color}>{arc.trustLevel}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className={`h-full transition-all duration-300 ${
                  arc.trustLevel >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.abs(arc.trustLevel)}%`,
                  marginLeft: arc.trustLevel < 0 ? `${100 - Math.abs(arc.trustLevel)}%` : '0',
                }}
              />
            </div>
          </div>

          {/* 주요 순간들 */}
          {arc.moments.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">주요 순간</span>
              <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
                {arc.moments.slice(-5).map((moment, idx) => (
                  <MomentItem key={idx} moment={moment} />
                ))}
              </div>
            </div>
          )}

          {arc.moments.length === 0 && (
            <p className="text-center text-xs text-gray-500">
              아직 기록된 순간이 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// 순간 아이템
const MomentItem = ({ moment }: { moment: CharacterMoment }) => {
  const impactColor =
    moment.impact === 'positive'
      ? 'text-green-400'
      : moment.impact === 'negative'
        ? 'text-red-400'
        : 'text-gray-400';

  const impactIcon =
    moment.impact === 'positive' ? '↑' : moment.impact === 'negative' ? '↓' : '•';

  return (
    <div className="flex items-start gap-2 rounded bg-gray-700/30 p-1.5 text-xs">
      <span className={impactColor}>{impactIcon}</span>
      <div className="flex-1">
        <span className="text-gray-300">{moment.description}</span>
        <span className="ml-1 text-gray-500">Day {moment.day}</span>
      </div>
    </div>
  );
};

// 메인 패널
export const CharacterArcPanel = ({
  characterArcs,
  isCompact = false,
}: {
  characterArcs?: CharacterArc[];
  isCompact?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!characterArcs || characterArcs.length === 0) {
    return null;
  }

  if (isCompact) {
    return (
      <div className="flex flex-wrap gap-1">
        {characterArcs.slice(0, 4).map((arc) => (
          <div
            key={arc.characterName}
            className="flex items-center gap-1 rounded bg-gray-800/50 px-2 py-1 text-xs"
            title={`${arc.characterName}: ${getTrustLabel(arc.trustLevel).label}`}
          >
            <span>{MOOD_EMOJI[arc.currentMood]}</span>
            <span className="text-gray-300">{arc.characterName.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/20 p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
          <User className="h-4 w-4" />
          생존자 관계
        </h3>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded ? (
        <div className="mt-3 space-y-2">
          {characterArcs.map((arc) => (
            <CharacterCard key={arc.characterName} arc={arc} />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {characterArcs.map((arc) => {
            const trustInfo = getTrustLabel(arc.trustLevel);
            return (
              <div
                key={arc.characterName}
                className="flex items-center gap-1.5 rounded-full bg-gray-700/50 px-2 py-1"
                title={`${arc.characterName}: ${trustInfo.label} (${arc.trustLevel})`}
              >
                <span className="text-sm">{MOOD_EMOJI[arc.currentMood]}</span>
                <span className="text-xs text-gray-300">{arc.characterName}</span>
                {arc.trustLevel >= 0 ? (
                  <Heart className={`h-2.5 w-2.5 ${trustInfo.color}`} />
                ) : (
                  <HeartCrack className={`h-2.5 w-2.5 ${trustInfo.color}`} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
