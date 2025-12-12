'use client';

import { DynamicEndingResult, GoalAchievementLevel, CharacterFate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Target,
  Users,
  Heart,
  Star,
  AlertTriangle,
  Skull,
  Sparkles,
  BookOpen,
  User,
} from 'lucide-react';

interface DynamicEndingDisplayProps {
  ending: DynamicEndingResult;
  onClose?: () => void;
}

// 목표 달성도에 따른 스타일
const achievementStyles: Record<GoalAchievementLevel, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
}> = {
  triumph: {
    icon: <Trophy className="h-6 w-6" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    label: '대성공',
  },
  success: {
    icon: <Star className="h-6 w-6" />,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    label: '성공',
  },
  partial: {
    icon: <Target className="h-6 w-6" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    label: '부분 성공',
  },
  pyrrhic: {
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    label: '피로스의 승리',
  },
  failure: {
    icon: <Skull className="h-6 w-6" />,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    label: '실패',
  },
  subverted: {
    icon: <Sparkles className="h-6 w-6" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    label: '전복',
  },
  tragic: {
    icon: <Heart className="h-6 w-6" />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    label: '비극',
  },
};

// 캐릭터 관계에 따른 색상
function getRelationshipColor(value: number): string {
  if (value >= 50) return 'text-green-400';
  if (value >= 20) return 'text-blue-400';
  if (value >= -20) return 'text-zinc-400';
  if (value >= -50) return 'text-orange-400';
  return 'text-red-400';
}

export function DynamicEndingDisplay({ ending, onClose }: DynamicEndingDisplayProps) {
  const achievement = achievementStyles[ending.goalAchievement];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
          <Card className="bg-zinc-900 border-zinc-700">
            {/* 헤더: 제목 및 달성도 */}
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge
                  variant="outline"
                  className={`${achievement.bg} ${achievement.color} border-current px-4 py-2 text-lg`}
                >
                  <span className="mr-2">{achievement.icon}</span>
                  {achievement.label}
                </Badge>
              </div>
              <CardTitle className="text-2xl text-center text-zinc-100">
                {ending.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 메인 내러티브 */}
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {ending.narrative}
                </p>
              </div>

              <Separator className="bg-zinc-700" />

              {/* 목표 달성 설명 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">목표 달성 평가</span>
                </div>
                <p className="text-zinc-300 text-sm pl-6">
                  {ending.goalExplanation}
                </p>
              </div>

              {/* 캐릭터 운명 */}
              {ending.characterFates && ending.characterFates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">캐릭터들의 운명</span>
                  </div>
                  <div className="grid gap-3">
                    {ending.characterFates.map((fate, index) => (
                      <CharacterFateCard key={index} fate={fate} />
                    ))}
                  </div>
                </div>
              )}

              <Separator className="bg-zinc-700" />

              {/* 플레이어 유산 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">당신의 유산</span>
                </div>
                <p className="text-zinc-300 text-sm pl-6 italic">
                  {ending.playerLegacy}
                </p>
              </div>

              {/* 에필로그 (있는 경우) */}
              {ending.epilogue && (
                <div className="bg-zinc-800/50 rounded-lg p-4 mt-4">
                  <p className="text-zinc-400 text-sm italic">
                    {ending.epilogue}
                  </p>
                </div>
              )}

              {/* SDT 점수 (디버그/분석용 - 접힌 상태) */}
              <details className="text-xs text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-400">
                  SDT 만족도 점수 (분석용)
                </summary>
                <div className="mt-2 space-y-2 pl-4">
                  <SDTScoreBar label="자율성" value={ending.sdtScores.autonomy} />
                  <SDTScoreBar label="유능감" value={ending.sdtScores.competence} />
                  <SDTScoreBar label="관계성" value={ending.sdtScores.relatedness} />
                </div>
              </details>

              {/* 닫기 버튼 */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  결말 확인
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

// 캐릭터 운명 카드 컴포넌트
function CharacterFateCard({ fate }: { fate: CharacterFate }) {
  const relationColor = getRelationshipColor(fate.finalRelationship);

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-zinc-500" />
          <span className="text-zinc-200 font-medium">{fate.name}</span>
        </div>
        <Badge variant="outline" className={`${relationColor} border-current text-xs`}>
          관계: {fate.finalRelationship > 0 ? '+' : ''}{fate.finalRelationship}
        </Badge>
      </div>
      <p className="text-zinc-400 text-sm">{fate.fate}</p>
      {fate.finalScene && (
        <p className="text-zinc-500 text-xs italic">"{fate.finalScene}"</p>
      )}
    </div>
  );
}

// SDT 점수 바 컴포넌트
function SDTScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <Progress value={value} className="h-1" />
    </div>
  );
}
