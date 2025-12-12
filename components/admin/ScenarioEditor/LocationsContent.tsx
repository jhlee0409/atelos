'use client';

import { SetStateAction, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScenarioData, ScenarioLocation, LocationIcon } from '@/types';
import {
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  MapPin,
  Warehouse,
  DoorOpen,
  Cross,
  Building2,
  ArrowDown,
  Bed,
  Briefcase,
  Compass,
  Eye,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { generateWithAI, LocationsResult } from '@/lib/ai-scenario-generator';
import { toast } from 'sonner';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
};

// 아이콘 매핑
const ICON_OPTIONS: { value: LocationIcon; label: string; icon: React.ReactNode }[] = [
  { value: 'warehouse', label: '창고', icon: <Warehouse className="h-4 w-4" /> },
  { value: 'entrance', label: '입구', icon: <DoorOpen className="h-4 w-4" /> },
  { value: 'medical', label: '의무실', icon: <Cross className="h-4 w-4" /> },
  { value: 'roof', label: '옥상', icon: <Building2 className="h-4 w-4" /> },
  { value: 'basement', label: '지하', icon: <ArrowDown className="h-4 w-4" /> },
  { value: 'quarters', label: '숙소', icon: <Bed className="h-4 w-4" /> },
  { value: 'office', label: '사무실', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'corridor', label: '복도', icon: <Compass className="h-4 w-4" /> },
  { value: 'exterior', label: '외부', icon: <Eye className="h-4 w-4" /> },
  { value: 'hidden', label: '숨겨진 장소', icon: <MapPin className="h-4 w-4" /> },
];

// 초기 상태 옵션
const STATUS_OPTIONS = [
  { value: 'available', label: '접근 가능' },
  { value: 'locked', label: '잠김 (조건부 해금)' },
  { value: 'hidden', label: '숨김 (발견 필요)' },
];

// 기본 위치 템플릿
const DEFAULT_LOCATION: ScenarioLocation = {
  locationId: '',
  name: '',
  description: '',
  icon: 'hidden',
  initialStatus: 'available',
  dangerLevel: 0,
  explorationCooldown: 1,
};

export default function LocationsContent({ scenario, setScenario }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const locations = scenario.locations || [];

  // 위치 추가
  const addLocation = () => {
    const newId = `loc_${Date.now()}`;
    const newLocation: ScenarioLocation = {
      ...DEFAULT_LOCATION,
      locationId: newId,
      name: `새 장소 ${locations.length + 1}`,
      description: '장소 설명을 입력하세요.',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      locations: [...(prev.locations || []), newLocation],
    }));
    setEditingIndex(locations.length);
  };

  // 위치 업데이트
  const updateLocation = (index: number, updates: Partial<ScenarioLocation>) => {
    setScenario((prev) => ({
      ...prev,
      locations: (prev.locations || []).map((loc, i) =>
        i === index ? { ...loc, ...updates } : loc
      ),
    }));
  };

  // 위치 삭제
  const removeLocation = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      locations: (prev.locations || []).filter((_, i) => i !== index),
    }));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  // 위치 이동 (순서 변경)
  const moveLocation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= locations.length) return;

    setScenario((prev) => {
      const newLocations = [...(prev.locations || [])];
      [newLocations[index], newLocations[newIndex]] = [newLocations[newIndex], newLocations[index]];
      return { ...prev, locations: newLocations };
    });
    setEditingIndex(newIndex);
  };

  // AI 생성
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateWithAI<LocationsResult>(
        'locations',
        scenario.synopsis || scenario.title,
        {
          genre: scenario.genre,
          title: scenario.title,
          synopsis: scenario.synopsis,
          totalDays: scenario.endCondition?.value || 7,
        }
      );

      if (response.success && response.data) {
        const data = response.data;
        setScenario((prev) => ({
          ...prev,
          locations: data.locations.map((loc, i) => ({
            ...loc,
            locationId: loc.locationId || `loc_${Date.now()}_${i}`,
          })),
        }));
        toast.success(`${data.locations.length}개의 탐색 위치가 생성되었습니다!`);
        if (data.reasoning) {
          toast.info(`AI 설명: ${data.reasoning.substring(0, 100)}...`);
        }
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('AI 생성 실패:', error);
      toast.error('AI 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 초기화
  const resetLocations = () => {
    setScenario((prev) => ({
      ...prev,
      locations: undefined,
    }));
    toast.success('탐색 위치가 초기화되었습니다. (기본 위치 사용)');
  };

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-sans text-2xl text-kairos-gold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              탐색 위치 설정
            </CardTitle>
            <CardDescription className="mt-1">
              플레이어가 탐색할 수 있는 장소를 정의합니다. 설정하지 않으면 장르 기반 기본 위치가 사용됩니다.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              variant="outline"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold/10"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 생성
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="icon"
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* 현재 상태 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {locations.length > 0
                ? `${locations.length}개의 커스텀 위치 설정됨`
                : '기본 위치 사용 중 (장르 기반)'}
            </span>
            {locations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLocations}
                className="text-red-500 hover:text-red-700"
              >
                초기화 (기본값 사용)
              </Button>
            )}
          </div>

          {/* 위치 목록 */}
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div
                key={location.locationId}
                className="rounded-lg border border-socratic-grey/30 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  {/* 순서 조작 */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveLocation(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveLocation(index, 'down')}
                      disabled={index === locations.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 space-y-3">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ICON_OPTIONS.find((opt) => opt.value === location.icon)?.icon}
                        <span className="font-medium">{location.name || '(이름 없음)'}</span>
                        <span className="text-xs text-muted-foreground">
                          ({STATUS_OPTIONS.find((s) => s.value === location.initialStatus)?.label})
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        >
                          {editingIndex === index ? '접기' : '편집'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => removeLocation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 편집 폼 */}
                    {editingIndex === index && (
                      <div className="grid gap-4 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          {/* ID */}
                          <div className="space-y-1">
                            <Label>위치 ID</Label>
                            <Input
                              value={location.locationId}
                              onChange={(e) => updateLocation(index, { locationId: e.target.value })}
                              placeholder="loc_storage"
                            />
                          </div>
                          {/* 이름 */}
                          <div className="space-y-1">
                            <Label>위치 이름</Label>
                            <Input
                              value={location.name}
                              onChange={(e) => updateLocation(index, { name: e.target.value })}
                              placeholder="창고"
                            />
                          </div>
                        </div>

                        {/* 설명 */}
                        <div className="space-y-1">
                          <Label>설명</Label>
                          <Textarea
                            value={location.description}
                            onChange={(e) => updateLocation(index, { description: e.target.value })}
                            placeholder="이 장소에 대한 설명을 입력하세요."
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {/* 아이콘 */}
                          <div className="space-y-1">
                            <Label>아이콘</Label>
                            <Select
                              value={location.icon}
                              onValueChange={(value) => updateLocation(index, { icon: value as LocationIcon })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ICON_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      {opt.icon}
                                      <span>{opt.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 초기 상태 */}
                          <div className="space-y-1">
                            <Label>초기 상태</Label>
                            <Select
                              value={location.initialStatus}
                              onValueChange={(value) =>
                                updateLocation(index, { initialStatus: value as 'available' | 'locked' | 'hidden' })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 위험도 */}
                          <div className="space-y-1">
                            <Label>위험도 (0-3)</Label>
                            <Select
                              value={String(location.dangerLevel ?? 0)}
                              onValueChange={(value) => updateLocation(index, { dangerLevel: Number(value) as 0 | 1 | 2 | 3 })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0 - 안전</SelectItem>
                                <SelectItem value="1">1 - 낮음</SelectItem>
                                <SelectItem value="2">2 - 중간</SelectItem>
                                <SelectItem value="3">3 - 높음</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 해금 조건 (locked/hidden인 경우만) */}
                        {(location.initialStatus === 'locked' || location.initialStatus === 'hidden') && (
                          <div className="space-y-3 pt-2 border-t">
                            <Label className="text-sm font-medium">해금 조건</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">필요 Day</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={location.unlockCondition?.requiredDay || ''}
                                  onChange={(e) =>
                                    updateLocation(index, {
                                      unlockCondition: {
                                        ...location.unlockCondition,
                                        requiredDay: e.target.value ? Number(e.target.value) : undefined,
                                      },
                                    })
                                  }
                                  placeholder="예: 3"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">필요 탐색 위치 ID</Label>
                                <Input
                                  value={location.unlockCondition?.requiredExploration || ''}
                                  onChange={(e) =>
                                    updateLocation(index, {
                                      unlockCondition: {
                                        ...location.unlockCondition,
                                        requiredExploration: e.target.value || undefined,
                                      },
                                    })
                                  }
                                  placeholder="예: loc_storage"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 재탐색 쿨다운 */}
                        <div className="space-y-1">
                          <Label>재탐색 쿨다운 (Day)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={location.explorationCooldown ?? 1}
                            onChange={(e) => updateLocation(index, { explorationCooldown: Number(e.target.value) })}
                          />
                          <p className="text-xs text-muted-foreground">
                            0이면 즉시 재탐색 가능, 1 이상이면 해당 일수 후 재탐색 가능
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 요약 (편집 중이 아닐 때) */}
                    {editingIndex !== index && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {location.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 위치 추가 버튼 */}
          <Button
            onClick={addLocation}
            variant="outline"
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            새 위치 추가
          </Button>

          {/* 안내 메시지 */}
          {locations.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>탐색 위치를 설정하지 않으면 장르에 따라 기본 위치가 자동 생성됩니다.</p>
              <p className="mt-1">기본 위치: 창고, 입구, 의무실, 옥상(Day 3+), 지하(Day 5+)</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
