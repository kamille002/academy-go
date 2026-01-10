// 학원가자 PWA - 메인 JavaScript

// 데이터 저장소 (LocalStorage)
const Storage = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

// 전역 상태
let state = {
    currentChildId: null,
    children: [],
    academies: [],
    rewards: [],
    subscription: {
        status: 'trial', // trial, active, expired
        trialStartDate: null,
        planType: null // single, multi
    }
};

// PWA 설치 프롬프트
let deferredPrompt = null;
let installBannerDismissed = false;

// PWA 설치 감지
window.addEventListener('beforeinstallprompt', (e) => {
    // 기본 설치 프롬프트 방지
    e.preventDefault();
    deferredPrompt = e;
    
    // 배너가 이전에 닫혔는지 확인
    const dismissed = localStorage.getItem('installBannerDismissed');
    const dismissedDate = localStorage.getItem('installBannerDismissedDate');
    
    // 7일 이내에 닫았으면 다시 표시 안 함
    if (dismissed && dismissedDate) {
        const daysSince = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
            return;
        }
    }
    
    // 설치 배너 표시
    showInstallBanner();
});

// 설치 배너 표시
function showInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner && !installBannerDismissed) {
        banner.style.display = 'block';
        
        // 설치 버튼 클릭 이벤트
        document.getElementById('installBtn').addEventListener('click', installPWA);
    }
}

// PWA 설치 실행
async function installPWA() {
    if (!deferredPrompt) {
        // iOS 사용자를 위한 안내
        if (isIOS()) {
            alert('📱 iOS 설치 방법:\n\n1. 하단 공유 버튼 탭\n2. "홈 화면에 추가" 선택\n3. 완료!\n\n이제 앱처럼 사용할 수 있어요! 🎉');
            closeInstallBanner();
            return;
        }
        return;
    }
    
    // 설치 프롬프트 표시
    deferredPrompt.prompt();
    
    // 사용자 선택 대기
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('PWA 설치 완료!');
    }
    
    // 프롬프트 초기화
    deferredPrompt = null;
    closeInstallBanner();
}

// 설치 배너 닫기
function closeInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.style.display = 'none';
        installBannerDismissed = true;
        
        // 7일간 표시 안 함
        localStorage.setItem('installBannerDismissed', 'true');
        localStorage.setItem('installBannerDismissedDate', Date.now().toString());
    }
}

// iOS 감지
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// 앱이 이미 설치되었는지 확인
window.addEventListener('appinstalled', () => {
    console.log('PWA가 설치되었습니다!');
    closeInstallBanner();
    deferredPrompt = null;
});

// 초기화
function init() {
    loadData();
    checkPaymentAlerts();
    render();
    
    // 로딩 화면 숨기기
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 1000);
    
    // 매일 결제일 체크
    setInterval(checkPaymentAlerts, 1000 * 60 * 60); // 1시간마다
}

// 데이터 로드
function loadData() {
    // 저장된 데이터 로드
    state.children = Storage.get('children') || [];
    state.academies = Storage.get('academies') || [];
    state.rewards = Storage.get('rewards') || [];
    state.subscription = Storage.get('subscription') || {
        status: 'trial',
        trialStartDate: new Date().toISOString(),
        planType: null
    };
    
    // 현재 자녀 설정
    state.currentChildId = Storage.get('currentChildId');
    if (!state.currentChildId && state.children.length > 0) {
        state.currentChildId = state.children[0].id;
        Storage.set('currentChildId', state.currentChildId);
    }
    
    // 데이터 마이그레이션 또는 초기 데이터
    if (state.children.length === 0) {
        // 데모 데이터 추가 (옵션)
        addDemoData();
    }
}

// 데모 데이터 추가
function addDemoData() {
    const demoChild = {
        id: generateId(),
        name: '민수',
        totalPoints: 45,
        createdAt: new Date().toISOString()
    };
    
    state.children.push(demoChild);
    state.currentChildId = demoChild.id;
    
    const demoAcademy = {
        id: generateId(),
        childId: demoChild.id,
        name: '태권도 학원',
        address: '서울시 강남구',
        fee: 150000,
        paymentDay: 25,
        locationGate: null,
        locationBus: null,
        schedule: [
            { day: 1, time: '16:00', enabled: true },
            { day: 3, time: '16:00', enabled: true },
            { day: 5, time: '16:00', enabled: true }
        ],
        departureTime: '15:30',
        weatherAlerts: {
            rain: true,
            fineDust: true
        }
    };
    
    state.academies.push(demoAcademy);
    
    const demoRewards = [
        {
            id: generateId(),
            childId: demoChild.id,
            name: '아이스크림 🍦',
            pointsRequired: 20,
            claimed: false
        },
        {
            id: generateId(),
            childId: demoChild.id,
            name: '게임 30분 🎮',
            pointsRequired: 30,
            claimed: false
        }
    ];
    
    state.rewards.push(...demoRewards);
    
    saveData();
}

// 데이터 저장
function saveData() {
    Storage.set('children', state.children);
    Storage.set('academies', state.academies);
    Storage.set('rewards', state.rewards);
    Storage.set('subscription', state.subscription);
    Storage.set('currentChildId', state.currentChildId);
}

// ID 생성
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 시간을 분으로 변환 (유효성 검사용)
function convertTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// 렌더링
function render() {
    renderChildSelector();
    renderTrialBanner();
    renderAcademies();
    renderBudget();
    renderRewards();
    renderSettings();
}

// 자녀 선택기 렌더
function renderChildSelector() {
    const selector = document.getElementById('childSelector');
    const currentChild = getCurrentChild();
    
    selector.innerHTML = state.children.map(child => `
        <option value="${child.id}" ${child.id === state.currentChildId ? 'selected' : ''}>
            ${child.name}
        </option>
    `).join('');
    
    // 포인트 표시
    if (currentChild) {
        document.getElementById('currentPoints').textContent = currentChild.totalPoints;
        document.getElementById('currentChildName').textContent = currentChild.name;
        document.getElementById('rewardPoints').textContent = currentChild.totalPoints;
    }
}

// 무료 체험 배너
function renderTrialBanner() {
    if (state.subscription.status === 'trial') {
        const banner = document.getElementById('trialBanner');
        const daysLeft = getTrialDaysLeft();
        
        banner.style.display = 'block';
        document.getElementById('trialDays').textContent = daysLeft;
    }
}

// 체험 기간 계산
function getTrialDaysLeft() {
    if (!state.subscription.trialStartDate) return 14;
    
    const startDate = new Date(state.subscription.trialStartDate);
    const now = new Date();
    const diffTime = 14 * 24 * 60 * 60 * 1000 - (now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

// 현재 자녀 가져오기
function getCurrentChild() {
    return state.children.find(c => c.id === state.currentChildId);
}

// 자녀 전환
function switchChild() {
    const selector = document.getElementById('childSelector');
    state.currentChildId = selector.value;
    saveData();
    render();
}

// 탭 전환
function showTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-btn').classList.add('active');
    
    // 탭 컨텐츠 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // 탭별 렌더링
    if (tabName === 'budget') {
        renderBudget();
    }
}

// 학원 목록 렌더
function renderAcademies() {
    const container = document.getElementById('academiesList');
    const childAcademies = state.academies.filter(a => a.childId === state.currentChildId);
    
    if (childAcademies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🏫</div>
                <h3>등록된 학원이 없어요</h3>
                <p>학원을 추가하고<br>똑똑한 출석 관리를 시작하세요!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = childAcademies.map(academy => {
        const dayLabels = academy.schedule
            .filter(s => s.enabled)
            .map(s => ['일', '월', '화', '수', '목', '금', '토'][s.day])
            .join(', ');
        
        return `
            <div class="academy-card">
                <div class="academy-header">
                    <h3 class="academy-name">${academy.name}</h3>
                    <button class="btn-icon" onclick="editAcademy('${academy.id}')">✏️</button>
                </div>
                <p class="academy-address">📍 ${academy.address}</p>
                <div class="academy-info">
                    <div class="info-row">
                        <span class="info-label">수업 요일:</span>
                        <span class="info-value">${dayLabels}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">출발 시간:</span>
                        <span class="info-value">${academy.departureTime}</span>
                    </div>
                    ${academy.fee ? `
                    <div class="info-row">
                        <span class="info-label">월 수업료:</span>
                        <span class="info-value">${academy.fee.toLocaleString()}원</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">결제일:</span>
                        <span class="info-value">매월 ${academy.paymentDay}일</span>
                    </div>
                    ` : ''}
                </div>
                ${academy.weatherAlerts.rain || academy.weatherAlerts.fineDust ? `
                    <div class="badge-row">
                        ${academy.weatherAlerts.rain ? '<span class="badge">☔ 비 알림</span>' : ''}
                        ${academy.weatherAlerts.fineDust ? '<span class="badge">😷 미세먼지</span>' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 가계부 렌더 (NEW!)
function renderBudget() {
    const childAcademies = state.academies.filter(a => a.childId === state.currentChildId);
    const academiesWithFee = childAcademies.filter(a => a.fee);
    
    // 총액 계산
    const totalBudget = academiesWithFee.reduce((sum, a) => sum + a.fee, 0);
    
    document.getElementById('totalBudget').textContent = totalBudget.toLocaleString() + '원';
    document.getElementById('academyCount').textContent = academiesWithFee.length + '개 학원';
    
    // 결제 일정
    const paymentList = document.getElementById('paymentList');
    
    if (academiesWithFee.length === 0) {
        paymentList.innerHTML = '<div class="empty-state-small">결제 예정인 학원비가 없어요</div>';
        return;
    }
    
    // 결제일 계산
    const today = new Date();
    const payments = academiesWithFee.map(academy => {
        const paymentDate = new Date(today.getFullYear(), today.getMonth(), academy.paymentDay);
        if (paymentDate < today) {
            paymentDate.setMonth(paymentDate.getMonth() + 1);
        }
        
        const daysLeft = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));
        
        return {
            academy,
            paymentDate,
            daysLeft
        };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
    
    paymentList.innerHTML = payments.map(p => `
        <div class="payment-item ${p.daysLeft <= 5 ? 'urgent' : ''}">
            <div class="payment-info">
                <h4>${p.academy.name}</h4>
                <p>${p.paymentDate.getMonth() + 1}월 ${p.paymentDate.getDate()}일 (D-${p.daysLeft})</p>
            </div>
            <div class="payment-amount">${p.academy.fee.toLocaleString()}원</div>
        </div>
    `).join('');
    
    // 월별 통계 (간단 버전)
    document.getElementById('thisMonth').textContent = totalBudget.toLocaleString() + '원';
    document.getElementById('lastMonth').textContent = totalBudget.toLocaleString() + '원';
}

// 결제일 알림 체크 (NEW!)
function checkPaymentAlerts() {
    const notifEnabled = document.getElementById('paymentNotif')?.checked !== false;
    if (!notifEnabled) return;
    
    const childAcademies = state.academies.filter(a => a.childId === state.currentChildId);
    const today = new Date();
    const alerts = [];
    
    childAcademies.forEach(academy => {
        if (!academy.fee || !academy.paymentDay) return;
        
        const paymentDate = new Date(today.getFullYear(), today.getMonth(), academy.paymentDay);
        if (paymentDate < today) {
            paymentDate.setMonth(paymentDate.getMonth() + 1);
        }
        
        const daysLeft = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft === 5) {
            alerts.push({
                academy,
                paymentDate,
                daysLeft
            });
        }
    });
    
    if (alerts.length > 0) {
        showPaymentAlert(alerts);
    }
}

// 결제일 알림 모달 표시
function showPaymentAlert(alerts) {
    const modal = document.getElementById('paymentAlertModal');
    const content = document.getElementById('paymentAlertContent');
    
    content.innerHTML = alerts.map(alert => `
        <div class="payment-alert-item">
            <h3>${alert.academy.name}</h3>
            <p>${alert.paymentDate.getMonth() + 1}월 ${alert.paymentDate.getDate()}일</p>
            <div class="payment-alert-amount">${alert.academy.fee.toLocaleString()}원</div>
            <p style="margin-top: 8px; font-weight: 600;">결제일이 5일 남았어요!</p>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

// 결제일 알림 닫기
function closePaymentAlert() {
    document.getElementById('paymentAlertModal').style.display = 'none';
}

// 보상 렌더
function renderRewards() {
    const childRewards = state.rewards.filter(r => r.childId === state.currentChildId);
    const currentChild = getCurrentChild();
    const availablePoints = currentChild ? currentChild.totalPoints : 0;
    
    // 받을 수 있는 보상
    const availableRewards = childRewards.filter(r => !r.claimed);
    const rewardsList = document.getElementById('rewardsList');
    
    if (availableRewards.length === 0) {
        rewardsList.innerHTML = '<div class="empty-state-small">등록된 보상이 없어요</div>';
    } else {
        rewardsList.innerHTML = availableRewards.map(reward => {
            const canClaim = availablePoints >= reward.pointsRequired;
            
            return `
                <div class="reward-card ${!canClaim ? 'disabled' : ''}">
                    <div class="reward-info">
                        <h4>${reward.name}</h4>
                        <div>
                            <span class="reward-points">${reward.pointsRequired}P</span>
                            ${canClaim ? '<span class="can-claim-badge">받을 수 있어요!</span>' : ''}
                        </div>
                    </div>
                    <button class="claim-btn" ${!canClaim ? 'disabled' : ''} onclick="claimReward('${reward.id}')">
                        ${canClaim ? '받기' : '잠금'}
                    </button>
                </div>
            `;
        }).join('');
    }
    
    // 받은 보상
    const claimedRewards = childRewards.filter(r => r.claimed);
    const claimedList = document.getElementById('claimedRewardsList');
    
    if (claimedRewards.length === 0) {
        claimedList.innerHTML = '<div class="empty-state-small">받은 보상이 없어요</div>';
    } else {
        claimedList.innerHTML = claimedRewards.map(reward => `
            <div class="reward-card" style="background: #F5F5F5;">
                <div class="reward-info">
                    <h4 style="color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')}">${reward.name}</h4>
                    <div class="reward-points" style="color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-light')}">${reward.pointsRequired}P</div>
                </div>
                <span style="font-size: 24px; color: ${getComputedStyle(document.documentElement).getPropertyValue('--success')}">✓</span>
            </div>
        `).join('');
    }
}

// 보상 받기
function claimReward(rewardId) {
    const reward = state.rewards.find(r => r.id === rewardId);
    const currentChild = getCurrentChild();
    
    if (!reward || !currentChild) return;
    
    if (currentChild.totalPoints < reward.pointsRequired) {
        const needed = reward.pointsRequired - currentChild.totalPoints;
        alert(`${needed}P가 더 필요해요!\n열심히 학원에 가서 포인트를 모아보세요! 💪`);
        return;
    }
    
    if (confirm(`"${reward.name}" 보상을 받으시겠어요?\n${reward.pointsRequired}P가 차감됩니다.`)) {
        reward.claimed = true;
        reward.claimedAt = new Date().toISOString();
        currentChild.totalPoints -= reward.pointsRequired;
        
        saveData();
        render();
        
        // 폭죽 효과 (간단 버전)
        alert('축하해요! 🎉\n보상을 받았어요!');
    }
}

// 설정 렌더
function renderSettings() {
    const daysLeft = getTrialDaysLeft();
    document.getElementById('settingsTrialDays').textContent = daysLeft;
}

// 로그아웃
function logout() {
    if (confirm('로그아웃 하시겠어요?')) {
        // 실제로는 인증 로직 필요
        alert('로그아웃 되었습니다.');
    }
}

// 모달 함수들 (간단 버전)
function showAddChildModal() {
    const name = prompt('자녀 이름을 입력하세요:');
    if (!name) return;
    
    const child = {
        id: generateId(),
        name: name.trim(),
        totalPoints: 0,
        createdAt: new Date().toISOString()
    };
    
    state.children.push(child);
    state.currentChildId = child.id;
    saveData();
    render();
}

// 학원 추가 모달 열기
function showAddAcademyModal() {
    if (!state.currentChildId) {
        alert('먼저 자녀를 추가해주세요!');
        return;
    }
    
    // 폼 리셋
    document.getElementById('academyForm').reset();
    document.getElementById('editingAcademyId').value = '';
    document.getElementById('academyModalTitle').textContent = '🏫 학원 추가';
    document.getElementById('deleteAcademyBtn').style.display = 'none';
    
    // 기본값 설정
    document.getElementById('classTime').value = '16:00';
    document.getElementById('departureTime').value = '15:30';
    
    // 모달 표시
    document.getElementById('academyModal').style.display = 'flex';
}

// 학원 수정 모달 열기
function editAcademy(id) {
    const academy = state.academies.find(a => a.id === id);
    if (!academy) return;
    
    // 모달 제목 변경
    document.getElementById('academyModalTitle').textContent = '✏️ 학원 수정';
    document.getElementById('deleteAcademyBtn').style.display = 'block';
    document.getElementById('editingAcademyId').value = id;
    
    // 기본 정보
    document.getElementById('academyName').value = academy.name;
    document.getElementById('academyAddress').value = academy.address || '';
    
    // 수업 일정
    // 요일 체크박스 초기화
    for (let i = 0; i < 7; i++) {
        document.getElementById(`day${i}`).checked = false;
    }
    // 저장된 요일 체크
    academy.schedule.forEach(s => {
        if (s.enabled) {
            document.getElementById(`day${s.day}`).checked = true;
        }
    });
    
    // 시간
    const firstSchedule = academy.schedule.find(s => s.enabled);
    if (firstSchedule) {
        document.getElementById('classTime').value = firstSchedule.time;
    }
    document.getElementById('departureTime').value = academy.departureTime;
    
    // 학원비
    document.getElementById('academyFee').value = academy.fee || '';
    document.getElementById('paymentDay').value = academy.paymentDay || '';
    
    // 알림 설정
    document.getElementById('rainAlert').checked = academy.weatherAlerts?.rain || false;
    document.getElementById('dustAlert').checked = academy.weatherAlerts?.fineDust || false;
    
    // 모달 표시
    document.getElementById('academyModal').style.display = 'flex';
}

// 학원 모달 닫기
function closeAcademyModal() {
    document.getElementById('academyModal').style.display = 'none';
}

// 학원 저장 (추가 또는 수정)
function saveAcademy(event) {
    event.preventDefault();
    
    const editingId = document.getElementById('editingAcademyId').value;
    const name = document.getElementById('academyName').value.trim();
    const address = document.getElementById('academyAddress').value.trim();
    const classTime = document.getElementById('classTime').value;
    const departureTime = document.getElementById('departureTime').value;
    const fee = parseInt(document.getElementById('academyFee').value) || null;
    const paymentDay = parseInt(document.getElementById('paymentDay').value) || null;
    const rainAlert = document.getElementById('rainAlert').checked;
    const dustAlert = document.getElementById('dustAlert').checked;
    
    // 선택된 요일 수집
    const selectedDays = [];
    for (let i = 0; i < 7; i++) {
        const dayCheckbox = document.getElementById(`day${i}`);
        if (dayCheckbox.checked) {
            selectedDays.push(i);
        }
    }
    
    if (selectedDays.length === 0) {
        alert('수업 요일을 최소 1개 이상 선택해주세요!');
        return;
    }
    
    // 출발 시간 유효성 검사
    const classTimeMinutes = convertTimeToMinutes(classTime);
    const departureTimeMinutes = convertTimeToMinutes(departureTime);
    
    if (departureTimeMinutes >= classTimeMinutes) {
        alert('⚠️ 출발 시간이 수업 시작 시간보다 늦거나 같습니다!\n\n출발 시간은 수업 시작 시간보다 앞서야 합니다.\n\n예시:\n- 수업 시간: 16:30\n- 출발 시간: 16:00 ✅\n- 출발 시간: 16:30 ❌\n- 출발 시간: 16:40 ❌');
        return;
    }
    
    // 스케줄 생성
    const schedule = selectedDays.map(day => ({
        day: day,
        time: classTime,
        enabled: true
    }));
    
    if (editingId) {
        // 수정
        const academy = state.academies.find(a => a.id === editingId);
        if (academy) {
            academy.name = name;
            academy.address = address;
            academy.schedule = schedule;
            academy.departureTime = departureTime;
            academy.fee = fee;
            academy.paymentDay = paymentDay;
            academy.weatherAlerts = {
                rain: rainAlert,
                fineDust: dustAlert
            };
            academy.updatedAt = new Date().toISOString();
        }
    } else {
        // 추가
        const newAcademy = {
            id: generateId(),
            childId: state.currentChildId,
            name: name,
            address: address,
            schedule: schedule,
            departureTime: departureTime,
            fee: fee,
            paymentDay: paymentDay,
            locationGate: null,
            locationBus: null,
            weatherAlerts: {
                rain: rainAlert,
                fineDust: dustAlert
            },
            createdAt: new Date().toISOString()
        };
        
        state.academies.push(newAcademy);
        
        // 첫 학원 등록 시 무료 체험 시작
        if (state.academies.length === 1 && state.subscription.status === 'trial' && !state.subscription.trialStartDate) {
            state.subscription.trialStartDate = new Date().toISOString();
        }
    }
    
    saveData();
    render();
    closeAcademyModal();
    
    // 성공 메시지
    const message = editingId ? '학원이 수정되었습니다! ✏️' : '학원이 추가되었습니다! 🎉';
    alert(message);
}

// 학원 삭제
function deleteCurrentAcademy() {
    const editingId = document.getElementById('editingAcademyId').value;
    if (!editingId) return;
    
    const academy = state.academies.find(a => a.id === editingId);
    if (!academy) return;
    
    if (confirm(`"${academy.name}" 학원을 삭제하시겠어요?\n이 작업은 되돌릴 수 없습니다.`)) {
        state.academies = state.academies.filter(a => a.id !== editingId);
        saveData();
        render();
        closeAcademyModal();
        alert('학원이 삭제되었습니다.');
    }
}

function showAddRewardModal() {
    const name = prompt('보상 이름을 입력하세요: (예: 아이스크림 🍦)');
    if (!name) return;
    
    const points = parseInt(prompt('필요한 포인트를 입력하세요:'));
    if (!points || points < 1) return;
    
    const reward = {
        id: generateId(),
        childId: state.currentChildId,
        name: name.trim(),
        pointsRequired: points,
        claimed: false
    };
    
    state.rewards.push(reward);
    saveData();
    render();
}

function showChildrenManagement() {
    alert('자녀 관리 기능은 개발 중입니다.');
}

function showSubscriptionModal() {
    alert('구독 기능은 개발 중입니다.\n\n플랜:\n- 1자녀: 1,000원/월\n- 다자녀: 2,000원/월\n\n결제 수단: 토스페이, 카카오페이');
}

// 앱 시작
document.addEventListener('DOMContentLoaded', init);
