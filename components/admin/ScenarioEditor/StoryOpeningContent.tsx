'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Zap, Users, Clock, MapPin, Palette } from 'lucide-react';
import type { ScenarioData, StoryOpening, OpeningTone, CharacterIntroductionStyle } from '@/types';
import { SetStateAction } from 'react';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
};

// 오프닝 톤 옵션
const OPENING_TONE_OPTIONS: { value: OpeningTone; label: string; description: string }[] = [
  { value: 'calm', label: '차분한', description: '일상에서 시작하여 점진적으로 변화' },
  { value: 'mysterious', label: '신비로운', description: '의문점을 남기며 시작' },
  { value: 'urgent', label: '긴박한', description: '위기 상황으로 바로 진입' },
  { value: 'dramatic', label: '극적인', description: '강렬한 사건으로 시작' },
  { value: 'introspective', label: '내성적', description: '주인공의 내면 묘사로 시작' },
];

// 캐릭터 소개 방식 옵션
const INTRO_STYLE_OPTIONS: { value: CharacterIntroductionStyle; label: string; description: string }[] = [
  { value: 'contextual', label: '맥락적', description: '상황에 따라 자연스럽게 등장' },
  { value: 'gradual', label: '점진적', description: '스토리 진행에 따라 한 명씩' },
  { value: 'immediate', label: '즉시 전체', description: '첫 장면에 모든 캐릭터 등장' },
];

// 시간대 옵션
const TIME_OF_DAY_OPTIONS: { value: NonNullable<StoryOpening['timeOfDay']>; label: string; emoji: string }[] = [
  { value: 'dawn', label: '새벽', emoji: '🌅' },
  { value: 'morning', label: '아침', emoji: '☀️' },
  { value: 'afternoon', label: '오후', emoji: '🌤️' },
  { value: 'evening', label: '저녁', emoji: '🌇' },
  { value: 'night', label: '밤', emoji: '🌙' },
];

export default function StoryOpeningContent({ scenario, setScenario }: Props) {
  // 스토리 오프닝 업데이트 헬퍼
  const updateStoryOpening = (updates: Partial<StoryOpening>) => {
    setScenario((prev) => ({
      ...prev,
      storyOpening: {
        ...prev.storyOpening,
        ...updates,
      },
    }));
  };

  // 주인공 설정 업데이트 헬퍼
  const updateProtagonistSetup = (updates: Partial<NonNullable<StoryOpening['protagonistSetup']>>) => {
    setScenario((prev) => ({
      ...prev,
      storyOpening: {
        ...prev.storyOpening,
        protagonistSetup: {
          ...prev.storyOpening?.protagonistSetup,
          ...updates,
        },
      },
    }));
  };

  const storyOpening = scenario.storyOpening || {};
  const protagonistSetup = storyOpening.protagonistSetup || {};

  // 첫 번째 캐릭터 선택을 위한 옵션
  const characterOptions = scenario.characters
    .filter((c) => c.characterName !== '(플레이어)')
    .map((c) => ({
      value: c.characterName,
      label: `${c.characterName} (${c.roleName})`,
    }));

  return (
    <div className="space-y-6">
      {/* 헤더 설명 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <BookOpen className="h-5 w-5" />
            스토리 오프닝 시스템
          </CardTitle>
          <CardDescription className="text-purple-600">
            플레이어가 게임을 시작했을 때 보게 될 이야기의 첫 장면을 설정합니다.
            <br />
            3단계 구조로 구성됩니다: <strong>프롤로그</strong> → <strong>촉발 사건</strong> → <strong>첫 캐릭터 만남</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 주인공 설정 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
            <User className="h-5 w-5" />
            주인공 설정
          </CardTitle>
          <CardDescription>
            AI가 자연스러운 오프닝을 생성하기 위한 주인공 정보입니다. (선택사항)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">주인공 이름</Label>
              <Input
                value={protagonistSetup.name || ''}
                onChange={(e) => updateProtagonistSetup({ name: e.target.value })}
                placeholder="예: 김민준"
                className="mt-1 border-socratic-grey bg-parchment-white"
              />
              <p className="mt-1 text-xs text-gray-500">비워두면 AI가 적절히 호칭합니다</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">직업/역할</Label>
              <Input
                value={protagonistSetup.occupation || ''}
                onChange={(e) => updateProtagonistSetup({ occupation: e.target.value })}
                placeholder="예: 평범한 회사원, 대학생, 의사"
                className="mt-1 border-socratic-grey bg-parchment-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">성격 특성</Label>
            <Input
              value={protagonistSetup.personality || ''}
              onChange={(e) => updateProtagonistSetup({ personality: e.target.value })}
              placeholder="예: 조용하지만 책임감 있는 성격, 낙천적이고 사교적인"
              className="mt-1 border-socratic-grey bg-parchment-white"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">일상 루틴</Label>
            <Textarea
              value={protagonistSetup.dailyRoutine || ''}
              onChange={(e) => updateProtagonistSetup({ dailyRoutine: e.target.value })}
              placeholder="예: 매일 같은 시간에 출근하고, 점심은 회사 근처 식당에서 먹고, 퇴근 후에는 집에서 넷플릭스를 본다."
              className="mt-1 min-h-[80px] border-socratic-grey bg-parchment-white"
            />
            <p className="mt-1 text-xs text-gray-500">프롤로그에서 평범한 삶을 묘사할 때 참고합니다</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">약점/고민</Label>
            <Input
              value={protagonistSetup.weakness || ''}
              onChange={(e) => updateProtagonistSetup({ weakness: e.target.value })}
              placeholder="예: 자신감 부족, 지루한 일상에 대한 불만, 가족과의 갈등"
              className="mt-1 border-socratic-grey bg-parchment-white"
            />
            <p className="mt-1 text-xs text-gray-500">캐릭터에 깊이를 더하고 공감을 유도합니다</p>
          </div>
        </CardContent>
      </Card>

      {/* 오프닝 스타일 설정 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
            <Palette className="h-5 w-5" />
            오프닝 스타일
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 오프닝 톤 */}
            <div>
              <Label className="text-sm font-medium text-gray-700">오프닝 톤</Label>
              <Select
                value={storyOpening.openingTone || 'calm'}
                onValueChange={(value) => updateStoryOpening({ openingTone: value as OpeningTone })}
              >
                <SelectTrigger className="mt-1 border-socratic-grey bg-parchment-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENING_TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 캐릭터 소개 방식 */}
            <div>
              <Label className="text-sm font-medium text-gray-700">캐릭터 소개 방식</Label>
              <Select
                value={storyOpening.characterIntroductionStyle || 'contextual'}
                onValueChange={(value) => updateStoryOpening({ characterIntroductionStyle: value as CharacterIntroductionStyle })}
              >
                <SelectTrigger className="mt-1 border-socratic-grey bg-parchment-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTRO_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 시간대 */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                오프닝 시간대
              </Label>
              <Select
                value={storyOpening.timeOfDay || 'morning'}
                onValueChange={(value) => updateStoryOpening({ timeOfDay: value as StoryOpening['timeOfDay'] })}
              >
                <SelectTrigger className="mt-1 border-socratic-grey bg-parchment-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OF_DAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span>{option.emoji} {option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 오프닝 장소 */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" />
                오프닝 장소
              </Label>
              <Input
                value={storyOpening.openingLocation || ''}
                onChange={(e) => updateStoryOpening({ openingLocation: e.target.value })}
                placeholder="예: 서울 강남의 한 오피스 빌딩"
                className="mt-1 border-socratic-grey bg-parchment-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3단계 스토리 구조 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-kairos-gold">스토리 3단계 구조</CardTitle>
          <CardDescription>
            각 단계를 직접 작성하거나 비워두면 AI가 시나리오 정보를 바탕으로 자동 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1단계: 프롤로그 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-700">1단계</Badge>
              <h4 className="font-medium text-blue-800">프롤로그 - 주인공의 일상</h4>
            </div>
            <Textarea
              value={storyOpening.prologue || ''}
              onChange={(e) => updateStoryOpening({ prologue: e.target.value })}
              placeholder="예: 평범한 도시의 평범한 회사원 김민준. 그의 삶은 어제까지 반복되는 서류 작업과 야근의 연속이었다."
              className="min-h-[100px] border-blue-200 bg-white"
            />
            <p className="mt-2 text-xs text-blue-600">
              주인공의 평범한 삶, 일상적인 환경을 묘사합니다. 변화가 더 충격적으로 느껴지도록 평화로운 분위기로 시작하세요.
            </p>
          </div>

          {/* 2단계: 촉발 사건 */}
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-700">2단계</Badge>
              <Zap className="h-4 w-4 text-orange-600" />
              <h4 className="font-medium text-orange-800">촉발 사건 - 변화의 순간</h4>
            </div>
            <Textarea
              value={storyOpening.incitingIncident || ''}
              onChange={(e) => updateStoryOpening({ incitingIncident: e.target.value })}
              placeholder="예: 하지만 오늘, 그의 손끝에서 푸른빛이 터져 나왔다. 억누를 수 없는 힘이 그의 몸을 휘감았다."
              className="min-h-[100px] border-orange-200 bg-white"
            />
            <p className="mt-2 text-xs text-orange-600">
              일상을 깨뜨리는 결정적 순간입니다. &quot;이제 돌아갈 수 없다&quot;는 느낌을 주세요.
            </p>
          </div>

          {/* 3단계: 첫 캐릭터 만남 */}
          <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-700">3단계</Badge>
              <Users className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-800">첫 캐릭터 만남</h4>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm text-green-700">첫 번째 만날 캐릭터</Label>
                <Select
                  value={storyOpening.firstCharacterToMeet || ''}
                  onValueChange={(value) => updateStoryOpening({ firstCharacterToMeet: value })}
                >
                  <SelectTrigger className="mt-1 border-green-200 bg-white">
                    <SelectValue placeholder="캐릭터 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {characterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-green-600">비워두면 첫 번째 캐릭터가 자동 선택됩니다</p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-green-700">첫 대면 상황</Label>
              <Textarea
                value={storyOpening.firstEncounterContext || ''}
                onChange={(e) => updateStoryOpening({ firstEncounterContext: e.target.value })}
                placeholder="예: 그녀는 주인공의 이상한 행동을 목격하고 조용히 다가왔다"
                className="mt-1 min-h-[80px] border-green-200 bg-white"
              />
              <p className="mt-2 text-xs text-green-600">
                첫 캐릭터와 어떤 상황에서 만나는지 설명합니다. 관계 설정의 첫 단추입니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테마 요소 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-kairos-gold">테마 요소</CardTitle>
          <CardDescription>
            오프닝에서 강조할 테마나 키워드를 입력하세요. (쉼표로 구분)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={storyOpening.thematicElements?.join(', ') || ''}
            onChange={(e) => {
              const elements = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
              updateStoryOpening({ thematicElements: elements });
            }}
            placeholder="예: 변화, 선택, 운명, 책임, 성장"
            className="border-socratic-grey bg-parchment-white"
          />
          <p className="mt-2 text-xs text-gray-500">
            AI가 이 키워드들을 오프닝에 자연스럽게 녹여서 작성합니다. 비워두면 시나리오 키워드를 사용합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
