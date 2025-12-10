import { cn } from '@/lib/utils';
import { getStatZone, getAmplificationFactor } from '@/lib/game-ai-client';
import { Info, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

// 구간 정보 표시 컴포넌트
const ZoneIndicator = ({
  percentage,
  showLabel = true,
}: {
  percentage: number;
  showLabel?: boolean;
}) => {
  const zone = getStatZone(percentage);
  const factor = getAmplificationFactor(zone);

  const zoneConfig = {
    extreme_low: {
      label: '위험',
      color: 'text-red-400',
      bgColor: 'bg-red-900/30',
      description: '스탯 변화 1.5배',
    },
    mid_range: {
      label: '안정',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/30',
      description: '스탯 변화 3배 증폭!',
    },
    extreme_high: {
      label: '과열',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/30',
      description: '스탯 변화 1.5배',
    },
  };

  const config = zoneConfig[zone];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px]",
        config.bgColor,
        config.color
      )}
      title={config.description}
    >
      <Zap className="h-2.5 w-2.5" />
      {showLabel && <span>×{factor}</span>}
    </div>
  );
};

// 증폭 설명 툴팁
const AmplificationTooltip = ({
  percentage,
  isOpen,
  onClose,
}: {
  percentage: number;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const zone = getStatZone(percentage);
  const factor = getAmplificationFactor(zone);

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
      {/* 제목 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-200">스탯 증폭 시스템</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      </div>

      {/* 설명 */}
      <div className="mb-3 text-[10px] text-zinc-400">
        스탯 위치에 따라 변화량이 증폭됩니다. 중간 구간(25-75%)에서는 드라마틱한 변화를 위해 3배 증폭됩니다.
      </div>

      {/* 구간 시각화 */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-[9px] text-zinc-500">
          <span>0%</span>
          <span>25%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <div className="relative flex h-3 overflow-hidden rounded-full">
          {/* 위험 구간 */}
          <div className="w-1/4 bg-red-900/50" title="위험 구간: ×1.5" />
          {/* 안정 구간 */}
          <div className="w-1/2 bg-yellow-900/50" title="안정 구간: ×3.0" />
          {/* 과열 구간 */}
          <div className="w-1/4 bg-orange-900/50" title="과열 구간: ×1.5" />
          {/* 현재 위치 마커 */}
          <div
            className="absolute top-0 h-full w-0.5 bg-white shadow-lg"
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 현재 상태 */}
      <div className="rounded bg-zinc-800 p-2">
        <div className="mb-1 text-[10px] text-zinc-400">현재 상태</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-200">
            {zone === 'extreme_low' && '위험 구간 (0-25%)'}
            {zone === 'mid_range' && '안정 구간 (25-75%)'}
            {zone === 'extreme_high' && '과열 구간 (75-100%)'}
          </span>
          <span className={cn(
            "text-xs font-bold",
            zone === 'mid_range' ? 'text-yellow-400' : 'text-zinc-400'
          )}>
            ×{factor} 증폭
          </span>
        </div>
        <div className="mt-1 text-[9px] text-zinc-500">
          {zone === 'mid_range'
            ? '⚡ 이 구간에서는 선택이 큰 영향을 미칩니다!'
            : '변화가 완만하게 적용됩니다.'}
        </div>
      </div>
    </div>
  );
};

export const StatDisplay = ({
  name,
  value,
  min,
  max,
  statId,
  polarity = 'positive',
  isCompact = false,
  showAmplificationHint = true, // 증폭 힌트 표시 여부
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  statId: string;
  polarity?: 'positive' | 'negative';
  isCompact?: boolean;
  showAmplificationHint?: boolean;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  const zone = getStatZone(percentage);

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
        {showAmplificationHint && zone === 'mid_range' && (
          <Zap className="h-3 w-3 text-yellow-500" title="3배 증폭 구간" />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-zinc-400">{name}</span>
          {showAmplificationHint && (
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="증폭 정보 보기"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showAmplificationHint && <ZoneIndicator percentage={percentage} showLabel={false} />}
          <span className="text-xs text-zinc-600">{Math.round(percentage)}%</span>
        </div>
      </div>

      {/* 구간 표시가 포함된 진행바 */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        {/* 구간 배경 (25%, 75% 마커) */}
        {showAmplificationHint && (
          <>
            <div
              className="absolute top-0 h-full w-px bg-zinc-600 opacity-50"
              style={{ left: '25%' }}
            />
            <div
              className="absolute top-0 h-full w-px bg-zinc-600 opacity-50"
              style={{ left: '75%' }}
            />
          </>
        )}
        {/* 실제 진행바 */}
        <div
          className={cn('h-2 transition-all duration-500 rounded-full', stateColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 구간 라벨 (증폭 구간일 때만 표시) */}
      {showAmplificationHint && zone === 'mid_range' && (
        <div className="mt-0.5 text-[9px] text-yellow-600 flex items-center gap-1">
          <Zap className="h-2.5 w-2.5" />
          변화 3배 증폭 구간
        </div>
      )}

      {/* 툴팁 */}
      <AmplificationTooltip
        percentage={percentage}
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
      />
    </div>
  );
};
