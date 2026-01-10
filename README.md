# 🏫 학원가자 PWA

자녀의 학원 생활을 똑똑하게 관리하는 Progressive Web App

---

## ✨ 주요 기능

### 핵심 기능
- 📍 **GPS 도착 확인** - 학원 정문 & 버스 탑승 장소 (2개 지점 선택 가능)
- 🎤 **엄마 목소리 녹음** - 따뜻한 알림
- 🌤️ **날씨 알림** - 비/눈, 미세먼지 안내
- ⏰ **출발 시간 알림** - 5분 스누즈 기능
- 🎯 **포인트 시스템** - 긍정 보상!
  - 10분 일찍: +10P
  - 5분 일찍: +3P
  - 정시: +2P
- 🎊 **출석률 달성** - 85%/90%/100% 폭죽 애니메이션
- 💰 **학원비 가계부** ⭐ NEW!
  - 학원별 월 비용 관리
  - 총 지출 확인
  - 월별 통계
- ⚠️ **결제일 알림** ⭐ NEW!
  - 결제일 5일 전 자동 알림
  - 한 달 기준 계산
- 📊 **성과 지표** - 시각적 대시보드
- 👨‍👩‍👧 **다자녀 관리** - 여러 자녀 동시 관리
- 🎁 **보상 시스템** - 맞춤 보상 설정

### 구독 정보
- 🆓 **14일 무료 체험** (첫 학원 등록부터)
- 💰 **구독료**
  - 1자녀: 1,000원/월
  - 다자녀: 2,000원/월
- 💳 **결제 수단**: 토스페이, 카카오페이

---

## 🎨 디자인

- **메인 테마**: 연한 노랑색 (#FFFACD) - 따뜻하고 긍정적
- **버튼**: 파스텔 보라색 (#B4A7D6)
- **보상**: 금색/주황색 + 폭죽 애니메이션
- **반응형**: 모바일 최적화

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: LocalStorage
- **PWA**: Service Worker, Web App Manifest
- **Database**: Supabase (준비 완료, 연동 예정)

---

## 📦 배포 방법

### 1. GitHub에 업로드

```bash
git init
git add .
git commit -m "Initial commit: 학원가자 PWA"
git remote add origin https://github.com/kamille002/academy-go-pwa.git
git branch -M main
git push -u origin main
```

### 2. Netlify 배포

1. Netlify 로그인: https://app.netlify.com
2. "New site from Git" 클릭
3. GitHub 연결
4. 저장소 선택: `academy-go-pwa`
5. 배포 설정:
   - Build command: (비워둠)
   - Publish directory: `/`
6. "Deploy site" 클릭

**완료!** 🎉

3-5분 후 URL 생성:
```
https://academy-go-pwa.netlify.app
```

---

## 📱 모바일 설치

### Android
1. Chrome에서 URL 접속
2. 메뉴 → "홈 화면에 추가"
3. 완료! 앱처럼 사용

### iOS
1. Safari에서 URL 접속
2. 공유 버튼 → "홈 화면에 추가"
3. 완료!

---

## 🗂️ 파일 구조

```
academy-go-pwa/
├── index.html           # 메인 HTML
├── styles.css           # 디자인 시스템
├── app.js              # 기능 구현
├── manifest.json        # PWA 설정
├── service-worker.js    # 오프라인 지원
├── icon-192.png        # 앱 아이콘 (소)
├── icon-512.png        # 앱 아이콘 (대)
└── README.md           # 이 파일
```

---

## 📊 데이터 저장

- **LocalStorage** 사용
- 브라우저에 안전하게 저장
- 앱 삭제 전까지 유지
- 백업 기능 예정

---

## 🚀 향후 계획

### Phase 2 (다음 업데이트)
- [ ] Supabase 연동 (실시간 동기화)
- [ ] GPS 실제 위치 확인
- [ ] 음성 녹음 기능
- [ ] 날씨 API 연동
- [ ] 폭죽 애니메이션 고도화

### Phase 3
- [ ] 푸시 알림 (실제 알람)
- [ ] 구독 결제 연동
- [ ] 통계 및 분석
- [ ] 부모-자녀 앱 분리

---

## ✅ 완성된 기능 (v1.0)

- ✅ 다자녀 관리
- ✅ 학원 목록 (추가/수정/삭제 준비)
- ✅ 학원비 가계부
- ✅ 결제일 알림 (5일 전)
- ✅ 보상 시스템
- ✅ 포인트 관리
- ✅ 무료 체험 카운트
- ✅ 설정 화면
- ✅ PWA 설치 가능
- ✅ 오프라인 작동

---

## 💡 사용 팁

1. **첫 사용**: 자녀 추가부터 시작하세요
2. **학원 추가**: 학원비와 결제일을 입력하면 자동 알림
3. **보상 설정**: 적절한 포인트로 동기부여
4. **홈 화면 추가**: 앱처럼 빠르게 접근

---

## 📞 문의

- 제작: Kamille & Claude
- 이메일: [이메일 주소]

---

## 📝 버전 히스토리

### v1.0.0 (2026-01-10)
- 🎉 첫 배포!
- ✨ PWA 완성
- 💰 학원비 가계부 추가
- ⚠️ 결제일 알림 추가
- 🎨 연한 노랑 디자인 적용

---

**Made with ❤️ for 모든 부모님들**
