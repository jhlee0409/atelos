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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BookOpen, User, Zap, Users, Clock, MapPin, Palette, Eye, EyeOff, Sparkles, ListOrdered, Plus, Trash2, Link2, Loader2, Wand2, RefreshCw, Lock } from 'lucide-react';
import type {
  ScenarioData,
  StoryOpening,
  OpeningTone,
  CharacterIntroductionStyle,
  CharacterIntroductionSequence,
  HiddenNPCRelationship,
  RelationshipVisibility,
} from '@/types';
import { SetStateAction, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  generateWithAI,
  type StoryOpeningResult,
  type CharacterIntroductionsResult,
  type HiddenRelationshipsResult,
  type CharacterRevelationsResult,
} from '@/lib/ai-scenario-generator';

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

// [2025 Enhanced] NPC 관계 노출 모드 옵션
const NPC_RELATIONSHIP_EXPOSURE_OPTIONS: {
  value: NonNullable<StoryOpening['npcRelationshipExposure']>;
  label: string;
  description: string;
  icon: 'hidden' | 'partial' | 'visible';
}[] = [
  {
    value: 'hidden',
    label: '숨김 (권장)',
    description: 'NPC-NPC 관계를 플레이어가 발견할 때까지 완전히 숨김',
    icon: 'hidden',
  },
  {
    value: 'partial',
    label: '일부 공개',
    description: '일부 관계만 초기에 공개, 나머지는 숨김',
    icon: 'partial',
  },
  {
    value: 'visible',
    label: '모두 공개 (기존 방식)',
    description: '모든 NPC 관계를 처음부터 공개',
    icon: 'visible',
  },
];

// [2025 Enhanced] 캐릭터 만남 시점 옵션
const EXPECTED_TIMING_OPTIONS: {
  value: NonNullable<CharacterIntroductionSequence['expectedTiming']>;
  label: string;
}[] = [
  { value: 'opening', label: '오프닝' },
  { value: 'day1', label: '1일차' },
  { value: 'day2', label: '2일차' },
  { value: 'event-driven', label: '이벤트 기반' },
];

export default function StoryOpeningContent({ scenario, setScenario }: Props) {
  // AI 생성 로딩 상태
  const [isGeneratingOpening, setIsGeneratingOpening] = useState(false);
  const [isGeneratingIntroductions, setIsGeneratingIntroductions] = useState(false);
  const [isGeneratingHiddenRels, setIsGeneratingHiddenRels] = useState(false);
  const [isGeneratingRevelations, setIsGeneratingRevelations] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

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

  // [2025 Enhanced] 1:1 소개 시퀀스 활성화 상태
  const [useIntroSequence, setUseIntroSequence] = useState(
    !!(storyOpening.characterIntroductionSequence && storyOpening.characterIntroductionSequence.length > 0)
  );

  // AI 생성을 위한 시나리오 컨텍스트 생성
  const buildScenarioContext = useCallback(() => {
    const characterDetails = scenario.characters
      .map((c) => `- ${c.characterName} (${c.roleName}): ${c.backstory || ''}`)
      .join('\n');

    const scenarioInput = `시나리오: ${scenario.title}
시놉시스: ${scenario.synopsis}
플레이어 목표: ${scenario.playerGoal}
장르: ${scenario.genre?.join(', ') || ''}
배경: ${scenario.setting?.place || ''}, ${scenario.setting?.time || ''}

등장 캐릭터:
${characterDetails}`;

    const context = {
      genre: scenario.genre || [],
      title: scenario.title,
      synopsis: scenario.synopsis,
      existingCharacters: scenario.characters.map((c) => `${c.characterName} (${c.roleName})`),
    };

    return { scenarioInput, context };
  }, [scenario]);

  // 스토리 오프닝 AI 생성
  const handleGenerateStoryOpening = useCallback(async () => {
    setIsGeneratingOpening(true);
    try {
      const { scenarioInput, context } = buildScenarioContext();
      const response = await generateWithAI<StoryOpeningResult>('story_opening', scenarioInput, context);

      if (response.data) {
        updateStoryOpening({
          prologue: response.data.prologue,
          incitingIncident: response.data.incitingIncident,
          firstCharacterToMeet: response.data.firstCharacterToMeet,
          firstEncounterContext: response.data.firstEncounterContext,
          protagonistSetup: response.data.protagonistSetup,
          openingTone: response.data.openingTone,
          characterIntroductionStyle: response.data.characterIntroductionStyle,
          timeOfDay: response.data.timeOfDay,
          openingLocation: response.data.openingLocation,
          thematicElements: response.data.thematicElements,
          npcRelationshipExposure: response.data.npcRelationshipExposure || 'hidden',
        });
        toast.success('스토리 오프닝이 생성되었습니다');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '스토리 오프닝 생성에 실패했습니다');
    } finally {
      setIsGeneratingOpening(false);
    }
  }, [buildScenarioContext]);

  // 캐릭터 소개 시퀀스 AI 생성
  const handleGenerateIntroductions = useCallback(async () => {
    if (scenario.characters.length < 2) {
      toast.error('캐릭터가 2명 이상 필요합니다');
      return;
    }
    setIsGeneratingIntroductions(true);
    try {
      const { scenarioInput, context } = buildScenarioContext();
      const response = await generateWithAI<CharacterIntroductionsResult>('character_introductions', scenarioInput, context);

      if (response.data?.characterIntroductionSequence) {
        const sequence = response.data.characterIntroductionSequence.map((intro) => ({
          characterName: intro.characterName,
          order: intro.order,
          encounterContext: intro.encounterContext,
          firstImpressionKeywords: intro.firstImpressionKeywords,
          expectedTiming: intro.expectedTiming,
        }));

        // 첫 번째 캐릭터 찾기 (order=1)
        const firstInSequence = sequence.find((s) => s.order === 1);

        // firstCharacterToMeet 자동 동기화
        updateStoryOpening({
          characterIntroductionSequence: sequence,
          // 시퀀스의 첫 캐릭터와 firstCharacterToMeet 동기화
          ...(firstInSequence && {
            firstCharacterToMeet: firstInSequence.characterName,
            firstEncounterContext: firstInSequence.encounterContext,
          }),
        });
        setUseIntroSequence(true);
        toast.success('캐릭터 소개 시퀀스가 생성되었습니다 (첫 캐릭터 자동 동기화됨)');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '캐릭터 소개 시퀀스 생성에 실패했습니다');
    } finally {
      setIsGeneratingIntroductions(false);
    }
  }, [buildScenarioContext, scenario.characters.length]);

  // 숨겨진 NPC 관계 AI 생성
  const handleGenerateHiddenRelationships = useCallback(async () => {
    if (scenario.characters.length < 2) {
      toast.error('캐릭터가 2명 이상 필요합니다');
      return;
    }
    setIsGeneratingHiddenRels(true);
    try {
      const { scenarioInput, context } = buildScenarioContext();
      const response = await generateWithAI<HiddenRelationshipsResult>('hidden_relationships', scenarioInput, context);

      if (response.data?.hiddenNPCRelationships) {
        updateStoryOpening({
          hiddenNPCRelationships: response.data.hiddenNPCRelationships.map((rel) => ({
            relationId: rel.relationId,
            characterA: rel.characterA,
            characterB: rel.characterB,
            actualValue: rel.actualValue,
            relationshipType: rel.relationshipType,
            backstory: rel.backstory,
            visibility: rel.visibility as 'hidden' | 'hinted',
            discoveryMethods: [{
              method: rel.discoveryMethod,
              revealsTo: 'revealed' as const,
              hintText: rel.discoveryHint,
            }],
          })),
        });
        toast.success('숨겨진 NPC 관계가 생성되었습니다');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '숨겨진 관계 생성에 실패했습니다');
    } finally {
      setIsGeneratingHiddenRels(false);
    }
  }, [buildScenarioContext, scenario.characters.length]);

  // 점진적 캐릭터 공개 AI 생성
  const handleGenerateRevelations = useCallback(async () => {
    if (scenario.characters.length < 1) {
      toast.error('캐릭터가 1명 이상 필요합니다');
      return;
    }
    setIsGeneratingRevelations(true);
    try {
      const { scenarioInput, context } = buildScenarioContext();
      const response = await generateWithAI<CharacterRevelationsResult>('character_revelations', scenarioInput, context);

      if (response.data?.characterRevelations) {
        updateStoryOpening({
          characterRevelations: response.data.characterRevelations.map((rev) => ({
            characterName: rev.characterName,
            revelationLayers: rev.revelationLayers,
            ultimateSecret: rev.ultimateSecret,
          })),
        });
        toast.success('점진적 캐릭터 공개가 생성되었습니다');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '캐릭터 공개 설정 생성에 실패했습니다');
    } finally {
      setIsGeneratingRevelations(false);
    }
  }, [buildScenarioContext, scenario.characters.length]);

  // 모든 2025 Enhanced 기능 일괄 생성
  const handleGenerateAllEnhanced = useCallback(async () => {
    if (scenario.characters.length < 2) {
      toast.error('캐릭터가 2명 이상 필요합니다');
      return;
    }
    setIsGeneratingAll(true);
    try {
      const { scenarioInput, context } = buildScenarioContext();

      const [openingRes, introRes, hiddenRes, revRes] = await Promise.all([
        generateWithAI<StoryOpeningResult>('story_opening', scenarioInput, context),
        generateWithAI<CharacterIntroductionsResult>('character_introductions', scenarioInput, context),
        generateWithAI<HiddenRelationshipsResult>('hidden_relationships', scenarioInput, context),
        generateWithAI<CharacterRevelationsResult>('character_revelations', scenarioInput, context),
      ]);

      const updates: Partial<StoryOpening> = {};

      if (openingRes.data) {
        updates.prologue = openingRes.data.prologue;
        updates.incitingIncident = openingRes.data.incitingIncident;
        updates.firstCharacterToMeet = openingRes.data.firstCharacterToMeet;
        updates.firstEncounterContext = openingRes.data.firstEncounterContext;
        updates.protagonistSetup = openingRes.data.protagonistSetup;
        updates.openingTone = openingRes.data.openingTone;
        updates.characterIntroductionStyle = openingRes.data.characterIntroductionStyle;
        updates.timeOfDay = openingRes.data.timeOfDay;
        updates.openingLocation = openingRes.data.openingLocation;
        updates.thematicElements = openingRes.data.thematicElements;
        updates.npcRelationshipExposure = openingRes.data.npcRelationshipExposure || 'hidden';
      }

      if (introRes.data?.characterIntroductionSequence) {
        updates.characterIntroductionSequence = introRes.data.characterIntroductionSequence;
        setUseIntroSequence(true);

        // [일관성 보장] 시퀀스의 첫 캐릭터와 firstCharacterToMeet 동기화
        const firstInSequence = introRes.data.characterIntroductionSequence.find((s) => s.order === 1);
        if (firstInSequence) {
          updates.firstCharacterToMeet = firstInSequence.characterName;
          updates.firstEncounterContext = firstInSequence.encounterContext;
        }
      }

      if (hiddenRes.data?.hiddenNPCRelationships) {
        updates.hiddenNPCRelationships = hiddenRes.data.hiddenNPCRelationships.map((rel) => ({
          relationId: rel.relationId,
          characterA: rel.characterA,
          characterB: rel.characterB,
          actualValue: rel.actualValue,
          relationshipType: rel.relationshipType,
          backstory: rel.backstory,
          visibility: rel.visibility as 'hidden' | 'hinted',
          discoveryMethods: [{
            method: rel.discoveryMethod,
            revealsTo: 'revealed' as const,
            hintText: rel.discoveryHint,
          }],
        }));
      }

      if (revRes.data?.characterRevelations) {
        updates.characterRevelations = revRes.data.characterRevelations;
      }

      updateStoryOpening(updates);
      toast.success('스토리 오프닝 시스템이 모두 생성되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성에 실패했습니다');
    } finally {
      setIsGeneratingAll(false);
    }
  }, [buildScenarioContext, scenario.characters.length]);

  const isAnyGenerating = isGeneratingOpening || isGeneratingIntroductions || isGeneratingHiddenRels || isGeneratingRevelations || isGeneratingAll;

  // 첫 번째 캐릭터 선택을 위한 옵션
  const characterOptions = scenario.characters
    .filter((c) => c.characterName !== '(플레이어)')
    .map((c) => ({
      value: c.characterName,
      label: `${c.characterName} (${c.roleName})`,
    }));

  // [2025 Enhanced] 캐릭터 소개 시퀀스 업데이트 헬퍼
  const updateCharacterIntroSequence = (sequence: CharacterIntroductionSequence[]) => {
    updateStoryOpening({ characterIntroductionSequence: sequence });
  };

  // [2025 Enhanced] 시퀀스에 캐릭터 추가
  const addCharacterToSequence = () => {
    const currentSequence = storyOpening.characterIntroductionSequence || [];
    const usedCharacters = currentSequence.map((s) => s.characterName);
    const availableCharacters = characterOptions.filter((c) => !usedCharacters.includes(c.value));

    if (availableCharacters.length === 0) return;

    const newSequence: CharacterIntroductionSequence[] = [
      ...currentSequence,
      {
        characterName: availableCharacters[0].value,
        order: currentSequence.length + 1,
        encounterContext: '',
        expectedTiming: currentSequence.length === 0 ? 'opening' : 'day1',
      },
    ];
    updateCharacterIntroSequence(newSequence);
  };

  // [2025 Enhanced] 시퀀스에서 캐릭터 제거
  const removeCharacterFromSequence = (index: number) => {
    const currentSequence = storyOpening.characterIntroductionSequence || [];
    const newSequence = currentSequence
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, order: i + 1 }));
    updateCharacterIntroSequence(newSequence);
  };

  // [2025 Enhanced] 시퀀스 아이템 업데이트
  const updateSequenceItem = (index: number, updates: Partial<CharacterIntroductionSequence>) => {
    const currentSequence = storyOpening.characterIntroductionSequence || [];
    const newSequence = currentSequence.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    updateCharacterIntroSequence(newSequence);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 설명 + AI 일괄 생성 버튼 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <BookOpen className="h-5 w-5" />
                스토리 오프닝 시스템
              </CardTitle>
              <CardDescription className="text-purple-600 mt-1">
                플레이어가 게임을 시작했을 때 보게 될 이야기의 첫 장면을 설정합니다.
                <br />
                3단계 구조로 구성됩니다: <strong>프롤로그</strong> → <strong>촉발 사건</strong> → <strong>첫 캐릭터 만남</strong>
              </CardDescription>
            </div>
            <Button
              onClick={handleGenerateAllEnhanced}
              disabled={isAnyGenerating || scenario.characters.length < 2}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI 전체 생성
                </>
              )}
            </Button>
          </div>
          {scenario.characters.length < 2 && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              AI 생성을 위해 캐릭터 2명 이상이 필요합니다
            </p>
          )}
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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg text-kairos-gold">스토리 3단계 구조</CardTitle>
              <CardDescription>
                각 단계를 직접 작성하거나 비워두면 AI가 시나리오 정보를 바탕으로 자동 생성합니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateStoryOpening}
              disabled={isAnyGenerating}
              className="border-kairos-gold/30 hover:bg-kairos-gold/10"
            >
              {isGeneratingOpening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  AI 재생성
                </>
              )}
            </Button>
          </div>
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

      <Separator className="my-8" />

      {/* 2025 Enhanced Features Header */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <Sparkles className="h-5 w-5" />
            2025 Enhanced Features
          </CardTitle>
          <CardDescription className="text-indigo-600">
            최신 인터랙티브 픽션 패턴을 적용한 고급 몰입감 향상 기능입니다.
            <br />
            <strong>핵심 변화:</strong> 1:1 캐릭터 소개 &bull; NPC 관계 숨김 &bull; 점진적 정보 공개
          </CardDescription>
        </CardHeader>
      </Card>

      {/* [2025 Enhanced] NPC 관계 노출 모드 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
            <Link2 className="h-5 w-5" />
            NPC 관계 노출 설정
          </CardTitle>
          <CardDescription>
            NPC들 간의 관계를 플레이어에게 어떻게 노출할지 설정합니다.
            <br />
            <strong className="text-indigo-600">&apos;숨김&apos;</strong>을 권장: 플레이어가 행동(대화, 탐색)을 통해 관계를 발견하면 몰입감이 높아집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {NPC_RELATIONSHIP_EXPOSURE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  (storyOpening.npcRelationshipExposure || 'hidden') === option.value
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateStoryOpening({ npcRelationshipExposure: option.value })}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  {option.icon === 'hidden' && <EyeOff className="h-4 w-4 text-indigo-600" />}
                  {option.icon === 'partial' && <Eye className="h-4 w-4 text-yellow-600" />}
                  {option.icon === 'visible' && <Eye className="h-4 w-4 text-green-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {option.value === 'hidden' && (
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700 text-xs">
                        권장
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${
                  (storyOpening.npcRelationshipExposure || 'hidden') === option.value
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}>
                  {(storyOpening.npcRelationshipExposure || 'hidden') === option.value && (
                    <div className="m-0.5 h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* [2025 Enhanced] 1:1 캐릭터 소개 시퀀스 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
                <ListOrdered className="h-5 w-5" />
                1:1 캐릭터 소개 시퀀스
              </CardTitle>
              <CardDescription>
                주인공이 각 NPC를 개별적으로 만나는 순서와 상황을 정의합니다.
                <br />
                활성화하면 기존 &apos;캐릭터 소개 방식&apos; 설정 대신 이 시퀀스가 사용됩니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateIntroductions}
              disabled={isAnyGenerating || scenario.characters.length < 2}
              className="border-indigo-300 hover:bg-indigo-50"
            >
              {isGeneratingIntroductions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI 생성
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 활성화 토글 */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <Label className="font-medium">1:1 소개 시퀀스 사용</Label>
              <p className="text-sm text-gray-500">
                캐릭터들을 개별적으로 1:1로 만나도록 설정
              </p>
            </div>
            <Switch
              checked={useIntroSequence}
              onCheckedChange={(checked) => {
                setUseIntroSequence(checked);
                if (!checked) {
                  updateStoryOpening({ characterIntroductionSequence: undefined });
                } else if (!storyOpening.characterIntroductionSequence?.length) {
                  // 첫 번째 캐릭터 자동 추가
                  if (characterOptions.length > 0) {
                    updateCharacterIntroSequence([{
                      characterName: characterOptions[0].value,
                      order: 1,
                      encounterContext: '',
                      expectedTiming: 'opening',
                    }]);
                  }
                }
              }}
            />
          </div>

          {/* 시퀀스 목록 */}
          {useIntroSequence && (
            <div className="space-y-3">
              {(storyOpening.characterIntroductionSequence || []).map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                        {item.order}번째
                      </Badge>
                      <span className="font-medium text-indigo-800">만남</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharacterFromSequence(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-sm text-indigo-700">캐릭터</Label>
                      <Select
                        value={item.characterName}
                        onValueChange={(value) => updateSequenceItem(index, { characterName: value })}
                      >
                        <SelectTrigger className="mt-1 border-indigo-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {characterOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-indigo-700">만남 시점</Label>
                      <Select
                        value={item.expectedTiming || 'day1'}
                        onValueChange={(value) =>
                          updateSequenceItem(index, {
                            expectedTiming: value as CharacterIntroductionSequence['expectedTiming'],
                          })
                        }
                      >
                        <SelectTrigger className="mt-1 border-indigo-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPECTED_TIMING_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-sm text-indigo-700">만남 상황</Label>
                    <Textarea
                      value={item.encounterContext}
                      onChange={(e) => updateSequenceItem(index, { encounterContext: e.target.value })}
                      placeholder="예: 혼란스러운 상황에서 우연히 마주침"
                      className="mt-1 min-h-[60px] border-indigo-200 bg-white"
                    />
                  </div>

                  <div className="mt-3">
                    <Label className="text-sm text-indigo-700">첫인상 키워드 (쉼표로 구분)</Label>
                    <Input
                      value={item.firstImpressionKeywords?.join(', ') || ''}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                        updateSequenceItem(index, { firstImpressionKeywords: keywords });
                      }}
                      placeholder="예: 차분함, 신뢰감, 의심"
                      className="mt-1 border-indigo-200 bg-white"
                    />
                  </div>
                </div>
              ))}

              {/* 캐릭터 추가 버튼 */}
              {characterOptions.length > (storyOpening.characterIntroductionSequence?.length || 0) && (
                <Button
                  variant="outline"
                  onClick={addCharacterToSequence}
                  className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  캐릭터 만남 추가
                </Button>
              )}

              {(storyOpening.characterIntroductionSequence?.length || 0) === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>아직 추가된 캐릭터가 없습니다.</p>
                  <p className="text-sm">위 버튼을 눌러 1:1 만남 순서를 추가하세요.</p>
                </div>
              )}
            </div>
          )}

          {!useIntroSequence && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-gray-500">
              <EyeOff className="mx-auto mb-2 h-6 w-6 opacity-50" />
              <p className="text-sm">
                1:1 소개 시퀀스가 비활성화되어 있습니다.
                <br />
                기존 &apos;캐릭터 소개 방식&apos; 설정이 사용됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* [2025 Enhanced] 숨겨진 NPC 관계 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
                <Link2 className="h-5 w-5" />
                숨겨진 NPC 관계
              </CardTitle>
              <CardDescription>
                NPC들 간의 비밀 관계를 설정합니다. 플레이어는 게임 중 대화/탐색으로 발견합니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateHiddenRelationships}
              disabled={isAnyGenerating || scenario.characters.length < 2}
              className="border-rose-300 hover:bg-rose-50"
            >
              {isGeneratingHiddenRels ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI 생성
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storyOpening.hiddenNPCRelationships && storyOpening.hiddenNPCRelationships.length > 0 ? (
            <div className="space-y-3">
              {storyOpening.hiddenNPCRelationships.map((rel, idx) => (
                <div key={idx} className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-rose-800">{rel.characterA}</span>
                      <span className="text-rose-400">↔</span>
                      <span className="font-medium text-rose-800">{rel.characterB}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rel.visibility === 'hidden' ? 'destructive' : 'secondary'} className="text-xs">
                        {rel.visibility === 'hidden' ? '숨김' : '힌트'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rel.actualValue > 0 ? '+' : ''}{rel.actualValue}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newRels = storyOpening.hiddenNPCRelationships?.filter((_, i) => i !== idx);
                          updateStoryOpening({ hiddenNPCRelationships: newRels });
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-rose-700 font-medium">{rel.relationshipType}</p>
                  <p className="text-xs text-gray-600 mt-1">{rel.backstory}</p>
                  {rel.discoveryMethods && rel.discoveryMethods[0] && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      발견: {rel.discoveryMethods[0].method} - {rel.discoveryMethods[0].hintText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
              <Link2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>숨겨진 NPC 관계가 없습니다.</p>
              <p className="text-sm">AI 생성 버튼을 눌러 NPC들 간의 비밀 관계를 추가하세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* [2025 Enhanced] 점진적 캐릭터 공개 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
                <Lock className="h-5 w-5" />
                점진적 캐릭터 공개
              </CardTitle>
              <CardDescription>
                신뢰도에 따라 캐릭터 정보가 단계적으로 공개됩니다. 깊은 관계일수록 더 많은 비밀이 드러납니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateRevelations}
              disabled={isAnyGenerating || scenario.characters.length < 1}
              className="border-amber-300 hover:bg-amber-50"
            >
              {isGeneratingRevelations ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI 생성
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storyOpening.characterRevelations && storyOpening.characterRevelations.length > 0 ? (
            <div className="space-y-4">
              {storyOpening.characterRevelations.map((rev, idx) => (
                <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-amber-800">{rev.characterName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newRevs = storyOpening.characterRevelations?.filter((_, i) => i !== idx);
                        updateStoryOpening({ characterRevelations: newRevs });
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {rev.revelationLayers?.map((layer, layerIdx) => (
                      <div key={layerIdx} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">
                          신뢰 {layer.trustThreshold}+
                        </Badge>
                        <span className="text-xs text-amber-600">[{layer.revelationType}]</span>
                        <span className="text-gray-700">{layer.content}</span>
                      </div>
                    ))}
                    {rev.ultimateSecret && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          궁극의 비밀:
                        </span>
                        <p className="text-sm text-gray-700 mt-1">{rev.ultimateSecret}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
              <Lock className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>점진적 캐릭터 공개 설정이 없습니다.</p>
              <p className="text-sm">AI 생성 버튼을 눌러 캐릭터별 비밀 공개 레이어를 추가하세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* [2025 Enhanced] 이머전트 내러티브 힌트 */}
      <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-kairos-gold">
            <Sparkles className="h-5 w-5" />
            이머전트 내러티브 (동적 스토리)
          </CardTitle>
          <CardDescription>
            플레이어 행동 조합에 따라 동적으로 발생하는 스토리 이벤트를 위한 가이드라인입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <Label className="font-medium">이머전트 내러티브 활성화</Label>
              <p className="text-sm text-gray-500">
                플레이어 행동에서 자연스럽게 발생하는 동적 스토리 이벤트
              </p>
            </div>
            <Switch
              checked={storyOpening.emergentNarrative?.enabled || false}
              onCheckedChange={(checked) => {
                updateStoryOpening({
                  emergentNarrative: {
                    enabled: checked,
                    triggers: storyOpening.emergentNarrative?.triggers || [],
                    dynamicEventGuidelines: storyOpening.emergentNarrative?.dynamicEventGuidelines,
                  },
                });
              }}
            />
          </div>

          {storyOpening.emergentNarrative?.enabled && (
            <div>
              <Label className="text-sm font-medium text-gray-700">동적 이벤트 가이드라인 (AI용)</Label>
              <Textarea
                value={storyOpening.emergentNarrative?.dynamicEventGuidelines || ''}
                onChange={(e) => {
                  updateStoryOpening({
                    emergentNarrative: {
                      ...storyOpening.emergentNarrative,
                      enabled: true,
                      triggers: storyOpening.emergentNarrative?.triggers || [],
                      dynamicEventGuidelines: e.target.value,
                    },
                  });
                }}
                placeholder="예: 캐릭터 A와 B가 모두 만난 후, 둘의 과거 관계에 대한 힌트를 자연스럽게 흘려주세요."
                className="mt-1 min-h-[100px] border-socratic-grey bg-parchment-white"
              />
              <p className="mt-2 text-xs text-gray-500">
                AI가 동적 이벤트를 생성할 때 참고할 가이드라인입니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
