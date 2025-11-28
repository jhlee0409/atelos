import { cn } from '@/lib/utils';
import {
  getStatPolarity,
  type StatPolarity,
} from '@/constants/korean-english-mapping';
import {
  getStatZone,
  getAmplificationFactor,
  getAmplificationVisualData,
} from '@/lib/game-ai-client';
import { useState } from 'react';
import { Info } from 'lucide-react';

export const StatDisplay = ({
  name,
  value,
  min,
  max,
  statId,
  isCompact = false,
  showAmplification = true,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  statId: string;
  isCompact?: boolean;
  showAmplification?: boolean;
}) => {
  const [showAmplificationInfo, setShowAmplificationInfo] = useState(false);

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  const polarity = getStatPolarity(statId);

  // 증폭 구간 정보
  const amplificationData = getAmplificationVisualData(percentage);

  // 극성에 따라 색상과 키워드를 다르게 설정
  let stateColor = 'bg-blue-500';
  let stateKeyword = '안정';
  let pulseClass = '';

  if (polarity === 'negative') {
    // 부정 스탯: 높을수록 나쁨 (색상 반전)
    if (percentage >= 75) {
      stateColor = 'bg-red-500';
      stateKeyword = '위험';
      pulseClass = 'animate-pulse';
    } else if (percentage >= 50) {
      stateColor = 'bg-yellow-500';
      stateKeyword = '불안';
    } else if (percentage < 25) {
      stateColor = 'bg-green-500';
      stateKeyword = '안전';
    }
  } else {
    // 긍정 스탯: 높을수록 좋음 (기존 로직)
    if (percentage < 25) {
      stateColor = 'bg-red-500';
      stateKeyword = '위험';
      pulseClass = 'animate-pulse';
    } else if (percentage < 50) {
      stateColor = 'bg-yellow-500';
      stateKeyword = '불안';
    } else if (percentage >= 75) {
      stateColor = 'bg-green-500';
      stateKeyword = '우수';
    }
  }

  if (isCompact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="min-w-0 truncate text-xs text-gray-400">{name}</span>
        <div className="flex items-center space-x-1">
          <div className="h-1.5 w-20 rounded-full bg-gray-700">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                stateColor,
                pulseClass,
              )}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <span
            className={cn(
              'text-xs font-semibold',
              polarity === 'negative'
                ? {
                    'text-green-400': percentage < 25,
                    'text-blue-400': percentage >= 25 && percentage < 50,
                    'text-yellow-400': percentage >= 50 && percentage < 75,
                    'text-red-400': percentage >= 75,
                  }
                : {
                    'text-red-400': percentage < 25,
                    'text-yellow-400': percentage >= 25 && percentage < 50,
                    'text-blue-400': percentage >= 50 && percentage < 75,
                    'text-green-400': percentage >= 75,
                  },
            )}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400">{name}</span>
          {/* 증폭 정보 버튼 */}
          {showAmplification && (
            <button
              type="button"
              onClick={() => setShowAmplificationInfo(!showAmplificationInfo)}
              className="rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-300"
              aria-label="증폭 정보 보기"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 증폭 배수 표시 */}
          {showAmplification && (
            <span
              className={cn(
                'text-[10px] font-medium',
                amplificationData.zoneColor,
              )}
            >
              {amplificationData.factorLabel}
            </span>
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              polarity === 'negative'
                ? {
                    'text-green-400': percentage < 25,
                    'text-blue-400': percentage >= 25 && percentage < 50,
                    'text-yellow-400': percentage >= 50 && percentage < 75,
                    'text-red-400': percentage >= 75,
                  }
                : {
                    'text-red-400': percentage < 25,
                    'text-yellow-400': percentage >= 25 && percentage < 50,
                    'text-blue-400': percentage >= 50 && percentage < 75,
                    'text-green-400': percentage >= 75,
                  },
            )}
          >
            {stateKeyword}
          </span>
        </div>
      </div>

      {/* 증폭 정보 패널 */}
      {showAmplificationInfo && showAmplification && (
        <div className="mb-2 rounded bg-gray-800/80 p-2 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">현재 구간:</span>
            <span className={amplificationData.zoneColor}>
              {amplificationData.zoneName} ({amplificationData.zoneStart}-{amplificationData.zoneEnd}%)
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-gray-400">변화 증폭:</span>
            <span className={amplificationData.zoneColor}>
              {amplificationData.factorLabel}
            </span>
          </div>
          <div className="mt-1 text-gray-500">
            {amplificationData.factor === 3.0 ? (
              <span>⚡ 안정 구간에서 급격한 변화가 발생합니다</span>
            ) : (
              <span>🛡️ 극단 구간에서 완만한 변화가 적용됩니다</span>
            )}
          </div>
          {/* 구간 시각화 */}
          <div className="mt-2">
            <div className="flex h-1.5 overflow-hidden rounded-full">
              <div className="w-1/4 bg-red-600/50"></div>
              <div className="w-1/2 bg-yellow-600/50"></div>
              <div className="w-1/4 bg-orange-600/50"></div>
            </div>
            <div className="relative mt-0.5 h-1">
              <div
                className="absolute h-2 w-0.5 -translate-y-0.5 bg-white"
                style={{ left: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="h-2 w-full rounded-full bg-gray-700">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-500',
            stateColor,
            pulseClass,
          )}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
