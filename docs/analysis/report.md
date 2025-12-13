```json
{
  "sessionId": "session_1765630699047",
  "scenarioId": "FROZEN_PROMISE",
  "scenarioTitle": "얼어붙은 시간 속의 약속",
  "startTime": "2025-12-13T12:58:19.047Z",
  "snapshots": [
    {
      "timestamp": "2025-12-13T12:58:19.221Z",
      "stage": "Stage 1: 게임 초기화",
      "data": {
        "protagonistKnowledge": {
          "metCharacters": ["강하늘"],
          "hintedRelationships": [],
          "discoveredRelationships": [],
          "informationPiecesCount": 0
        },
        "characterArcs": [
          {
            "name": "강하늘",
            "trustLevel": 0,
            "mood": "anxious",
            "momentsCount": 0
          },
          {
            "name": "닥터 엘라 로스",
            "trustLevel": 0,
            "mood": "anxious",
            "momentsCount": 0
          },
          {
            "name": "칼",
            "trustLevel": 0,
            "mood": "anxious",
            "momentsCount": 0
          }
        ],
        "worldState": {
          "locationsCount": 6,
          "locations": [null, null, null, null, null, null]
        },
        "actionContext": {
          "currentLocation": "2099년, 빙하기로 뒤덮인 북미 대륙의 외딴 거주지",
          "urgentMatters": []
        },
        "stats": {
          "familyUrgency": 70,
          "ancientSecretKnowledge": 10,
          "survivalSupplies": 50,
          "humanity": 60,
          "hostileEncounter": 30
        },
        "actionPoints": 3,
        "maxActionPoints": 3
      }
    },
    {
      "timestamp": "2025-12-13T12:58:22.683Z",
      "stage": "Stage 2: 스토리 오프닝",
      "data": {
        "openingCompleted": true,
        "chatHistoryLength": 3,
        "metCharacters": ["강하늘"],
        "characterArcs": [
          {
            "name": "강하늘",
            "momentsCount": 1,
            "latestMoment": {
              "day": 1,
              "type": "relationship",
              "description": "강하늘과(와) 처음 만났다.",
              "relatedCharacter": "(플레이어)",
              "impact": "positive"
            }
          },
          {
            "name": "닥터 엘라 로스",
            "momentsCount": 0
          },
          {
            "name": "칼",
            "momentsCount": 0
          }
        ],
        "actionContext": {
          "currentSituation": "삐- 삐- 삐-. 동면 장치에서 울리는 경고음이 차가운 공기를 갈랐다.\n잔여 전력 . 7일 후, 모든 것이 멈춘다. 내 심장이 차갑게 내려앉았다. 모든 준비는 완벽하다고 믿었지만,...",
          "todayActions": {
            "explorations": [],
            "dialogues": [
              {
                "characterName": "강하늘",
                "topic": "first_encounter"
              }
            ],
            "choices": []
          }
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:58:55.083Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 404,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 70,
            "after": 80,
            "diff": 10
          },
          "survivalSupplies": {
            "before": 50,
            "after": 40,
            "diff": -10
          },
          "humanity": {
            "before": 60,
            "after": 50,
            "diff": -10
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (10%)",
          "생존 물품 위험 수준 (40%)",
          "적대적 조우 위험 수준 (30%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:58:55.083Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "나의 절박한 상황을 솔직하게 설명하며 도움을 요청한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 1,
          "latestKeyDecision": {
            "day": 1,
            "turn": 0,
            "choice": "나의 절박한 상황을 솔직하게 설명하며 도움을 요청한다",
            "consequence": "버려진 대피소 안은 퀴퀴한 먼지 냄새와 함께 살을 에는 추위로 가득했다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 2,
          "currentDay": 1
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:59:19.985Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 514,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 80,
            "after": 68,
            "diff": -12
          },
          "survivalSupplies": {
            "before": 40,
            "after": 20,
            "diff": -20
          },
          "humanity": {
            "before": 50,
            "after": 86,
            "diff": 36
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (10%)",
          "생존 물품 위험 수준 (20%)",
          "적대적 조우 위험 수준 (30%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:59:19.985Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "그의 생존을 돕겠다고 약속하며 거래를 제안한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 2,
          "latestKeyDecision": {
            "day": 1,
            "turn": 1,
            "choice": "그의 생존을 돕겠다고 약속하며 거래를 제안한다",
            "consequence": "버려진 대피소 안은 퀴퀴한 먼지 냄새와 함께 살을 에는 추위로 가득했다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 1,
          "currentDay": 1
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:59:41.774Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "dialogue",
      "data": {
        "actionType": "dialogue",
        "details": {
          "characterName": "강하늘",
          "topic": "recent_decision",
          "relationshipChange": -2
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 2,
          "latestKeyDecision": {
            "day": 1,
            "turn": 1,
            "choice": "그의 생존을 돕겠다고 약속하며 거래를 제안한다",
            "consequence": "버려진 대피소 안은 퀴퀴한 먼지 냄새와 함께 살을 에는 추위로 가득했다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 3,
          "currentDay": 2
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:59:52.948Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 467,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "survivalSupplies": {
            "before": 20,
            "after": 2,
            "diff": -18
          },
          "humanity": {
            "before": 86,
            "after": 98,
            "diff": 12
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (10%)",
          "생존 물품 위험 수준 (2%)",
          "적대적 조우 위험 수준 (30%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T12:59:52.948Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "강하늘의 가족을 돕기 위해 자원을 일부 양보한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 3,
          "latestKeyDecision": {
            "day": 2,
            "turn": 0,
            "choice": "강하늘의 가족을 돕기 위해 자원을 일부 양보한다",
            "consequence": "버려진 대피소 안은 퀴퀴한 먼지 냄새와 함께 살을 에는 추위로 가득했다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 2,
          "currentDay": 2
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:11.187Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 467,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 68,
            "after": 84,
            "diff": 16
          },
          "survivalSupplies": {
            "before": 2,
            "after": 0,
            "diff": -2
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (10%)",
          "생존 물품 위험 수준 (0%)",
          "적대적 조우 위험 수준 (30%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:11.187Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "자원 제공 여부를 보류하고 다른 해결책을 찾는다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 4,
          "latestKeyDecision": {
            "day": 2,
            "turn": 1,
            "choice": "자원 제공 여부를 보류하고 다른 해결책을 찾는다",
            "consequence": "강하늘의 떨리는 목소리가 텅 빈 대피소에 울려 퍼졌다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 1,
          "currentDay": 2
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:25.501Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 450,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 84,
            "after": 78,
            "diff": -6
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (10%)",
          "생존 물품 위험 수준 (0%)",
          "적대적 조우 위험 수준 (30%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:25.502Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "강하늘에게 자원 확보를 위한 임무를 제안한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 5,
          "latestKeyDecision": {
            "day": 2,
            "turn": 2,
            "choice": "강하늘에게 자원 확보를 위한 임무를 제안한다",
            "consequence": "강하늘은 당신이 건네받은 식량 꾸러미를 꽉 쥔 손이 유난히 하얗게 보였다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 3,
          "currentDay": 3
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:40.056Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 644,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 78,
            "after": 72,
            "diff": -6
          },
          "ancientSecretKnowledge": {
            "before": 10,
            "after": 16,
            "diff": 6
          },
          "survivalSupplies": {
            "before": 0,
            "after": 6,
            "diff": 6
          },
          "humanity": {
            "before": 98,
            "after": 100,
            "diff": 2
          },
          "hostileEncounter": {
            "before": 30,
            "after": 40,
            "diff": 10
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (16%)",
          "생존 물품 위험 수준 (6%)",
          "적대적 조우 위험 수준 (40%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:40.057Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "강하늘에게 추가적인 임무를 제안한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 6,
          "latestKeyDecision": {
            "day": 3,
            "turn": 0,
            "choice": "강하늘에게 추가적인 임무를 제안한다",
            "consequence": "강하늘의 떨리는 손이 내가 건넨 식량 꾸러미를 더욱 꽉 쥐었다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 2,
          "currentDay": 3
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:50.503Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 567,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 72,
            "after": 62,
            "diff": -10
          },
          "ancientSecretKnowledge": {
            "before": 16,
            "after": 26,
            "diff": 10
          },
          "survivalSupplies": {
            "before": 6,
            "after": 18,
            "diff": 12
          },
          "hostileEncounter": {
            "before": 40,
            "after": 50,
            "diff": 10
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (26%)",
          "생존 물품 위험 수준 (18%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:00:50.504Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "자원을 찾아 강하늘과 함께 탐색에 나선다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 7,
          "latestKeyDecision": {
            "day": 3,
            "turn": 1,
            "choice": "자원을 찾아 강하늘과 함께 탐색에 나선다",
            "consequence": "강하늘의 눈빛은 얼어붙은 대지처럼 차갑게 가라앉아 있었다",
            "category": "survival",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 1,
          "currentDay": 3
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:02.675Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 649,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "ancientSecretKnowledge": {
            "before": 26,
            "after": 36,
            "diff": 10
          },
          "survivalSupplies": {
            "before": 18,
            "after": 34,
            "diff": 16
          },
          "hostileEncounter": {
            "before": 50,
            "after": 40,
            "diff": -10
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (36%)",
          "생존 물품 위험 수준 (34%)",
          "적대적 조우 위험 수준 (40%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:02.676Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "일단 후퇴하여 안전한 곳에서 정보를 수집한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 8,
          "latestKeyDecision": {
            "day": 3,
            "turn": 2,
            "choice": "일단 후퇴하여 안전한 곳에서 정보를 수집한다",
            "consequence": "강하늘의 떨리는 손을 잡았던 온기가 아직 손끝에 남아있는 듯했다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘"]
          },
          "actionPoints": 3,
          "currentDay": 4
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:11.817Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 388,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "survivalSupplies": {
            "before": 34,
            "after": 24,
            "diff": -10
          },
          "hostileEncounter": {
            "before": 40,
            "after": 50,
            "diff": 10
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (36%)",
          "생존 물품 위험 수준 (24%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:11.818Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "안전한 곳으로 돌아가 정보를 수집한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 9,
          "latestKeyDecision": {
            "day": 4,
            "turn": 0,
            "choice": "안전한 곳으로 돌아가 정보를 수집한다",
            "consequence": "버려진 대피소 안은 퀴퀴한 먼지 냄새와 함께 살을 에는 추위로 가득했다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 2,
          "currentDay": 4
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:23.625Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 330,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 62,
            "after": 72,
            "diff": 10
          },
          "survivalSupplies": {
            "before": 24,
            "after": 20,
            "diff": -4
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (36%)",
          "생존 물품 위험 수준 (20%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:23.625Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "주변을 더 탐색하여 이동 경로의 안전을 확보한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 10,
          "latestKeyDecision": {
            "day": 4,
            "turn": 1,
            "choice": "주변을 더 탐색하여 이동 경로의 안전을 확보한다",
            "consequence": "버려진 대피소의 싸늘한 공기 속에서 강하늘은 낡은 담요를 더욱 단단히 여몄다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 1,
          "currentDay": 4
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:30.629Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 362,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "survivalSupplies": {
            "before": 20,
            "after": 14,
            "diff": -6
          }
        },
        "urgentMatters": [
          "고대 비밀 지식 위험 수준 (36%)",
          "생존 물품 위험 수준 (14%)"
        ],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:30.630Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "두 사람을 만류하고, 일단 대피소 주변을 더 안전하게 정비한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 1,
          "keyDecisionsCount": 11,
          "latestKeyDecision": {
            "day": 4,
            "turn": 2,
            "choice": "두 사람을 만류하고, 일단 대피소 주변을 더 안전하게 정비한다",
            "consequence": "버려진 대피소의 싸늘한 공기 속에서 강하늘은 낡은 담요를 더욱 단단히 여몄다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 3,
          "currentDay": 5
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:39.042Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "exploration",
      "data": {
        "actionType": "exploration",
        "details": {
          "locationId": "loc_frozen_library",
          "rewards": {
            "statChanges": {
              "ancientSecretKnowledge": 5
            },
            "infoGained": "지도는 '영원의 샘'으로 가는 경로를 보여준다.. 잊혀진 도시의 지도: 희미하게 그려진 잊혀진 도시의 지도로, '영원의 샘'으로 가는 경로가 표시되어 있다."
          },
          "newDiscoveries": 0
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 2,
          "keyDecisionsCount": 11,
          "latestKeyDecision": {
            "day": 4,
            "turn": 2,
            "choice": "두 사람을 만류하고, 일단 대피소 주변을 더 안전하게 정비한다",
            "consequence": "버려진 대피소의 싸늘한 공기 속에서 강하늘은 낡은 담요를 더욱 단단히 여몄다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 2,
          "currentDay": 5
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:55.579Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 91,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "ancientSecretKnowledge": {
            "before": 41,
            "after": 71,
            "diff": 30
          }
        },
        "urgentMatters": ["생존 물품 위험 수준 (14%)"],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:01:55.580Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "칼을 설득하여 엘라와 함께 주변을 탐색한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 2,
          "keyDecisionsCount": 12,
          "latestKeyDecision": {
            "day": 5,
            "turn": 1,
            "choice": "칼을 설득하여 엘라와 함께 주변을 탐색한다",
            "consequence": "차가운 도서관의 공기가 폐부를 찔렀다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "칼"]
          },
          "actionPoints": 1,
          "currentDay": 5
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:02:02.678Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 296,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 72,
            "after": 82,
            "diff": 10
          },
          "ancientSecretKnowledge": {
            "before": 71,
            "after": 81,
            "diff": 10
          },
          "survivalSupplies": {
            "before": 14,
            "after": 10,
            "diff": -4
          }
        },
        "urgentMatters": ["생존 물품 위험 수준 (10%)"],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:02:02.678Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "잠시 상황을 관망한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 2,
          "keyDecisionsCount": 13,
          "latestKeyDecision": {
            "day": 5,
            "turn": 2,
            "choice": "잠시 상황을 관망한다",
            "consequence": "차가운 도서관의 공기가 폐부를 찔렀다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 3,
          "currentDay": 6
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:02:10.981Z",
      "stage": "Stage 4: AI 응답 처리",
      "data": {
        "aiResponse": {
          "logLength": 358,
          "hasStatChanges": true,
          "hasRelationshipChanges": false
        },
        "statChanges": {
          "familyUrgency": {
            "before": 82,
            "after": 100,
            "diff": 18
          },
          "survivalSupplies": {
            "before": 10,
            "after": 20,
            "diff": 10
          },
          "hostileEncounter": {
            "before": 50,
            "after": 100,
            "diff": 50
          }
        },
        "urgentMatters": ["생존 물품 위험 수준 (20%)"],
        "npcRelationshipStates": [
          {
            "relationId": "REL_001",
            "visibility": "hinted"
          },
          {
            "relationId": "REL_002",
            "visibility": "hidden"
          },
          {
            "relationId": "REL_003",
            "visibility": "hidden"
          }
        ],
        "protagonistKnowledge": {
          "hintedRelationships": [],
          "discoveredRelationships": []
        }
      }
    },
    {
      "timestamp": "2025-12-13T13:02:10.981Z",
      "stage": "Stage 3: 메인 게임 루프",
      "action": "choice",
      "data": {
        "actionType": "choice",
        "details": {
          "choice": "'영원의 샘'을 향해 즉시 출발한다",
          "isCustomInput": false,
          "synergyApplied": true,
          "apCost": 1
        },
        "afterAction": {
          "metCharacters": ["강하늘", "닥터 엘라 로스", "칼"],
          "informationPiecesCount": 2,
          "keyDecisionsCount": 14,
          "latestKeyDecision": {
            "day": 6,
            "turn": 0,
            "choice": "'영원의 샘'을 향해 즉시 출발한다",
            "consequence": "강하늘은 잊혀진 도시의 지도를 쥔 채, 얼어붙은 도서관의 싸늘한 공기를 마셨다",
            "category": "strategic",
            "flagsAcquired": [],
            "impactedCharacters": ["강하늘", "닥터 엘라 로스", "칼"]
          },
          "actionPoints": 1,
          "currentDay": 6
        }
      }
    }
  ],
  "verifications": [
    {
      "category": "Stage 1",
      "item": "protagonistKnowledge.metCharacters 초기화",
      "status": "pass",
      "details": "1명: 강하늘"
    },
    {
      "category": "Stage 1",
      "item": "characterArcs.trustLevel이 initialRelationships 반영",
      "status": "pass",
      "details": "강하늘: 0, 닥터 엘라 로스: 0, 칼: 0"
    },
    {
      "category": "Stage 1",
      "item": "worldState.locations 초기화",
      "status": "pass",
      "details": "6개 위치"
    },
    {
      "category": "Stage 1",
      "item": "actionContext.currentLocation 설정",
      "status": "pass",
      "details": "2099년, 빙하기로 뒤덮인 북미 대륙의 외딴 거주지"
    },
    {
      "category": "Stage 2",
      "item": "오프닝 서사 chatHistory 추가",
      "status": "pass",
      "details": "3개 메시지"
    },
    {
      "category": "Stage 2",
      "item": "metCharacters 첫 만남 캐릭터 추가",
      "status": "unchecked"
    },
    {
      "category": "Stage 2",
      "item": "characterArcs 첫 만남 moment 추가",
      "status": "pass",
      "details": "1명에게 moment 추가"
    },
    {
      "category": "Stage 2",
      "item": "actionContext.currentSituation 업데이트",
      "status": "pass",
      "details": "삐- 삐- 삐-. 동면 장치에서 울리는 경고음이 차가운 공기를 갈랐다.\n잔여 전력 . 7일..."
    },
    {
      "category": "Stage 3",
      "item": "handlePlayerChoice 정상 동작",
      "status": "unchecked"
    },
    {
      "category": "Stage 3",
      "item": "handleDialogueSelect metCharacters 자동 추가",
      "status": "unchecked"
    },
    {
      "category": "Stage 3",
      "item": "handleExplore informationPieces 추가",
      "status": "unchecked"
    },
    {
      "category": "Stage 3",
      "item": "keyDecisions 기록",
      "status": "unchecked"
    },
    {
      "category": "Stage 3",
      "item": "시너지 보너스 적용",
      "status": "unchecked"
    },
    {
      "category": "Stage 3",
      "item": "AP 소모 정상 동작",
      "status": "unchecked"
    },
    {
      "category": "Stage 4",
      "item": "스탯 변화 적용 (증폭 시스템)",
      "status": "pass"
    },
    {
      "category": "Stage 4",
      "item": "urgentMatters 자동 업데이트",
      "status": "pass",
      "details": "생존 물품 위험 수준 (20%)"
    },
    {
      "category": "Stage 4",
      "item": "informationPieces 중복 제거",
      "status": "unchecked"
    },
    {
      "category": "Stage 4",
      "item": "NPC 관계 힌트 감지 (hidden→hinted)",
      "status": "unchecked"
    },
    {
      "category": "Stage 4",
      "item": "NPC 관계 공개 (hinted→revealed)",
      "status": "unchecked"
    },
    {
      "category": "Stage 5",
      "item": "Dynamic Ending 트리거",
      "status": "unchecked"
    },
    {
      "category": "Stage 5",
      "item": "characterArcs 엔딩 프롬프트 전달",
      "status": "unchecked"
    },
    {
      "category": "Stage 5",
      "item": "discoveredInfo 엔딩 프롬프트 전달",
      "status": "unchecked"
    },
    {
      "category": "기타",
      "item": "레거시 시나리오 (storyOpening 없음) 호환",
      "status": "unchecked"
    },
    {
      "category": "기타",
      "item": "AI 응답 언어 검증 (한국어)",
      "status": "unchecked"
    }
  ],
  "summary": {
    "totalActions": 16,
    "currentDay": 6,
    "errors": []
  }
}
```
