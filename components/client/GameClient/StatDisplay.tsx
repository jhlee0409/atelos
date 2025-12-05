import { cn } from '@/lib/utils';

export const StatDisplay = ({
  name,
  value,
  min,
  max,
  statId,
  polarity = 'positive',
  isCompact = false,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  statId: string;
  polarity?: 'positive' | 'negative';
  isCompact?: boolean;
  showAmplification?: boolean; // 호환성 유지용 (사용하지 않음)
}) => {
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  // 극성에 따라 색상 설정
  let stateColor = 'bg-blue-500';

  if (polarity === 'negative') {
    // 부정 스탯: 높을수록 나쁨
    if (percentage >= 75) stateColor = 'bg-red-500';
    else if (percentage >= 50) stateColor = 'bg-yellow-500';
    else if (percentage < 25) stateColor = 'bg-green-500';
  } else {
    // 긍정 스탯: 높을수록 좋음
    if (percentage < 25) stateColor = 'bg-red-500';
    else if (percentage < 50) stateColor = 'bg-yellow-500';
    else if (percentage >= 75) stateColor = 'bg-green-500';
  }

  if (isCompact) {
    return (
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-shrink-0 text-xs text-zinc-500">
          {name}
        </span>
        <div className="h-1.5 flex-1 bg-zinc-800">
          <div
            className={cn('h-1.5 transition-all', stateColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{name}</span>
        <span className="text-xs text-zinc-600">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-zinc-800">
        <div
          className={cn('h-2 transition-all', stateColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
