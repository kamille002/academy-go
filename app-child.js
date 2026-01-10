// 학원가자 - 어린이 앱 JavaScript

// ========================================
// Supabase 초기화
// ========================================

const SUPABASE_URL = 'https://pvbfblbivboypjsnzmkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7Kt6XwlLQG2xxlO9ABhG3Q_cyN-1i6_';

// Supabase 클라이언트 (전역)
let supabaseClient;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Storage (부모 앱과 동일한 데이터 사용)
const Storage = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

// 전역 상태
let currentChildId = null;
let currentChild = null;
let familyId = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;

// ========================================
// 가족 연결 기능
// ========================================

// 가족 코드로 연결
async function connectFamily() {
    const code = document.getElementById('familyCodeInput').value.trim().toUpperCase();
    
    if (code.length !== 6) {
        alert('6자리 코드를 입력해주세요!');
        return;
    }
    
    try {
        // 코드로 가족 찾기
        const { data: family, error } = await supabaseClient
            .from('families')
            .select('*')
            .eq('code', code)
            .single();
        
        if (error || !family) {
            alert('❌ 코드를 찾을 수 없어요!\n부모님께 코드를 다시 확인해주세요.');
            return;
        }
        
        familyId = family.id;
        Storage.set('familyId', familyId);
        
        // 가족의 자녀 목록 가져오기
        const { data: children, error: childError } = await supabaseClient
            .from('children')
            .select('*')
            .eq('family_id', familyId);
        
        if (children && children.length > 0) {
            // 자녀 선택 모달 표시
            showChildSelectModal(children);
        } else {
            alert('❌ 등록된 자녀가 없어요!\n부모님께 먼저 자녀를 등록해달라고 하세요.');
        }
        
        // 코드 입력 모달 닫기
        document.getElementById('familyCodeModal').style.display = 'none';
        
    } catch (error) {
        console.error('가족 연결 실패:', error);
        alert('연결에 실패했어요. 다시 시도해주세요!');
    }
}

// 자녀 선택 모달 표시
function showChildSelectModal(children) {
    const container = document.getElementById('childSelectList');
    
    container.innerHTML = children.map(child => `
        <button onclick="selectChild('${child.id}')" style="width: 100%; padding: 20px; margin-bottom: 12px; background: linear-gradient(135deg, #87CEEB 0%, #FFB6C1 100%); border: none; border-radius: 16px; color: white; font-size: 18px; font-weight: bold; cursor: pointer;">
            👤 ${child.name}
        </button>
    `).join('');
    
    document.getElementById('childSelectModal').style.display = 'flex';
}

// 자녀 선택
function selectChild(childId) {
    currentChildId = childId;
    Storage.set('currentChildId', childId);
    Storage.set('familyId', familyId);
    
    document.getElementById('childSelectModal').style.display = 'none';
    
    // 데이터 로드 및 렌더
    loadChildData();
    render();
    
    alert('✅ 연결 완료! 환영합니다! 🎉');
}

// 초기화
async function init() {
    // 로딩 화면 숨기기
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 1000);
    
    // 가족 ID 체크
    familyId = Storage.get('familyId');
    currentChildId = Storage.get('currentChildId');
    
    if (!familyId) {
        // 가족 코드 입력 모달 표시
        document.getElementById('familyCodeModal').style.display = 'flex';
        return;
    }
    
    if (!currentChildId) {
        // 자녀 선택 필요
        alert('자녀를 선택해주세요!');
        document.getElementById('familyCodeModal').style.display = 'flex';
        return;
    }
    
    loadChildData();
    render();
}

// 자녀 데이터 로드
async function loadChildData() {
    try {
        // 자녀 정보 가져오기
        const { data: child, error: childError } = await supabaseClient
            .from('children')
            .select('*')
            .eq('id', currentChildId)
            .single();
        
        if (childError) throw childError;
        
        currentChild = child;
        
    } catch (error) {
        console.error('자녀 데이터 로드 실패:', error);
        alert('데이터를 불러올 수 없어요!');
    }
}

// 렌더링
function render() {
    if (!currentChild) return;
    
    // 이름 표시
    document.getElementById('childName').textContent = currentChild.name;
    
    // 포인트 표시
    document.getElementById('totalPoints').textContent = currentChild.totalPoints || 0;
    
    // 출석률 계산 및 표시
    const attendanceRate = calculateAttendanceRate();
    document.getElementById('attendanceRate').textContent = attendanceRate;
    
    // 학원 목록 렌더
    renderAcademies();
    
    // 보상 목록 렌더
    renderRewards();
    
    // 엄마 목소리 렌더
    renderParentVoices();
    
    // 보낸 메시지 렌더
    renderSentMessages();
}

// 출석률 계산
function calculateAttendanceRate() {
    const academies = Storage.get('academies') || [];
    const childAcademies = academies.filter(a => a.childId === currentChildId);
    
    if (childAcademies.length === 0) return 0;
    
    let totalExpected = 0;
    let totalAttended = 0;
    
    childAcademies.forEach(academy => {
        if (!academy.attendance) return;
        
        // 최근 30일 출석 데이터
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentAttendance = academy.attendance.filter(a => {
            const attendanceDate = new Date(a.date);
            return attendanceDate >= thirtyDaysAgo;
        });
        
        // 예상 출석 횟수 (주당 수업 * 4주)
        const weeklyClasses = academy.schedule.filter(s => s.enabled).length;
        const expected = weeklyClasses * 4;
        
        totalExpected += expected;
        totalAttended += recentAttendance.length;
    });
    
    if (totalExpected === 0) return 0;
    
    return Math.round((totalAttended / totalExpected) * 100);
}

// 학원 목록 렌더
function renderAcademies() {
    const academies = Storage.get('academies') || [];
    const childAcademies = academies.filter(a => a.childId === currentChildId);
    const container = document.getElementById('academyList');
    
    if (childAcademies.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">아직 등록된 학원이 없어요!</p>';
        return;
    }
    
    container.innerHTML = childAcademies.map(academy => {
        const dayLabels = academy.schedule
            .filter(s => s.enabled)
            .map(s => ['일', '월', '화', '수', '목', '금', '토'][s.day])
            .join(', ');
        
        return `
            <div class="academy-card-child">
                <div class="academy-name-child">🏫 ${academy.name}</div>
                <div class="academy-info-child">
                    <div>📅 ${dayLabels}</div>
                    <div>⏰ ${academy.departureTime} 출발</div>
                </div>
                <button class="check-btn" onclick="checkAttendance('${academy.id}')">
                    ✅ 출석 체크하기!
                </button>
            </div>
        `;
    }).join('');
}

// 보상 목록 렌더
function renderRewards() {
    const rewards = Storage.get('rewards') || [];
    const childRewards = rewards.filter(r => r.childId === currentChildId && !r.claimed);
    const container = document.getElementById('rewardsList');
    
    if (childRewards.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; grid-column: span 2;">아직 등록된 보상이 없어요!</p>';
        return;
    }
    
    container.innerHTML = childRewards.map(reward => {
        const canClaim = (currentChild.totalPoints || 0) >= reward.pointsRequired;
        
        return `
            <div class="reward-card-child ${canClaim ? 'can-claim' : ''}">
                <div class="reward-name">${reward.name}</div>
                <div class="reward-points">${reward.pointsRequired}P 필요</div>
                <button class="claim-btn-child" ${!canClaim ? 'disabled' : ''} onclick="claimReward('${reward.id}')">
                    ${canClaim ? '🎁 받기!' : '🔒 모으는 중'}
                </button>
            </div>
        `;
    }).join('');
}

// 엄마 목소리 렌더
function renderParentVoices() {
    const academies = Storage.get('academies') || [];
    const childAcademies = academies.filter(a => a.childId === currentChildId && a.voiceMessage);
    const container = document.getElementById('parentVoiceList');
    const section = document.getElementById('parentVoiceSection');
    
    if (childAcademies.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    container.innerHTML = childAcademies.map(academy => `
        <button class="parent-voice-btn" onclick="playParentVoice('${academy.id}')">
            <span class="parent-voice-icon">🎤</span>
            <span>${academy.name} - 엄마 목소리 듣기</span>
        </button>
    `).join('');
}

// 엄마 목소리 재생
function playParentVoice(academyId) {
    const academies = Storage.get('academies') || [];
    const academy = academies.find(a => a.id === academyId);
    
    if (!academy || !academy.voiceMessage) {
        alert('음성 메시지가 없어요!');
        return;
    }
    
    const audio = new Audio(academy.voiceMessage.data);
    audio.play();
}

// ========================================
// 음성 녹음 기능
// ========================================

// 녹음 시작
async function startChildRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            saveChildMessage(audioBlob);
            
            // 스트림 종료
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // UI 업데이트
        document.getElementById('micIcon').style.display = 'none';
        document.getElementById('recordingWave').style.display = 'flex';
        document.getElementById('recordBtnText').textContent = '녹음 중...';
        document.getElementById('recordingTimer').style.display = 'block';
        
        // 타이머 시작
        startRecordingTimer();
        
    } catch (error) {
        console.error('녹음 시작 실패:', error);
        alert('🎤 마이크를 사용할 수 없어요!\n설정에서 마이크 권한을 허용해주세요.');
    }
}

// 녹음 중지
function stopChildRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        
        // 타이머 중지
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        // UI 복구
        document.getElementById('micIcon').style.display = 'block';
        document.getElementById('recordingWave').style.display = 'none';
        document.getElementById('recordBtnText').textContent = '눌러서 녹음';
        document.getElementById('recordingTimer').style.display = 'none';
        document.getElementById('recordingTimer').textContent = '00:00';
    }
}

// 녹음 타이머
function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const display = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        document.getElementById('recordingTimer').textContent = display;
        
        // 30초 제한
        if (seconds >= 30) {
            stopChildRecording();
            alert('⏱️ 30초가 지났어요!\n메시지를 전송할게요!');
        }
    }, 100);
}

// 자녀 메시지 저장
function saveChildMessage(audioBlob) {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Audio = reader.result;
        
        // 메시지 객체 생성
        const message = {
            id: generateId(),
            childId: currentChildId,
            childName: currentChild.name,
            type: 'voice',
            content: base64Audio,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        // 메시지 저장
        let messages = Storage.get('childMessages') || [];
        messages.push(message);
        Storage.set('childMessages', messages);
        
        // 성공 알림
        showSuccessModal('🎤 음성 메시지 전송!', '부모님이 곧 들으실 거예요! 💕');
        
        // 렌더 업데이트
        renderSentMessages();
    };
    reader.readAsDataURL(audioBlob);
}

// 빠른 메시지 전송
function sendQuickMessage(emoji, text) {
    const message = {
        id: generateId(),
        childId: currentChildId,
        childName: currentChild.name,
        type: 'quick',
        emoji: emoji,
        content: text,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // 메시지 저장
    let messages = Storage.get('childMessages') || [];
    messages.push(message);
    Storage.set('childMessages', messages);
    
    // 성공 알림
    showSuccessModal(emoji + ' 메시지 전송!', `"${text}" 보냈어요!`);
    
    // 렌더 업데이트
    renderSentMessages();
}

// 보낸 메시지 렌더
function renderSentMessages() {
    const messages = Storage.get('childMessages') || [];
    const childMessages = messages
        .filter(m => m.childId === currentChildId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5); // 최근 5개만
    
    const section = document.getElementById('sentMessages');
    const container = document.getElementById('messageList');
    
    if (childMessages.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    container.innerHTML = childMessages.map(msg => {
        const timeAgo = getTimeAgo(msg.timestamp);
        const statusIcon = msg.read ? '✅' : '⏳';
        
        return `
            <div class="message-item">
                <div class="message-emoji">${msg.type === 'voice' ? '🎤' : msg.emoji}</div>
                <div class="message-content">
                    <div class="message-text">${msg.type === 'voice' ? '음성 메시지' : msg.content}</div>
                    <div class="message-time">${timeAgo}</div>
                </div>
                <div class="message-status">${statusIcon}</div>
            </div>
        `;
    }).join('');
}

// 시간 표시
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now - past;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
}

// 출석 체크
async function checkAttendance(academyId) {
    try {
        const academies = Storage.get('academies') || [];
        const academy = academies.find(a => a.id === academyId);
        
        if (!academy || !academy.locationGate) {
            alert('🗺️ 학원 위치가 아직 설정되지 않았어요!\n부모님께 말씀드려주세요!');
            return;
        }
        
        const currentPosition = await getCurrentPosition();
        const distance = calculateDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            academy.locationGate.lat,
            academy.locationGate.lon
        );
        
        // 50미터 이내면 출석 인정
        if (distance <= 50) {
            const now = new Date();
            const arrivalTime = now.toTimeString().split(' ')[0].substring(0, 5);
            
            // 포인트 계산
            const scheduledTime = academy.schedule.find(s => s.day === now.getDay());
            let points = 0;
            
            if (scheduledTime) {
                const scheduledMinutes = convertTimeToMinutes(scheduledTime.time);
                const arrivalMinutes = convertTimeToMinutes(arrivalTime);
                const diff = scheduledMinutes - arrivalMinutes;
                
                if (diff >= 10) points = 10;
                else if (diff >= 5) points = 3;
                else if (diff >= 0) points = 2;
            }
            
            // 출석 기록 저장
            if (!academy.attendance) academy.attendance = [];
            academy.attendance.push({
                date: now.toISOString().split('T')[0],
                time: arrivalTime,
                distance: Math.round(distance),
                points: points
            });
            
            // 포인트 적립
            const children = Storage.get('children') || [];
            const child = children.find(c => c.id === currentChildId);
            if (child) {
                child.totalPoints = (child.totalPoints || 0) + points;
                currentChild = child;
            }
            
            Storage.set('academies', academies);
            Storage.set('children', children);
            
            // 성공 알림
            showSuccessModal('🎉 출석 완료!', `+${points}P 받았어요!\n대단해요! 👏`);
            
            render();
            
        } else {
            alert(`📍 학원에서 너무 멀어요!\n\n현재 거리: ${Math.round(distance)}m\n(50m 안에서 출석 가능해요)`);
        }
        
    } catch (error) {
        console.error('출석 체크 실패:', error);
        alert('❌ 위치를 확인할 수 없어요!\nGPS를 켜주세요!');
    }
}

// 보상 받기
function claimReward(rewardId) {
    const rewards = Storage.get('rewards') || [];
    const reward = rewards.find(r => r.id === rewardId);
    
    if (!reward) return;
    
    if ((currentChild.totalPoints || 0) < reward.pointsRequired) {
        const needed = reward.pointsRequired - (currentChild.totalPoints || 0);
        alert(`💪 조금만 더!\n${needed}P가 더 필요해요!`);
        return;
    }
    
    if (confirm(`🎁 "${reward.name}" 받을까요?\n${reward.pointsRequired}P를 사용해요!`)) {
        // 포인트 차감
        const children = Storage.get('children') || [];
        const child = children.find(c => c.id === currentChildId);
        if (child) {
            child.totalPoints -= reward.pointsRequired;
            currentChild = child;
        }
        
        // 보상 claimed 처리
        reward.claimed = true;
        reward.claimedAt = new Date().toISOString();
        
        Storage.set('children', children);
        Storage.set('rewards', rewards);
        
        showSuccessModal('🎊 보상 받기 성공!', `"${reward.name}" 축하해요!`);
        
        render();
    }
}

// 탭 전환
function showChildTab(tabName) {
    // 버튼 활성화
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.nav-btn').classList.add('active');
    
    // 섹션 스크롤 (간단 구현)
    const sections = {
        'home': '.message-section',
        'academy': '.attendance-section',
        'rewards': '.rewards-section',
        'profile': '.parent-voice-section'
    };
    
    const targetSection = document.querySelector(sections[tabName]);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// 성공 모달 표시
function showSuccessModal(title, message) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('successModal').style.display = 'none';
    }, 2000);
}

// 유틸리티 함수
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS를 지원하지 않아요!'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function convertTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// 앱 시작
document.addEventListener('DOMContentLoaded', init);
