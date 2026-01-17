# AuxModel - SillyTavern 보조 모델 확장

AI 응답에 상태창, 이미지 명령어, 선택지 등 게임적 요소를 자동으로 추가하는 SillyTavern 확장입니다.

## 개요

메인 AI가 창작 글쓰기에 집중하는 동안, AuxModel은 별도의 보조 모델을 호출하여 게임 메카닉 요소를 자동 생성합니다.

## 주요 기능

### 자동 응답 보강
- AI 응답마다 보조 모델이 추가 콘텐츠 생성
- 위치 마커를 사용한 지능적인 콘텐츠 병합
  - `[PREPEND]` - 응답 시작 부분에 삽입 (상태창용)
  - `[APPEND]` - 응답 끝 부분에 삽입 (선택지용)
  - `[INSERT:N]` - N번째 문단 뒤에 삽입 (이미지용)

### 설정 관리
- 전역 설정 및 캐릭터별 개별 설정 지원
- SillyTavern Connection Manager를 통한 API 프로필 선택
- 사용자 정의 상태창/에셋 명령어 형식
- 완전히 커스터마이징 가능한 프롬프트 템플릿

### 월드인포 연동
- 캐릭터별 월드인포 북 바인딩
- 키워드 기반 엔트리 필터링
- 메인 모델에서는 비활성화하고 보조 모델에서만 사용 가능

### 메시지 재생성
- 호버 버튼으로 보조 콘텐츠만 개별 재생성
- 메시지 편집 시 자동 재병합
- 일관성 유지를 위한 히스토리 추적 (최대 10턴)

## 설치

1. SillyTavern의 확장 폴더에 `auxmodel` 폴더 복사
2. SillyTavern 재시작
3. 확장 메뉴에서 AuxModel 활성화

## 설정 방법

### 1. API 연결 설정
1. SillyTavern Connection Manager에서 보조 모델용 프로필 생성
2. AuxModel 설정에서 해당 프로필 선택

### 2. 월드인포 설정
1. 보조 모델에 제공할 정보가 담긴 월드인포 북 생성
2. 엔트리에 필터링용 키워드 추가 (기본값: `auxmodel`)
3. 설정 패널에서 사용할 엔트리 선택

### 3. 형식 정의
- **상태창 형식**: 상태 표시 형식 정의
- **에셋 형식**: 이미지/배경 명령어 형식 정의

## 프로젝트 구조

```
auxmodel/
├── index.js              # 메인 진입점
├── manifest.json         # 확장 메타데이터
├── popup.html            # 설정 UI 템플릿
├── style.css             # 스타일시트
└── src/
    ├── core/
    │   ├── constants.js  # 기본값, 프롬프트 템플릿
    │   └── settings.js   # 설정 관리 클래스
    ├── services/
    │   └── auxiliary.js  # API 통신, 프롬프트 빌드
    ├── parser/
    │   └── merger.js     # 응답 파싱 및 병합
    └── ui/
        └── settings-panel.js  # UI 인터랙션
```

## 설정 옵션

| 설정 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| enabled | boolean | false | 확장 활성화 여부 |
| connectionProfileId | string | null | 사용할 API 프로필 |
| maxTokens | number | 4096 | 보조 응답 최대 토큰 |
| assetCount | number | 3 | 응답당 최대 에셋 명령어 수 |
| worldInfoKeyword | string | "auxmodel" | 월드인포 필터링 키워드 |
| auxHistoryTurns | number | 2 | 포함할 이전 응답 수 |

## 데이터 흐름

```
AI 응답 수신
    ↓
AuxiliaryService.generate() 호출
    ├─ 월드인포 필터링
    ├─ 히스토리 수집
    ├─ 프롬프트 구성
    └─ API 요청 전송
    ↓
ResponseMerger.parse() - 위치 마커 추출
    ↓
ResponseMerger.merge() - 콘텐츠 병합
    ↓
UI 업데이트
```

## 호환성

- SillyTavern 1.12.0 이상
- Connection Manager API 지원 필요
- 모든 OpenAI 호환 API 사용 가능
