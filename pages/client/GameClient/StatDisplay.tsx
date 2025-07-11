import { cn } from '@/lib/utils';
import {
  getStatPolarity,
  type StatPolarity,
} from '@/constants/korean-english-mapping';

export const StatDisplay = ({
  name,
  value,
  min,
  max,
  statId,
  isCompact = false,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  statId: string;
  isCompact?: boolean;
}) => {
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  const polarity = getStatPolarity(statId);

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
        <span className="text-sm text-gray-400">{name}</span>
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
