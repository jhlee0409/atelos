import { cn } from '@/lib/utils';
import { SaveState, ScenarioData } from '@/types';
import { Sun, Sunset, Moon, Sunrise, Clock, Calendar, AlertTriangle } from 'lucide-react';

interface TimelineProgressProps {
  saveState: SaveState;
  scenario: ScenarioData;
  className?: string;
}

// 하루 시간대 결정 (턴 수 기반)
const getTimeOfDay = (turnsInDay: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  if (turnsInDay <= 1) return 'morning';
  if (turnsInDay <= 2) return 'afternoon';
  if (turnsInDay <= 3) return 'evening';
  return 'night';
};

// 시간대별 설정
const timeOfDayConfig = {
  morning: {
    icon: Sunrise,
    label: '아침',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    description: '하루가 시작됐다',
  },
  afternoon: {
    icon: Sun,
    label: '낮',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    description: '한낮의 태양 아래',
  },
  evening: {
    icon: Sunset,
    label: '저녁',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    description: '해가 지고 있다',
  },
  night: {
    icon: Moon,
    label: '밤',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    description: '어둠이 내렸다',
  },
};

// 진행 퍼센트 계산
const calculateProgress = (currentDay: number, totalDays: number): number => {
  return Math.min(100, Math.max(0, ((currentDay - 1) / (totalDays - 1)) * 100));
};

export const TimelineProgress = ({
  saveState,
  scenario,
  className,
}: TimelineProgressProps) => {
  const currentDay = saveState.context.currentDay || 1;
  const totalDays = scenario.endCondition.value || 7;
  const turnsInDay = saveState.context.turnsInCurrentDay || 0;
  const timeOfDay = getTimeOfDay(turnsInDay);
  const config = timeOfDayConfig[timeOfDay];
  const TimeIcon = config.icon;

  const progress = calculateProgress(currentDay, totalDays);
  const remainingDays = totalDays - currentDay;
  const isEndingSoon = remainingDays <= 2;
  const isLastDay = remainingDays === 0;

  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/80 p-3", className)}>
      {/* 상단: Day 및 시간대 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">
            Day {currentDay}
            <span className="text-zinc-500"> / {totalDays}</span>
          </span>
        </div>
        <div className={cn("flex items-center gap-1 rounded px-2 py-0.5", config.bgColor)}>
          <TimeIcon className={cn("h-3 w-3", config.color)} />
          <span className={cn("text-xs", config.color)}>{config.label}</span>
        </div>
      </div>

      {/* 진행바 */}
      <div className="relative mb-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isLastDay
                ? "bg-red-500"
                : isEndingSoon
                  ? "bg-orange-500"
                  : "bg-green-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Day 마커들 */}
        <div className="absolute top-0 left-0 w-full h-full flex justify-between pointer-events-none">
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNumber = i + 1;
            const position = (i / (totalDays - 1)) * 100;
            const isPast = dayNumber < currentDay;
            const isCurrent = dayNumber === currentDay;

            return (
              <div
                key={i}
                className="relative"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isPast
                      ? "bg-zinc-500"
                      : isCurrent
                        ? "bg-white ring-2 ring-white/30"
                        : "bg-zinc-700"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: 시간대 진행 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {['morning', 'afternoon', 'evening', 'night'].map((time, i) => {
            const isActive = time === timeOfDay;
            const isPast = ['morning', 'afternoon', 'evening', 'night'].indexOf(time) <
                          ['morning', 'afternoon', 'evening', 'night'].indexOf(timeOfDay);
            const TimeOfDayIcon = timeOfDayConfig[time as keyof typeof timeOfDayConfig].icon;

            return (
              <div
                key={time}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded",
                  isActive
                    ? "bg-zinc-700 ring-1 ring-white/20"
                    : isPast
                      ? "bg-zinc-800/50"
                      : "bg-zinc-900"
                )}
                title={timeOfDayConfig[time as keyof typeof timeOfDayConfig].label}
              >
                <TimeOfDayIcon
                  className={cn(
                    "h-3 w-3",
                    isActive
                      ? timeOfDayConfig[time as keyof typeof timeOfDayConfig].color
                      : isPast
                        ? "text-zinc-600"
                        : "text-zinc-700"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* 남은 시간 경고 */}
        {isEndingSoon && (
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isLastDay ? "text-red-400" : "text-orange-400"
          )}>
            <AlertTriangle className="h-3 w-3" />
            <span>
              {isLastDay ? '마지막 날!' : `${remainingDays}일 남음`}
            </span>
          </div>
        )}

        {!isEndingSoon && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>{remainingDays}일 남음</span>
          </div>
        )}
      </div>

      {/* 시간대 설명 */}
      <div className="mt-2 text-center text-[10px] text-zinc-500">
        {config.description}
      </div>
    </div>
  );
};

// 컴팩트 버전 (StatsBar용)
export const TimelineProgressCompact = ({
  saveState,
  scenario,
  className,
}: TimelineProgressProps) => {
  const currentDay = saveState.context.currentDay || 1;
  const totalDays = scenario.endCondition.value || 7;
  const turnsInDay = saveState.context.turnsInCurrentDay || 0;
  const timeOfDay = getTimeOfDay(turnsInDay);
  const config = timeOfDayConfig[timeOfDay];
  const TimeIcon = config.icon;

  const progress = calculateProgress(currentDay, totalDays);
  const remainingDays = totalDays - currentDay;
  const isEndingSoon = remainingDays <= 2;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Day 표시 */}
      <div className="flex items-center gap-1">
        <span className={cn(
          "text-xs font-medium",
          isEndingSoon ? "text-orange-400" : "text-zinc-300"
        )}>
          D{currentDay}
        </span>
        <span className="text-[10px] text-zinc-500">/{totalDays}</span>
      </div>

      {/* 진행바 */}
      <div className="w-16 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isEndingSoon ? "bg-orange-500" : "bg-zinc-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 시간대 아이콘 */}
      <TimeIcon className={cn("h-3 w-3", config.color)} />
    </div>
  );
};
