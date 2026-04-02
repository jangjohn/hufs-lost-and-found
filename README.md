# 교내 분실물 찾기 시스템

한국외국어대학교 클라우드 컴퓨팅 수업 팀 프로젝트

GCP Firebase 기반 서버리스 + 이벤트 드리븐 아키텍처로 구현한 교내 분실물/습득물 매칭 시스템입니다.

**배포 URL:** https://lost-and-found-bf9ae.web.app

## 주요 기능

- 분실물/습득물 등록 (이미지 최대 3장)
- 실시간 게시판 조회 + 필터링 (유형, 분류, 장소, 날짜, 키워드 검색)
- AI 자동 매칭 (OpenAI Embedding + Pinecone 벡터 검색)
- Cloud Vision 이미지 라벨 추출
- 본인 확인 (서버사이드 SHA-256 검증, 3회 제한)
- FCM 푸시 알림 (구독 기반 + 매칭 알림)
- 만료 자동 정리 (90일 TTL)

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React 18, Vite, TailwindCSS, react-router-dom v6 |
| Auth | Firebase Auth (Google, .ac.kr 이메일 제한) |
| Database | Cloud Firestore |
| Storage | Cloud Storage for Firebase |
| Compute | Cloud Functions for Firebase 2nd gen (TypeScript) |
| Event | Cloud Pub/Sub |
| AI | OpenAI text-embedding-3-small + Pinecone |
| Vision | Cloud Vision API |
| Push | Firebase Cloud Messaging |
| Hosting | Firebase Hosting |

## 프로젝트 구조

```
lost-and-found/
├── frontend/          # React + Vite + TailwindCSS
│   └── src/
│       ├── components/   # UI 컴포넌트
│       ├── pages/        # 페이지 (Home, PostNew, PostDetail, Verify, Matches, Profile, Login)
│       ├── hooks/        # useAuth, useFirestore, useNotification
│       └── lib/          # Firebase 초기화, 타입 정의, 유틸
├── functions/         # Cloud Functions (TypeScript)
│   └── src/
│       ├── triggers/     # Firestore onCreate 트리거
│       ├── matching/     # AI 매칭 (Embedding + Pinecone)
│       ├── notification/ # FCM 푸시 알림
│       ├── vision/       # Cloud Vision 이미지 분석
│       ├── verify/       # 본인 확인 (SHA-256)
│       └── cleanup/      # 만료 아이템 정리
├── firestore.rules    # Firestore 보안 규칙
├── storage.rules      # Cloud Storage 보안 규칙
└── firebase.json      # Firebase 설정
```

## 로컬 개발

```bash
# Frontend
cd frontend
cp .env.example .env   # Firebase 설정값 입력
npm install
npm run dev

# Functions
cd functions
cp .env.example .env   # API 키 입력
npm install
npm run build
```

## 배포

```bash
# Frontend만 배포
cd frontend && npm run build && cd .. && firebase deploy --only hosting

# Firestore Rules + Indexes 배포
firebase deploy --only firestore

# Storage Rules 배포
firebase deploy --only storage

# Cloud Functions 배포
firebase deploy --only functions
```

## 팀 구성

| 이름 | 역할 |
|------|------|
| 장준위 | 아키텍처, Firebase 인프라, Frontend, Cloud Functions (trigger/notification/cleanup/verify), 배포 |
| 권성재 | AI 매칭 (OpenAI + Pinecone), Cloud Vision, matchItem/analyzeImage 구현 |
| 박성재 | 통합 테스트, 테스트 데이터, 발표 자료, 데모 영상 |
