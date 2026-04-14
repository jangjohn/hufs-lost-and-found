# HUFS 분실물 찾기

한국외국어대학교 구성원을 위한 교내 분실물/습득물 웹 서비스입니다. 사용자는 분실물과 습득물을 등록하고, AI 기반 유사도 매칭과 알림 기능을 통해 빠르게 주인을 찾을 수 있습니다.

- 서비스 URL: https://lost-and-found-bf9ae.web.app
- Firebase 프로젝트: `lost-and-found-bf9ae`
- 저장소: `jangjohn/hufs-lost-and-found`

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프론트엔드 | React, Vite, Tailwind CSS, React Router |
| 인증 | Firebase Authentication |
| 데이터베이스 | Cloud Firestore |
| 스토리지 | Cloud Storage for Firebase |
| 백엔드 | Cloud Functions for Firebase 2nd gen, TypeScript |
| 이벤트 | Cloud Pub/Sub |
| AI | OpenAI Embedding, Pinecone |
| 이미지 분석 | Cloud Vision API |
| 알림 | Firebase Cloud Messaging |

## 아키텍처

```text
[사용자 브라우저]
        |
        v
[Firebase Hosting]
        |
        +--> [Firebase Auth]
        |
        +--> [Cloud Firestore] -- items 생성 --> [Pub/Sub: new-item]
                                              |             |
                                              |             +--> [matchItem]
                                              |             +--> [notifyOnNewItem]
                                              |             +--> [analyzeImage]
                                              |
                                              +--> [matches / users / verificationAttempts]
```

## 개발 타임라인

### Phase 1. 기반 구축
- Firebase 프로젝트, Hosting, Firestore, Storage 기본 환경 구성
- React 프론트엔드 초기 화면과 로그인 흐름 구성
- 분실물/습득물 등록, 목록 조회, 이미지 업로드 기본 기능 구현

### Phase 2. 이벤트 파이프라인
- `onItemCreated` 트리거와 Pub/Sub 토픽 연결
- AI 매칭(`matchItem`)과 이미지 분석(`analyzeImage`) 파이프라인 구축
- FCM 기반 새 게시글/매칭 결과 알림 기능 연결

### Phase 3. 확장 기능
- 본인 확인 질문/답변 검증 흐름 구현
- 프로필, 구독 알림, 매칭 목록, 상세 페이지 기능 확장
- 만료 게시글 정리 스케줄 함수 및 필터링 UX 보강

### Phase 4. 마무리 및 발표
- UI 개선, 라우트 단위 코드 스플리팅, 한국어 UI 정리
- 문서화, 인덱스 점검, 배포 검증, 발표 준비

## 보안

- Firestore 규칙: 생성 시 허용 필드를 화이트리스트로 제한하고, `createdAt`, `expiresAt`, `verificationAHash` 같은 필드는 수정 불가로 보호합니다.
- Storage 규칙: `users/{uid}/...` 경로 기준으로 UID를 격리하고, 이미지 파일만 허용하며 파일 크기는 5MB 이하로 제한합니다.
- 본인 확인: 클라이언트에서 답변을 SHA-256으로 해시해 저장하고, 서버에서는 `timingSafeEqual`로 비교하며 사용자당 3회까지만 시도할 수 있습니다.

## 환경 변수

### frontend/.env

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

### Functions Secret / 환경 설정

```bash
OPENAI_API_KEY
PINECONE_API_KEY
PINECONE_INDEX
PINECONE_ENVIRONMENT
```

## 로컬 개발

```bash
# 프론트엔드
cd frontend
npm install
npm run dev

# 함수
cd ../functions
npm install
npm run build
```

## 배포

```bash
firebase deploy --only firestore
firebase deploy --only functions
firebase deploy --only hosting
```
