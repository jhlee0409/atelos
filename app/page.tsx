'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, X, Save, AlertCircle } from 'lucide-react';

// Type definitions
interface Character {
  roleId: string;
  roleName: string;
  characterName: string;
  backstory: string;
  imageUrl: string;
  weightedTraitTypes: string[];
  isEditing?: boolean;
}

interface Relationship {
  id: string;
  personA: string;
  personB: string;
  value: number;
  reason: string;
  isEditing?: boolean;
}

interface ScenarioStat {
  id: string;
  name: string;
  description: string;
  initialValue: number;
  range: [number, number];
  isEditing?: boolean;
}

interface Trait {
  traitId: string;
  traitName: string;
  type: '긍정' | '부정';
  weightType: string;
  description: string;
  iconUrl: string;
  isEditing?: boolean;
}

interface Dilemma {
  dilemmaId: string;
  title: string;
  description: string;
  isEditing?: boolean;
}

interface SystemCondition {
  type: '필수 스탯' | '필수 플래그' | '생존자 수';
  statId?: string;
  comparison?: '>=' | '<=' | '==';
  value?: number;
  flagName?: string;
  isEditing?: boolean;
}

interface EndingArchetype {
  endingId: string;
  title: string;
  description: string;
  systemConditions: SystemCondition[];
  isEditing?: boolean;
}

interface EndCondition {
  type: '시간제한' | '목표 달성' | '조건 충족';
  value?: number;
  unit?: '일' | '시간';
  statId?: string;
}

interface ScenarioData {
  scenarioId: string;
  title: string;
  genre: string[];
  coreKeywords: string[];
  posterImageUrl: string;
  synopsis: string;
  playerGoal: string;
  characters: Character[];
  initialRelationships: Relationship[];
  endCondition: EndCondition;
  scenarioStats: ScenarioStat[];
  traitPool: {
    buffs: Trait[];
    debuffs: Trait[];
  };
  coreDilemmas: Dilemma[];
  endingArchetypes: EndingArchetype[];
  status: '작업 중' | '테스트 중' | '활성';
}

export default function AtelosScenarioEditor() {
  const [scenario, setScenario] = useState<ScenarioData>({
    scenarioId: '',
    title: '',
    genre: [],
    coreKeywords: [],
    posterImageUrl: '',
    synopsis: '',
    playerGoal: '',
    characters: [],
    initialRelationships: [],
    endCondition: { type: '시간제한' },
    scenarioStats: [],
    traitPool: { buffs: [], debuffs: [] },
    coreDilemmas: [],
    endingArchetypes: [],
    status: '작업 중',
  });

  const [newGenre, setNewGenre] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation function
  const validateScenario = (): string[] => {
    const errors: string[] = [];

    if (!scenario.scenarioId) errors.push('시나리오 ID');
    if (!scenario.title) errors.push('시나리오 제목');
    if (scenario.genre.length === 0) errors.push('장르');
    if (scenario.coreKeywords.length < 3) errors.push('핵심 키워드 (최소 3개)');
    if (!scenario.posterImageUrl) errors.push('시나리오 포스터 이미지');
    if (!scenario.synopsis) errors.push('시나리오 시놉시스');
    if (!scenario.playerGoal) errors.push('플레이어 목표');

    return errors;
  };

  // Character management
  const addCharacter = () => {
    const newCharacter: Character = {
      roleId: '',
      roleName: '',
      characterName: '',
      backstory: '',
      imageUrl: '',
      weightedTraitTypes: [],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      characters: [...prev.characters, newCharacter],
    }));
  };

  const saveCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, isEditing: false } : char,
      ),
    }));
  };

  const editCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, isEditing: true } : char,
      ),
    }));
  };

  const removeCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index),
    }));
  };

  const updateCharacter = (
    index: number,
    field: keyof Character,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, [field]: value } : char,
      ),
    }));
  };

  // Relationship management
  const addRelationship = () => {
    const newRelationship: Relationship = {
      id: Date.now().toString(),
      personA: '',
      personB: '',
      value: 0,
      reason: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      initialRelationships: [...prev.initialRelationships, newRelationship],
    }));
  };

  const saveRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, isEditing: false } : rel,
      ),
    }));
  };

  const editRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, isEditing: true } : rel,
      ),
    }));
  };

  const removeRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.filter(
        (rel) => rel.id !== id,
      ),
    }));
  };

  const updateRelationship = (
    id: string,
    field: keyof Relationship,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, [field]: value } : rel,
      ),
    }));
  };

  // Tag management
  const addTag = (type: 'genre' | 'coreKeywords', value: string) => {
    if (value.trim()) {
      const processedValue =
        type === 'coreKeywords' && !value.startsWith('#') ? `#${value}` : value;
      setScenario((prev) => ({
        ...prev,
        [type]: [...prev[type], processedValue.trim()],
      }));
      if (type === 'genre') setNewGenre('');
      if (type === 'coreKeywords') setNewKeyword('');
    }
  };

  const removeTag = (type: 'genre' | 'coreKeywords', index: number) => {
    setScenario((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  // Stat management
  const addStat = () => {
    const newStat: ScenarioStat = {
      id: '',
      name: '',
      description: '',
      initialValue: 0,
      range: [0, 100],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      scenarioStats: [...prev.scenarioStats, newStat],
    }));
  };

  const saveStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, isEditing: false } : stat,
      ),
    }));
  };

  const editStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, isEditing: true } : stat,
      ),
    }));
  };

  const removeStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.filter((_, i) => i !== index),
    }));
  };

  const updateStat = (index: number, field: keyof ScenarioStat, value: any) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat,
      ),
    }));
  };

  // Trait management
  const addTrait = (type: 'buffs' | 'debuffs') => {
    const newTrait: Trait = {
      traitId: '',
      traitName: '',
      type: type === 'buffs' ? '긍정' : '부정',
      weightType: '',
      description: '',
      iconUrl: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: [...prev.traitPool[type], newTrait],
      },
    }));
  };

  const saveTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, isEditing: false } : trait,
        ),
      },
    }));
  };

  const editTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, isEditing: true } : trait,
        ),
      },
    }));
  };

  const removeTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].filter((_, i) => i !== index),
      },
    }));
  };

  const updateTrait = (
    type: 'buffs' | 'debuffs',
    index: number,
    field: keyof Trait,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, [field]: value } : trait,
        ),
      },
    }));
  };

  // Dilemma management
  const addDilemma = () => {
    const newDilemma: Dilemma = {
      dilemmaId: '',
      title: '',
      description: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: [...prev.coreDilemmas, newDilemma],
    }));
  };

  const saveDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, isEditing: false } : dilemma,
      ),
    }));
  };

  const editDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, isEditing: true } : dilemma,
      ),
    }));
  };

  const removeDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.filter((_, i) => i !== index),
    }));
  };

  const updateDilemma = (
    index: number,
    field: keyof Dilemma,
    value: string,
  ) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, [field]: value } : dilemma,
      ),
    }));
  };

  // Ending management
  const addEnding = () => {
    const newEnding: EndingArchetype = {
      endingId: '',
      title: '',
      description: '',
      systemConditions: [],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: [...prev.endingArchetypes, newEnding],
    }));
  };

  const saveEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, isEditing: false } : ending,
      ),
    }));
  };

  const editEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, isEditing: true } : ending,
      ),
    }));
  };

  const removeEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.filter((_, i) => i !== index),
    }));
  };

  const updateEnding = (
    index: number,
    field: keyof EndingArchetype,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, [field]: value } : ending,
      ),
    }));
  };

  // Save functions
  const handleTempSave = () => {
    localStorage.setItem(
      `atelos_scenario_${scenario.scenarioId || 'draft'}`,
      JSON.stringify(scenario),
    );
    alert('임시 저장되었습니다.');
  };

  const handleSaveAndActivate = () => {
    const validationErrors = validateScenario();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      alert(`다음 필수 항목을 입력해주세요:\n${validationErrors.join(', ')}`);
      return;
    }

    const finalScenario = { ...scenario, status: '활성' as const };
    localStorage.setItem(
      `atelos_scenario_${scenario.scenarioId}`,
      JSON.stringify(finalScenario),
    );
    setScenario(finalScenario);
    setErrors([]);
    alert('시나리오가 저장되고 활성화되었습니다.');
  };

  return (
    <div className="min-h-screen bg-telos-black">
      <div className="flex">
        {/* Main Content */}
        <div className="mx-auto max-w-5xl flex-1 px-8 py-12">
          <div className="mb-12">
            <h1 className="mb-2 font-serif text-4xl text-kairos-gold">
              ATELOS
            </h1>
            <p className="text-lg text-socratic-grey">시나리오 편집기 v1.1</p>
          </div>

          <div className="space-y-8">
            {/* Section 1: 시나리오 기본 정보 */}
            <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-kairos-gold">
                  시나리오 기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      시나리오 고유 ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={scenario.scenarioId}
                      onChange={(e) => {
                        const value = e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z_]/g, '');
                        setScenario((prev) => ({ ...prev, scenarioId: value }));
                      }}
                      className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                        errors.includes('시나리오 ID') ? 'border-red-500' : ''
                      }`}
                      placeholder="ZERO_HOUR"
                    />
                    <p className="mt-1 text-xs text-socratic-grey">
                      시스템에서 시나리오를 구분하는 고유한 영문 ID입니다. (예:
                      ZERO_HOUR)
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      시나리오 제목 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={scenario.title}
                      onChange={(e) =>
                        setScenario((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                        errors.includes('시나리오 제목') ? 'border-red-500' : ''
                      }`}
                      placeholder="제로 아워: 도시의 법칙"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    시나리오 포스터 이미지{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={scenario.posterImageUrl}
                        onChange={(e) =>
                          setScenario((prev) => ({
                            ...prev,
                            posterImageUrl: e.target.value,
                          }))
                        }
                        className={`flex-1 border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                          errors.includes('시나리오 포스터 이미지')
                            ? 'border-red-500'
                            : ''
                        }`}
                        placeholder="이미지 URL을 입력하거나 파일을 선택하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        파일 선택
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setScenario((prev) => ({
                            ...prev,
                            posterImageUrl: url,
                          }));
                        }
                      }}
                    />
                    <p className="text-xs text-socratic-grey">
                      권장 비율 2:3, 최대 2MB, JPG/PNG 형식
                    </p>
                  </div>
                  {scenario.posterImageUrl && (
                    <div className="mt-3 rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                      <p className="text-sm text-kairos-gold">
                        ✓ 이미지 설정됨
                      </p>
                      <img
                        src={scenario.posterImageUrl || '/placeholder.svg'}
                        alt="포스터 미리보기"
                        className="mt-2 h-36 w-24 rounded border object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    시나리오 시놉시스 <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={scenario.synopsis}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        synopsis: e.target.value,
                      }))
                    }
                    className={`min-h-[120px] border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                      errors.includes('시나리오 시놉시스')
                        ? 'border-red-500'
                        : ''
                    }`}
                    placeholder="시나리오의 전체적인 개요와 배경을 설명하세요"
                    maxLength={1000}
                  />
                  <p className="mt-1 text-xs text-socratic-grey">
                    {scenario.synopsis.length}/1000자
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    플레이어 목표 <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={scenario.playerGoal}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        playerGoal: e.target.value,
                      }))
                    }
                    className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                      errors.includes('플레이어 목표') ? 'border-red-500' : ''
                    }`}
                    placeholder="플레이어가 달성해야 할 목표를 설명하세요"
                    maxLength={200}
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-socratic-grey">
                    {scenario.playerGoal.length}/200자
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      장르 <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-2 flex gap-2">
                      <Input
                        value={newGenre}
                        onChange={(e) => setNewGenre(e.target.value)}
                        className="border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="사회 드라마, 스릴러"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && addTag('genre', newGenre)
                        }
                      />
                      <Button
                        onClick={() => addTag('genre', newGenre)}
                        variant="outline"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scenario.genre.map((g, index) => (
                        <Badge
                          key={index}
                          className="bg-socratic-grey text-white hover:bg-socratic-grey/80"
                        >
                          {g}
                          <button
                            onClick={() => removeTag('genre', index)}
                            className="ml-2 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-socratic-grey">
                      시나리오의 장르를 입력하세요.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      핵심 키워드 <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-2 flex gap-2">
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        className="border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="리더십, 딜레마"
                        onKeyPress={(e) =>
                          e.key === 'Enter' &&
                          addTag('coreKeywords', newKeyword)
                        }
                      />
                      <Button
                        onClick={() => addTag('coreKeywords', newKeyword)}
                        variant="outline"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scenario.coreKeywords.map((k, index) => (
                        <Badge
                          key={index}
                          className="bg-socratic-grey text-white hover:bg-socratic-grey/80"
                        >
                          {k}
                          <button
                            onClick={() => removeTag('coreKeywords', index)}
                            className="ml-2 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-socratic-grey">
                      시나리오의 특징을 나타내는 키워드 (최소 3개, 최대 5개,
                      #으로 시작)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: 등장인물 및 관계 설정 */}
            <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-2xl text-kairos-gold">
                    등장인물 및 관계 설정
                  </CardTitle>
                  <Button
                    onClick={addCharacter}
                    variant="outline"
                    className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    인물 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {scenario.characters.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Plus className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-medium text-gray-800">
                        등장인물이 없습니다
                      </h3>
                      <p className="mb-4 text-sm text-socratic-grey">
                        시나리오에 등장할 인물들을 추가해보세요.
                      </p>
                      <Button
                        onClick={addCharacter}
                        className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />첫 번째 인물 추가
                      </Button>
                    </div>
                  ) : (
                    scenario.characters.map((character, index) => (
                      <Card
                        key={index}
                        className={`${character.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                      >
                        {character.isEditing ? (
                          <div className="absolute right-3 top-3 flex gap-2">
                            <Button
                              onClick={() => saveCharacter(index)}
                              size="sm"
                              className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                            >
                              저장
                            </Button>
                            <button
                              onClick={() => removeCharacter(index)}
                              className="text-socratic-grey transition-colors hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="absolute right-3 top-3 flex gap-2">
                            <Button
                              onClick={() => editCharacter(index)}
                              size="sm"
                              variant="outline"
                              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                            >
                              수정
                            </Button>
                            <button
                              onClick={() => removeCharacter(index)}
                              className="text-socratic-grey transition-colors hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {!character.isEditing && (
                          <div className="absolute left-3 top-3">
                            <Badge className="border-green-300 bg-green-100 text-green-800">
                              추가됨
                            </Badge>
                          </div>
                        )}

                        <CardContent className="pt-6">
                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                배역 ID <span className="text-red-500">*</span>
                              </label>
                              <Input
                                value={character.roleId}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z]/g, '');
                                  updateCharacter(index, 'roleId', value);
                                }}
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="GUARDIAN"
                                disabled={!character.isEditing}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                배역명 <span className="text-red-500">*</span>
                              </label>
                              <Input
                                value={character.roleName}
                                onChange={(e) =>
                                  updateCharacter(
                                    index,
                                    'roleName',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="수호자"
                                disabled={!character.isEditing}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                캐릭터 이름{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <Input
                                value={character.characterName}
                                onChange={(e) =>
                                  updateCharacter(
                                    index,
                                    'characterName',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="박준경"
                                disabled={!character.isEditing}
                              />
                            </div>
                          </div>

                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                배경 설정
                              </label>
                              <Textarea
                                value={character.backstory}
                                onChange={(e) =>
                                  updateCharacter(
                                    index,
                                    'backstory',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="캐릭터의 배경 스토리를 입력하세요"
                                maxLength={300}
                                rows={3}
                                disabled={!character.isEditing}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                역할군 이미지
                              </label>
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    value={character.imageUrl}
                                    onChange={(e) =>
                                      updateCharacter(
                                        index,
                                        'imageUrl',
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 border-socratic-grey bg-white text-sm focus:border-kairos-gold focus:ring-kairos-gold/20"
                                    placeholder="이미지 URL 입력"
                                    disabled={!character.isEditing}
                                  />
                                  {character.isEditing && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                      onClick={() => {
                                        const input =
                                          document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                          const file = (
                                            e.target as HTMLInputElement
                                          ).files?.[0];
                                          if (file) {
                                            const url =
                                              URL.createObjectURL(file);
                                            updateCharacter(
                                              index,
                                              'imageUrl',
                                              url,
                                            );
                                          }
                                        };
                                        input.click();
                                      }}
                                    >
                                      파일
                                    </Button>
                                  )}
                                </div>
                                {character.imageUrl && (
                                  <img
                                    src={
                                      character.imageUrl || '/placeholder.svg'
                                    }
                                    alt="캐릭터 이미지"
                                    className="h-16 w-16 rounded border object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-800">
                              가중치 특성 유형
                            </label>
                            {scenario.traitPool.buffs.length === 0 &&
                            scenario.traitPool.debuffs.length === 0 ? (
                              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                <p className="text-sm text-yellow-800">
                                  먼저 아래 "시나리오 시스템 규칙" 섹션에서 특성
                                  풀을 생성해주세요.
                                </p>
                              </div>
                            ) : (
                              <>
                                {character.isEditing && (
                                  <Select
                                    onValueChange={(value) => {
                                      const allTraits = [
                                        ...scenario.traitPool.buffs,
                                        ...scenario.traitPool.debuffs,
                                      ];
                                      const selectedTrait = allTraits.find(
                                        (trait) => trait.weightType === value,
                                      );
                                      if (
                                        selectedTrait &&
                                        !character.weightedTraitTypes.includes(
                                          selectedTrait.weightType,
                                        )
                                      ) {
                                        updateCharacter(
                                          index,
                                          'weightedTraitTypes',
                                          [
                                            ...character.weightedTraitTypes,
                                            selectedTrait.weightType,
                                          ],
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="mb-2 border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20">
                                      <SelectValue placeholder="특성 유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                        긍정 특성 (BUFF)
                                      </div>
                                      {scenario.traitPool.buffs.map(
                                        (trait, traitIndex) => (
                                          <SelectItem
                                            key={`buff-${traitIndex}`}
                                            value={trait.weightType}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                              <span>{trait.traitName}</span>
                                              <span className="text-xs text-socratic-grey">
                                                ({trait.weightType})
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ),
                                      )}
                                      <div className="mt-1 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                        부정 특성 (DEBUFF)
                                      </div>
                                      {scenario.traitPool.debuffs.map(
                                        (trait, traitIndex) => (
                                          <SelectItem
                                            key={`debuff-${traitIndex}`}
                                            value={trait.weightType}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                              <span>{trait.traitName}</span>
                                              <span className="text-xs text-socratic-grey">
                                                ({trait.weightType})
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  {character.weightedTraitTypes.map(
                                    (weightType, wtIndex) => {
                                      const allTraits = [
                                        ...scenario.traitPool.buffs,
                                        ...scenario.traitPool.debuffs,
                                      ];
                                      const trait = allTraits.find(
                                        (t) => t.weightType === weightType,
                                      );
                                      const isPositive =
                                        scenario.traitPool.buffs.some(
                                          (t) => t.weightType === weightType,
                                        );

                                      return (
                                        <Badge
                                          key={wtIndex}
                                          className={`${isPositive ? 'border-green-300 bg-green-100 text-green-800' : 'border-red-300 bg-red-100 text-red-800'} hover:opacity-80`}
                                        >
                                          <span
                                            className={`mr-1 h-2 w-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                          ></span>
                                          {trait?.traitName || weightType}
                                          {character.isEditing && (
                                            <button
                                              onClick={() => {
                                                const newTraitTypes =
                                                  character.weightedTraitTypes.filter(
                                                    (_, i) => i !== wtIndex,
                                                  );
                                                updateCharacter(
                                                  index,
                                                  'weightedTraitTypes',
                                                  newTraitTypes,
                                                );
                                              }}
                                              className="ml-2 hover:text-red-600"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          )}
                                        </Badge>
                                      );
                                    },
                                  )}
                                </div>

                                <p className="mt-1 text-xs text-socratic-grey">
                                  특성 풀에서 이 캐릭터에게 적용될 가중치 특성을
                                  선택하세요
                                </p>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {/* 초기 관계 설정 */}
                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">
                        초기 관계 설정
                      </h4>
                      <Button
                        onClick={addRelationship}
                        variant="outline"
                        size="sm"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                        disabled={scenario.characters.length < 2}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        관계 추가
                      </Button>
                    </div>

                    {scenario.initialRelationships.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <Plus className="h-6 w-6 text-gray-400" />
                        </div>
                        <h4 className="text-md mb-2 font-medium text-gray-800">
                          관계 설정이 없습니다
                        </h4>
                        <p className="mb-3 text-sm text-socratic-grey">
                          등장인물 간의 초기 관계를 설정해보세요.
                        </p>
                        {scenario.characters.length >= 2 ? (
                          <Button
                            onClick={addRelationship}
                            size="sm"
                            className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            관계 추가
                          </Button>
                        ) : (
                          <p className="text-xs text-socratic-grey">
                            관계 설정을 위해서는 최소 2명의 등장인물이
                            필요합니다.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {scenario.initialRelationships.map((relationship) => (
                          <Card
                            key={relationship.id}
                            className={`${relationship.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                          >
                            {relationship.isEditing ? (
                              <div className="absolute right-3 top-3 flex gap-2">
                                <Button
                                  onClick={() =>
                                    saveRelationship(relationship.id)
                                  }
                                  size="sm"
                                  className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                                >
                                  저장
                                </Button>
                                <button
                                  onClick={() =>
                                    removeRelationship(relationship.id)
                                  }
                                  className="text-socratic-grey hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="absolute right-3 top-3 flex gap-2">
                                <Badge className="mr-2 border-green-300 bg-green-100 text-green-800">
                                  추가됨
                                </Badge>
                                <Button
                                  onClick={() =>
                                    editRelationship(relationship.id)
                                  }
                                  size="sm"
                                  variant="outline"
                                  className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                >
                                  수정
                                </Button>
                                <button
                                  onClick={() =>
                                    removeRelationship(relationship.id)
                                  }
                                  className="text-socratic-grey hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            <CardContent className="pt-6">
                              <div className="mb-4 grid grid-cols-2 gap-4">
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-gray-800">
                                    인물 A{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <Select
                                    value={relationship.personA}
                                    onValueChange={(value) =>
                                      updateRelationship(
                                        relationship.id,
                                        'personA',
                                        value,
                                      )
                                    }
                                    disabled={!relationship.isEditing}
                                  >
                                    <SelectTrigger className="border-socratic-grey bg-white">
                                      <SelectValue placeholder="인물 A 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {scenario.characters.map(
                                        (char, index) => (
                                          <SelectItem
                                            key={index}
                                            value={char.characterName}
                                          >
                                            {char.characterName ||
                                              `인물 ${index + 1}`}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium text-gray-800">
                                    인물 B{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <Select
                                    value={relationship.personB}
                                    onValueChange={(value) =>
                                      updateRelationship(
                                        relationship.id,
                                        'personB',
                                        value,
                                      )
                                    }
                                    disabled={!relationship.isEditing}
                                  >
                                    <SelectTrigger className="border-socratic-grey bg-white">
                                      <SelectValue placeholder="인물 B 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {scenario.characters.map(
                                        (char, index) => (
                                          <SelectItem
                                            key={index}
                                            value={char.characterName}
                                          >
                                            {char.characterName ||
                                              `인물 ${index + 1}`}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-gray-800">
                                    초기 관계도 수치: {relationship.value}
                                  </label>
                                  <Slider
                                    value={[relationship.value]}
                                    onValueChange={(value) =>
                                      updateRelationship(
                                        relationship.id,
                                        'value',
                                        value[0],
                                      )
                                    }
                                    min={-100}
                                    max={100}
                                    step={1}
                                    className="w-full"
                                    disabled={!relationship.isEditing}
                                  />
                                  <div className="mt-1 flex justify-between text-xs text-socratic-grey">
                                    <span>-100 (적대)</span>
                                    <span>0 (중립)</span>
                                    <span>100 (우호)</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-gray-800">
                                    관계 설정 이유
                                  </label>
                                  <Input
                                    value={relationship.reason}
                                    onChange={(e) =>
                                      updateRelationship(
                                        relationship.id,
                                        'reason',
                                        e.target.value,
                                      )
                                    }
                                    className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                    placeholder="과거의 악연"
                                    maxLength={50}
                                    disabled={!relationship.isEditing}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: 시나리오 시스템 규칙 */}
            <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-kairos-gold">
                  시나리오 시스템 규칙
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 종료 조건 - Enhanced Interactive Component */}
                <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 font-serif text-xl text-kairos-gold">
                      종료 조건
                      <div className="h-2 w-2 rounded-full bg-kairos-gold"></div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="mb-3 block text-sm font-medium text-gray-800">
                        유형 선택
                      </label>
                      <Select
                        value={scenario.endCondition.type}
                        onValueChange={(
                          value: '시간제한' | '목표 달성' | '조건 충족',
                        ) =>
                          setScenario((prev) => ({
                            ...prev,
                            endCondition: { type: value },
                          }))
                        }
                      >
                        <SelectTrigger className="border-socratic-grey bg-parchment-white shadow-sm transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                          <SelectValue placeholder="종료 조건 유형을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent className="border-socratic-grey bg-parchment-white">
                          <SelectItem
                            value="시간제한"
                            className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              시간제한
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="목표 달성"
                            className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              목표 달성
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="조건 충족"
                            className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                              조건 충족
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conditional UI Area with smooth transitions */}
                    <div className="min-h-[120px] transition-all duration-300 ease-in-out">
                      {scenario.endCondition.type === '시간제한' && (
                        <div className="duration-300 animate-in fade-in-50">
                          <div className="mb-4 rounded-lg border border-blue-200/50 bg-blue-50/50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-medium text-blue-800">
                                시간 기반 종료 조건
                              </span>
                            </div>
                            <p className="text-xs text-blue-700">
                              지정된 시간이 경과하면 시나리오가 자동으로
                              종료됩니다.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-800">
                                제한 시간
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={scenario.endCondition.value || ''}
                                onChange={(e) =>
                                  setScenario((prev) => ({
                                    ...prev,
                                    endCondition: {
                                      ...prev.endCondition,
                                      value: Number.parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20"
                                placeholder="예: 7"
                              />
                              <p className="text-xs text-socratic-grey">
                                최소 1 이상의 값을 입력하세요
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-800">
                                단위
                              </label>
                              <Select
                                value={scenario.endCondition.unit || '일'}
                                onValueChange={(value: '일' | '시간') =>
                                  setScenario((prev) => ({
                                    ...prev,
                                    endCondition: {
                                      ...prev.endCondition,
                                      unit: value,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-socratic-grey bg-parchment-white">
                                  <SelectItem
                                    value="일"
                                    className="hover:bg-kairos-gold/10"
                                  >
                                    일(Days)
                                  </SelectItem>
                                  <SelectItem
                                    value="시간"
                                    className="hover:bg-kairos-gold/10"
                                  >
                                    시간(Hours)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-socratic-grey">
                                시간 단위를 선택하세요
                              </p>
                            </div>
                          </div>

                          {scenario.endCondition.value &&
                            scenario.endCondition.unit && (
                              <div className="mt-4 rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">
                                    설정된 조건:
                                  </span>{' '}
                                  {scenario.endCondition.value}
                                  {scenario.endCondition.unit === '일'
                                    ? '일'
                                    : '시간'}{' '}
                                  후 시나리오 종료
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {scenario.endCondition.type === '목표 달성' && (
                        <div className="duration-300 animate-in fade-in-50">
                          <div className="mb-4 rounded-lg border border-green-200/50 bg-green-50/50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium text-green-800">
                                목표 기반 종료 조건
                              </span>
                            </div>
                            <p className="text-xs text-green-700">
                              특정 스탯이 목표 수치에 도달하면 시나리오가
                              종료됩니다.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-800">
                                목표 스탯 ID
                              </label>
                              <Select
                                value={scenario.endCondition.statId || ''}
                                onValueChange={(value) =>
                                  setScenario((prev) => ({
                                    ...prev,
                                    endCondition: {
                                      ...prev.endCondition,
                                      statId: value,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                                  <SelectValue placeholder="스탯을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent className="border-socratic-grey bg-parchment-white">
                                  {scenario.scenarioStats.length > 0 ? (
                                    scenario.scenarioStats.map((stat) => (
                                      <SelectItem
                                        key={stat.id}
                                        value={stat.id}
                                        className="hover:bg-kairos-gold/10"
                                      >
                                        <div className="flex w-full items-center justify-between">
                                          <span>{stat.name}</span>
                                          <span className="text-xs text-socratic-grey">
                                            ({stat.id})
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-3 text-center text-sm text-socratic-grey">
                                      먼저 시나리오 전용 스탯을 생성해주세요
                                    </div>
                                  )}
                                </SelectContent>
                                <p className="text-xs text-socratic-grey">
                                  {scenario.scenarioStats.length > 0
                                    ? '시나리오 전용 스탯 중에서 목표로 할 스탯을 선택하세요'
                                    : "아래 '시나리오 전용 스탯' 섹션에서 스탯을 먼저 생성해주세요"}
                                </p>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-800">
                                목표 수치
                              </label>
                              <Input
                                type="number"
                                value={scenario.endCondition.value || ''}
                                onChange={(e) =>
                                  setScenario((prev) => ({
                                    ...prev,
                                    endCondition: {
                                      ...prev.endCondition,
                                      value: Number.parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20"
                                placeholder="예: 80"
                              />
                              <p className="text-xs text-socratic-grey">
                                달성해야 할 목표 수치를 입력하세요
                              </p>
                            </div>
                          </div>

                          {scenario.endCondition.statId &&
                            scenario.endCondition.value && (
                              <div className="mt-4 rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">
                                    설정된 조건:
                                  </span>{' '}
                                  {scenario.endCondition.statId} 스탯이{' '}
                                  {scenario.endCondition.value}에 도달하면
                                  시나리오 종료
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {scenario.endCondition.type === '조건 충족' && (
                        <div className="duration-300 animate-in fade-in-50">
                          <div className="rounded-lg border border-purple-200/50 bg-purple-50/50 p-6 text-center">
                            <div className="mb-3 flex items-center justify-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                              <span className="text-sm font-medium text-purple-800">
                                조건 기반 종료
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-socratic-grey">
                              엔딩 원형의 조건에 따라 종료됩니다.
                            </p>
                            <p className="mt-2 text-xs text-socratic-grey">
                              구체적인 종료 조건은 "핵심 서사 요소" 섹션의 엔딩
                              원형에서 설정됩니다.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 시나리오 전용 스탯 */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">
                      시나리오 전용 스탯
                    </h4>
                    <Button
                      onClick={addStat}
                      variant="outline"
                      size="sm"
                      className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      스탯 추가
                    </Button>
                  </div>

                  {scenario.scenarioStats.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Plus className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-medium text-gray-800">
                        시나리오 스탯이 없습니다
                      </h3>
                      <p className="mb-4 text-sm text-socratic-grey">
                        시나리오에서 사용할 전용 스탯을 추가해보세요.
                      </p>
                      <Button
                        onClick={addStat}
                        className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />첫 번째 스탯 추가
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scenario.scenarioStats.map((stat, index) => (
                        <Card
                          key={index}
                          className={`${stat.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                        >
                          {stat.isEditing ? (
                            <div className="absolute right-3 top-3 flex gap-2">
                              <Button
                                onClick={() => saveStat(index)}
                                size="sm"
                                className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                              >
                                저장
                              </Button>
                              <button
                                onClick={() => removeStat(index)}
                                className="text-socratic-grey hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="absolute right-3 top-3 flex gap-2">
                              <Badge className="mr-2 border-green-300 bg-green-100 text-green-800">
                                추가됨
                              </Badge>
                              <Button
                                onClick={() => editStat(index)}
                                size="sm"
                                variant="outline"
                                className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                              >
                                수정
                              </Button>
                              <button
                                onClick={() => removeStat(index)}
                                className="text-socratic-grey hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          <CardContent className="pt-6">
                            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                  스탯 ID{' '}
                                  <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  value={stat.id}
                                  onChange={(e) =>
                                    updateStat(index, 'id', e.target.value)
                                  }
                                  className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                  placeholder="cityChaos"
                                  disabled={!stat.isEditing}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                  스탯 이름{' '}
                                  <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  value={stat.name}
                                  onChange={(e) =>
                                    updateStat(index, 'name', e.target.value)
                                  }
                                  className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                  placeholder="도시 혼란도"
                                  disabled={!stat.isEditing}
                                />
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                설명
                              </label>
                              <Textarea
                                value={stat.description}
                                onChange={(e) =>
                                  updateStat(
                                    index,
                                    'description',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="스탯에 대한 설명을 입력하세요"
                                maxLength={200}
                                rows={2}
                                disabled={!stat.isEditing}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                  초기값 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="number"
                                  value={stat.initialValue}
                                  onChange={(e) =>
                                    updateStat(
                                      index,
                                      'initialValue',
                                      Number.parseInt(e.target.value),
                                    )
                                  }
                                  className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                  disabled={!stat.isEditing}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                  최소값 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="number"
                                  value={stat.range[0]}
                                  onChange={(e) =>
                                    updateStat(index, 'range', [
                                      Number.parseInt(e.target.value),
                                      stat.range[1],
                                    ])
                                  }
                                  className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                  disabled={!stat.isEditing}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                  최대값 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="number"
                                  value={stat.range[1]}
                                  onChange={(e) =>
                                    updateStat(index, 'range', [
                                      stat.range[0],
                                      Number.parseInt(e.target.value),
                                    ])
                                  }
                                  className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                  disabled={!stat.isEditing}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* 시나리오 전용 특성 풀 */}
                <div>
                  <h4 className="mb-4 font-medium text-gray-800">
                    시나리오 전용 특성 풀
                  </h4>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* 긍정 특성 */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-700">
                          긍정 특성 (BUFF)
                        </h5>
                        <Button
                          onClick={() => addTrait('buffs')}
                          variant="outline"
                          size="sm"
                          className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          추가
                        </Button>
                      </div>

                      {scenario.traitPool.buffs.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-green-200 bg-green-50/50 py-8 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <Plus className="h-6 w-6 text-green-400" />
                          </div>
                          <h4 className="text-md mb-2 font-medium text-gray-800">
                            긍정 특성이 없습니다
                          </h4>
                          <p className="mb-3 text-sm text-socratic-grey">
                            BUFF 효과를 주는 긍정 특성을 추가해보세요.
                          </p>
                          <Button
                            onClick={() => addTrait('buffs')}
                            size="sm"
                            className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            긍정 특성 추가
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {scenario.traitPool.buffs.map((trait, index) => (
                            <Card
                              key={index}
                              className={`${trait.isEditing ? 'border-kairos-gold/50 bg-green-50' : 'border-green-200 bg-green-50/50'} relative`}
                            >
                              {trait.isEditing ? (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <Button
                                    onClick={() => saveTrait('buffs', index)}
                                    size="sm"
                                    className="bg-kairos-gold px-2 py-1 text-xs text-telos-black hover:bg-kairos-gold/90"
                                  >
                                    저장
                                  </Button>
                                  <button
                                    onClick={() => removeTrait('buffs', index)}
                                    className="text-socratic-grey hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <Badge className="border-green-300 bg-green-100 text-xs text-green-800">
                                    추가됨
                                  </Badge>
                                  <Button
                                    onClick={() => editTrait('buffs', index)}
                                    size="sm"
                                    variant="outline"
                                    className="border-kairos-gold px-2 py-1 text-xs text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                  >
                                    수정
                                  </Button>
                                  <button
                                    onClick={() => removeTrait('buffs', index)}
                                    className="text-socratic-grey hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              <CardContent className="pb-3 pt-4">
                                <div className="mb-2 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-800">
                                      특성 ID{' '}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      value={trait.traitId}
                                      onChange={(e) =>
                                        updateTrait(
                                          'buffs',
                                          index,
                                          'traitId',
                                          e.target.value.toUpperCase(),
                                        )
                                      }
                                      className="border-socratic-grey bg-white text-xs"
                                      placeholder="LEADERSHIP"
                                      disabled={!trait.isEditing}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-800">
                                      특성 이름{' '}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      value={trait.traitName}
                                      onChange={(e) =>
                                        updateTrait(
                                          'buffs',
                                          index,
                                          'traitName',
                                          e.target.value,
                                        )
                                      }
                                      className="border-socratic-grey bg-white text-xs"
                                      placeholder="리더십"
                                      disabled={!trait.isEditing}
                                    />
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    가중치 유형{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    value={trait.weightType}
                                    onChange={(e) =>
                                      updateTrait(
                                        'buffs',
                                        index,
                                        'weightType',
                                        e.target.value,
                                      )
                                    }
                                    className="border-socratic-grey bg-white text-xs"
                                    placeholder="리더십, 통제, 이타심"
                                    disabled={!trait.isEditing}
                                  />
                                </div>
                                <div className="mb-2">
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    아이콘 URL
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      value={trait.iconUrl}
                                      onChange={(e) =>
                                        updateTrait(
                                          'buffs',
                                          index,
                                          'iconUrl',
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1 border-socratic-grey bg-white text-xs"
                                      placeholder="아이콘 URL"
                                      disabled={!trait.isEditing}
                                    />
                                    {trait.isEditing && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-kairos-gold px-2 text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                        onClick={() => {
                                          const input =
                                            document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => {
                                            const file = (
                                              e.target as HTMLInputElement
                                            ).files?.[0];
                                            if (file) {
                                              const url =
                                                URL.createObjectURL(file);
                                              updateTrait(
                                                'buffs',
                                                index,
                                                'iconUrl',
                                                url,
                                              );
                                            }
                                          };
                                          input.click();
                                        }}
                                      >
                                        파일
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {trait.iconUrl && (
                                  <img
                                    src={trait.iconUrl || '/placeholder.svg'}
                                    alt="특성 아이콘"
                                    className="mb-2 h-8 w-8 rounded border object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    설명
                                  </label>
                                  <Textarea
                                    value={trait.description}
                                    onChange={(e) =>
                                      updateTrait(
                                        'buffs',
                                        index,
                                        'description',
                                        e.target.value,
                                      )
                                    }
                                    className="border-socratic-grey bg-white text-xs"
                                    placeholder="특성 설명"
                                    rows={2}
                                    maxLength={200}
                                    disabled={!trait.isEditing}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 부정 특성 */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-700">
                          부정 특성 (DEBUFF)
                        </h5>
                        <Button
                          onClick={() => addTrait('debuffs')}
                          variant="outline"
                          size="sm"
                          className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          추가
                        </Button>
                      </div>

                      {scenario.traitPool.debuffs.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 py-8 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <Plus className="h-6 w-6 text-red-400" />
                          </div>
                          <h4 className="text-md mb-2 font-medium text-gray-800">
                            부정 특성이 없습니다
                          </h4>
                          <p className="mb-3 text-sm text-socratic-grey">
                            DEBUFF 효과를 주는 부정 특성을 추가해보세요.
                          </p>
                          <Button
                            onClick={() => addTrait('debuffs')}
                            size="sm"
                            className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            부정 특성 추가
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {scenario.traitPool.debuffs.map((trait, index) => (
                            <Card
                              key={index}
                              className={`${trait.isEditing ? 'border-kairos-gold/50 bg-red-50' : 'border-red-200 bg-red-50/50'} relative`}
                            >
                              {trait.isEditing ? (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <Button
                                    onClick={() => saveTrait('debuffs', index)}
                                    size="sm"
                                    className="bg-kairos-gold px-2 py-1 text-xs text-telos-black hover:bg-kairos-gold/90"
                                  >
                                    저장
                                  </Button>
                                  <button
                                    onClick={() =>
                                      removeTrait('debuffs', index)
                                    }
                                    className="text-socratic-grey hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <Badge className="border-green-300 bg-green-100 text-xs text-green-800">
                                    추가됨
                                  </Badge>
                                  <Button
                                    onClick={() => editTrait('debuffs', index)}
                                    size="sm"
                                    variant="outline"
                                    className="border-kairos-gold px-2 py-1 text-xs text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                  >
                                    수정
                                  </Button>
                                  <button
                                    onClick={() =>
                                      removeTrait('debuffs', index)
                                    }
                                    className="text-socratic-grey hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              <CardContent className="pb-3 pt-4">
                                <div className="mb-2 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-800">
                                      특성 ID{' '}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      value={trait.traitId}
                                      onChange={(e) =>
                                        updateTrait(
                                          'debuffs',
                                          index,
                                          'traitId',
                                          e.target.value.toUpperCase(),
                                        )
                                      }
                                      className="border-socratic-grey bg-white text-xs"
                                      placeholder="CYNICISM"
                                      disabled={!trait.isEditing}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-800">
                                      특성 이름{' '}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      value={trait.traitName}
                                      onChange={(e) =>
                                        updateTrait(
                                          'debuffs',
                                          index,
                                          'traitName',
                                          e.target.value,
                                        )
                                      }
                                      className="border-socratic-grey bg-white text-xs"
                                      placeholder="냉소주의"
                                      disabled={!trait.isEditing}
                                    />
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    가중치 유형{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    value={trait.weightType}
                                    onChange={(e) =>
                                      updateTrait(
                                        'debuffs',
                                        index,
                                        'weightType',
                                        e.target.value,
                                      )
                                    }
                                    className="border-socratic-grey bg-white text-xs"
                                    placeholder="불신, 이기심"
                                    disabled={!trait.isEditing}
                                  />
                                </div>
                                <div className="mb-2">
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    아이콘 URL
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      value={trait.iconUrl}
                                      onChange={(e) =>
                                        updateTrait(
                                          'debuffs',
                                          index,
                                          'iconUrl',
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1 border-socratic-grey bg-white text-xs"
                                      placeholder="아이콘 URL"
                                      disabled={!trait.isEditing}
                                    />
                                    {trait.isEditing && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-kairos-gold px-2 text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                        onClick={() => {
                                          const input =
                                            document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => {
                                            const file = (
                                              e.target as HTMLInputElement
                                            ).files?.[0];
                                            if (file) {
                                              const url =
                                                URL.createObjectURL(file);
                                              updateTrait(
                                                'debuffs',
                                                index,
                                                'iconUrl',
                                                url,
                                              );
                                            }
                                          };
                                          input.click();
                                        }}
                                      >
                                        파일
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {trait.iconUrl && (
                                  <img
                                    src={trait.iconUrl || '/placeholder.svg'}
                                    alt="특성 아이콘"
                                    className="mb-2 h-8 w-8 rounded border object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-800">
                                    설명
                                  </label>
                                  <Textarea
                                    value={trait.description}
                                    onChange={(e) =>
                                      updateTrait(
                                        'debuffs',
                                        index,
                                        'description',
                                        e.target.value,
                                      )
                                    }
                                    className="border-socratic-grey bg-white text-xs"
                                    placeholder="특성 설명"
                                    rows={2}
                                    maxLength={200}
                                    disabled={!trait.isEditing}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: 핵심 서사 요소 */}
            <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-kairos-gold">
                  핵심 서사 요소
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 핵심 딜레마 */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">핵심 딜레마</h4>
                    <Button
                      onClick={addDilemma}
                      variant="outline"
                      size="sm"
                      className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      딜레마 추가
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {scenario.coreDilemmas.map((dilemma, index) => (
                      <Card
                        key={index}
                        className="relative border-socratic-grey/30 bg-white/50"
                      >
                        <button
                          onClick={() => removeDilemma(index)}
                          className="absolute right-3 top-3 text-socratic-grey hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <CardContent className="pt-6">
                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                딜레마 ID
                              </label>
                              <Input
                                value={dilemma.dilemmaId}
                                onChange={(e) =>
                                  updateDilemma(
                                    index,
                                    'dilemmaId',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="HOSPITAL_SCREAM"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                제목
                              </label>
                              <Input
                                value={dilemma.title}
                                onChange={(e) =>
                                  updateDilemma(index, 'title', e.target.value)
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="병원의 비명"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-800">
                              설명
                            </label>
                            <Textarea
                              value={dilemma.description}
                              onChange={(e) =>
                                updateDilemma(
                                  index,
                                  'description',
                                  e.target.value,
                                )
                              }
                              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                              placeholder="딜레마 상황을 자세히 설명하세요"
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 엔딩 원형 */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">엔딩 원형</h4>
                    <Button
                      onClick={addEnding}
                      variant="outline"
                      size="sm"
                      className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      엔딩 추가
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {scenario.endingArchetypes.map((ending, index) => (
                      <Card
                        key={index}
                        className="relative border-socratic-grey/30 bg-white/50"
                      >
                        <button
                          onClick={() => removeEnding(index)}
                          className="absolute right-3 top-3 text-socratic-grey hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <CardContent className="pt-6">
                          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                엔딩 ID
                              </label>
                              <Input
                                value={ending.endingId}
                                onChange={(e) =>
                                  updateEnding(
                                    index,
                                    'endingId',
                                    e.target.value,
                                  )
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="A_CITY_ESCAPE"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-800">
                                제목
                              </label>
                              <Input
                                value={ending.title}
                                onChange={(e) =>
                                  updateEnding(index, 'title', e.target.value)
                                }
                                className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                                placeholder="시티 이스케이프"
                              />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-800">
                              설명
                            </label>
                            <Textarea
                              value={ending.description}
                              onChange={(e) =>
                                updateEnding(
                                  index,
                                  'description',
                                  e.target.value,
                                )
                              }
                              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                              placeholder="엔딩 시나리오를 설명하세요"
                              rows={3}
                            />
                          </div>

                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-800">
                                시스템 조건
                              </label>
                              <Button
                                onClick={() => {
                                  const newCondition: SystemCondition = {
                                    type: '필수 스탯',
                                  };
                                  updateEnding(index, 'systemConditions', [
                                    ...ending.systemConditions,
                                    newCondition,
                                  ]);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                조건 추가
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {ending.systemConditions.map(
                                (condition, condIndex) => (
                                  <div
                                    key={condIndex}
                                    className="flex items-center gap-2 rounded bg-gray-50 p-3"
                                  >
                                    <Select
                                      value={condition.type}
                                      onValueChange={(
                                        value:
                                          | '필수 스탯'
                                          | '필수 플래그'
                                          | '생존자 수',
                                      ) => {
                                        const newConditions = [
                                          ...ending.systemConditions,
                                        ];
                                        newConditions[condIndex] = {
                                          type: value,
                                        };
                                        updateEnding(
                                          index,
                                          'systemConditions',
                                          newConditions,
                                        );
                                      }}
                                    >
                                      <SelectTrigger className="w-32 border-socratic-grey bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="필수 스탯">
                                          필수 스탯
                                        </SelectItem>
                                        <SelectItem value="필수 플래그">
                                          필수 플래그
                                        </SelectItem>
                                        <SelectItem value="생존자 수">
                                          생존자 수
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {condition.type === '필수 스탯' && (
                                      <>
                                        <Select
                                          value={condition.statId || ''}
                                          onValueChange={(value) => {
                                            const newConditions = [
                                              ...ending.systemConditions,
                                            ];
                                            newConditions[condIndex] = {
                                              ...condition,
                                              statId: value,
                                            };
                                            updateEnding(
                                              index,
                                              'systemConditions',
                                              newConditions,
                                            );
                                          }}
                                        >
                                          <SelectTrigger className="w-32 border-socratic-grey bg-white">
                                            <SelectValue placeholder="스탯 선택" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {scenario.scenarioStats.map(
                                              (stat) => (
                                                <SelectItem
                                                  key={stat.id}
                                                  value={stat.id}
                                                >
                                                  {stat.name}
                                                </SelectItem>
                                              ),
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Select
                                          value={condition.comparison || '>='}
                                          onValueChange={(
                                            value: '>=' | '<=' | '==',
                                          ) => {
                                            const newConditions = [
                                              ...ending.systemConditions,
                                            ];
                                            newConditions[condIndex] = {
                                              ...condition,
                                              comparison: value,
                                            };
                                            updateEnding(
                                              index,
                                              'systemConditions',
                                              newConditions,
                                            );
                                          }}
                                        >
                                          <SelectTrigger className="w-20 border-socratic-grey bg-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value=">=">
                                              {'>='}
                                            </SelectItem>
                                            <SelectItem value="<=">{`<=`}</SelectItem>
                                            <SelectItem value="==">
                                              ==
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          value={condition.value || ''}
                                          onChange={(e) => {
                                            const newConditions = [
                                              ...ending.systemConditions,
                                            ];
                                            newConditions[condIndex] = {
                                              ...condition,
                                              value: Number.parseInt(
                                                e.target.value,
                                              ),
                                            };
                                            updateEnding(
                                              index,
                                              'systemConditions',
                                              newConditions,
                                            );
                                          }}
                                          className="w-20 border-socratic-grey bg-white"
                                          placeholder="값"
                                        />
                                      </>
                                    )}

                                    {condition.type === '필수 플래그' && (
                                      <Input
                                        value={condition.flagName || ''}
                                        onChange={(e) => {
                                          const newConditions = [
                                            ...ending.systemConditions,
                                          ];
                                          newConditions[condIndex] = {
                                            ...condition,
                                            flagName: e.target.value,
                                          };
                                          updateEnding(
                                            index,
                                            'systemConditions',
                                            newConditions,
                                          );
                                        }}
                                        className="flex-1 border-socratic-grey bg-white"
                                        placeholder="플래그 이름"
                                      />
                                    )}

                                    {condition.type === '생존자 수' && (
                                      <>
                                        <Select
                                          value={condition.comparison || '>='}
                                          onValueChange={(
                                            value: '>=' | '<=' | '==',
                                          ) => {
                                            const newConditions = [
                                              ...ending.systemConditions,
                                            ];
                                            newConditions[condIndex] = {
                                              ...condition,
                                              comparison: value,
                                            };
                                            updateEnding(
                                              index,
                                              'systemConditions',
                                              newConditions,
                                            );
                                          }}
                                        >
                                          <SelectTrigger className="w-20 border-socratic-grey bg-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value=">=">
                                              {'>='}
                                            </SelectItem>
                                            <SelectItem value="<=">{`<=`}</SelectItem>
                                            <SelectItem value="==">
                                              ==
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          value={condition.value || ''}
                                          onChange={(e) => {
                                            const newConditions = [
                                              ...ending.systemConditions,
                                            ];
                                            newConditions[condIndex] = {
                                              ...condition,
                                              value: Number.parseInt(
                                                e.target.value,
                                              ),
                                            };
                                            updateEnding(
                                              index,
                                              'systemConditions',
                                              newConditions,
                                            );
                                          }}
                                          className="w-20 border-socratic-grey bg-white"
                                          placeholder="수"
                                        />
                                      </>
                                    )}

                                    <button
                                      onClick={() => {
                                        const newConditions =
                                          ending.systemConditions.filter(
                                            (_, i) => i !== condIndex,
                                          );
                                        updateEnding(
                                          index,
                                          'systemConditions',
                                          newConditions,
                                        );
                                      }}
                                      className="text-socratic-grey hover:text-red-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Sidebar */}
        <div className="w-80 p-8">
          <div className="sticky top-8 space-y-6">
            {/* 시나리오 상태 */}
            <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-kairos-gold">
                  시나리오 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex overflow-hidden rounded-lg border border-socratic-grey">
                  {(['작업 중', '테스트 중', '활성'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        setScenario((prev) => ({ ...prev, status }))
                      }
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        scenario.status === status
                          ? 'bg-kairos-gold text-telos-black'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-sm text-socratic-grey">
                  <p>
                    현재 상태:{' '}
                    <span className="font-medium text-gray-800">
                      {scenario.status}
                    </span>
                  </p>
                  <p className="mt-1 text-xs">마지막 수정: 2024년 12월 22일</p>
                </div>
              </CardContent>
            </Card>

            {/* 저장 버튼들 */}
            <div className="space-y-3">
              <Button
                onClick={handleSaveAndActivate}
                className="w-full bg-kairos-gold font-medium text-telos-black hover:bg-kairos-gold/90"
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                저장 및 활성화
              </Button>
              <Button
                onClick={handleTempSave}
                variant="outline"
                className="w-full border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                size="lg"
              >
                임시 저장
              </Button>
            </div>

            {/* 유효성 검사 결과 */}
            {errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="mb-2 text-sm font-medium text-red-800">
                        필수 항목 누락
                      </p>
                      <ul className="space-y-1 text-xs text-red-700">
                        {errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 진행률 및 통계 */}
            <Card className="border-socratic-grey/20 bg-parchment-white">
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">등장인물</span>
                    <span className="font-medium text-gray-800">
                      {scenario.characters.length}명
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">관계 설정</span>
                    <span className="font-medium text-gray-800">
                      {scenario.initialRelationships.length}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">시나리오 스탯</span>
                    <span className="font-medium text-gray-800">
                      {scenario.scenarioStats.length}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">특성 풀</span>
                    <span className="font-medium text-gray-800">
                      {scenario.traitPool.buffs.length +
                        scenario.traitPool.debuffs.length}
                      개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">핵심 딜레마</span>
                    <span className="font-medium text-gray-800">
                      {scenario.coreDilemmas.length}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-socratic-grey">엔딩 원형</span>
                    <span className="font-medium text-gray-800">
                      {scenario.endingArchetypes.length}개
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* JSON 미리보기 */}
            <Card className="border-socratic-grey/20 bg-parchment-white">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-800">
                  JSON 미리보기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-400">
                  <pre>
                    {JSON.stringify(scenario, null, 2).substring(0, 200)}...
                  </pre>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(scenario, null, 2),
                    );
                    alert('JSON이 클립보드에 복사되었습니다.');
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full border-socratic-grey text-socratic-grey hover:bg-socratic-grey hover:text-white"
                >
                  JSON 복사
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
