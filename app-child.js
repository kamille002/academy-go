// 학원가자 - 어린이 앱 JavaScript

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
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;

// 초기화
function init() {
    loadChildData();
    render();
    
    // 로딩 화면 숨기기
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 1000);
}

// 자녀 데이터 로드
function loadChildData() {
    // 현재 자녀 ID 가져오기 (부모 앱에서 설정한 것)
    currentChildId = Storage.get('currentChildId');
    
    if (!currentChildId) {
        alert('먼저 부모 앱에서 자녀를 등록해주세요!');
        return;
    }
    
    // 자녀 정보
    const children = Storage.get('children') || [];
    currentChild = children.find(c => c.id === currentChildId);
    
    if (!currentChild) {
        alert('자녀 정보를 찾을 수 없어요!');
        return;
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
    
    // 오늘의 학원 렌더 (최우선!)
    renderTodayAcademies();
    
    // 보상 목록 렌더
    renderRewards();
    
    // 엄마 목소리 렌더
    renderParentVoices();
    
    // 보낸 메시지 렌더
    renderSentMessages();
    
    // GPS 업데이트 시작
    startGPSTracking();
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

// ========================================
// 오늘의 학원 렌더링
// ========================================

function renderTodayAcademies() {
    const academies = Storage.get('academies') || [];
    const childAcademies = academies.filter(a => a.childId === currentChildId);
    const container = document.getElementById('todayAcademiesList');
    
    // 오늘 요일 (0=일요일)
    const today = new Date().getDay();
    
    // 오늘 가야 할 학원 필터링
    const todayAcademies = childAcademies.filter(academy => {
        return academy.schedule && academy.schedule.some(s => s.enabled && s.day === today);
    });
    
    if (todayAcademies.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                <p style="font-size: 18px; font-weight: 600;">오늘은 학원 없는 날!</p>
                <p style="font-size: 14px; margin-top: 8px;">푹 쉬세요! 😊</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = todayAcademies.map(academy => {
        const todaySchedule = academy.schedule.find(s => s.enabled && s.day === today);
        const timeUntil = getTimeUntil(academy.departureTime);
        const alreadyArrived = checkIfArrived(academy);
        
        return `
            <div class="today-academy-card" data-academy-id="${academy.id}">
                <div class="academy-header">
                    <div class="academy-name-today">🏫 ${academy.name}</div>
                    ${timeUntil ? `<div class="time-until">${timeUntil}</div>` : ''}
                </div>
                
                <div class="academy-schedule">
                    <div class="schedule-row">
                        <span class="schedule-icon">🚀</span>
                        <span><span class="schedule-time">${academy.departureTime}</span> 출발</span>
                    </div>
                    <div class="schedule-row">
                        <span class="schedule-icon">📚</span>
                        <span><span class="schedule-time">${todaySchedule.time}</span> 수업 시작</span>
                    </div>
                </div>
                
                <button 
                    class="arrival-btn ${alreadyArrived ? 'completed' : 'inactive'}" 
                    id="arrivalBtn_${academy.id}"
                    onclick="confirmArrival('${academy.id}')"
                    ${alreadyArrived ? 'disabled' : ''}
                >
                    <span class="arrival-icon">${alreadyArrived ? '✅' : '📍'}</span>
                    <span>${alreadyArrived ? '도착 완료!' : '도착했어요!'}</span>
                </button>
                
                <div class="gps-status" id="gpsStatus_${academy.id}">
                    ${alreadyArrived ? '오늘 출석 완료 🎉' : 'GPS 확인 중...'}
                </div>
                <div class="distance-info" id="distance_${academy.id}"></div>
            </div>
        `;
    }).join('');
}

// 남은 시간 계산
function getTimeUntil(departureTime) {
    const now = new Date();
    const [hours, minutes] = departureTime.split(':').map(Number);
    
    const departure = new Date();
    departure.setHours(hours, minutes, 0);
    
    const diff = departure - now;
    
    if (diff < 0) {
        return null; // 이미 지남
    }
    
    const minutesLeft = Math.floor(diff / 60000);
    
    if (minutesLeft < 15) {
        return `${minutesLeft}분 후 출발!`;
    } else if (minutesLeft < 60) {
        return `${minutesLeft}분 남음`;
    } else {
        const hoursLeft = Math.floor(minutesLeft / 60);
        return `${hoursLeft}시간 남음`;
    }
}

// 오늘 이미 도착했는지 확인
function checkIfArrived(academy) {
    if (!academy.attendance) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return academy.attendance.some(a => a.date === today);
}

// ========================================
// GPS 추적 및 도착 확인
// ========================================

let gpsWatchId = null;
let currentPosition = null;

function startGPSTracking() {
    if (!navigator.geolocation) {
        console.log('GPS를 지원하지 않는 기기입니다');
        return;
    }
    
    // GPS 추적 시작
    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            currentPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            updateArrivalButtons();
        },
        (error) => {
            console.error('GPS 에러:', error);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
        }
    );
}

// 도착 버튼 상태 업데이트
function updateArrivalButtons() {
    if (!currentPosition) return;
    
    const academies = Storage.get('academies') || [];
    const childAcademies = academies.filter(a => a.childId === currentChildId);
    
    childAcademies.forEach(academy => {
        if (!academy.locationGate) return;
        
        const alreadyArrived = checkIfArrived(academy);
        if (alreadyArrived) return;
        
        const distance = calculateDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            academy.locationGate.lat,
            academy.locationGate.lon
        );
        
        const btn = document.getElementById(`arrivalBtn_${academy.id}`);
        const statusEl = document.getElementById(`gpsStatus_${academy.id}`);
        const distanceEl = document.getElementById(`distance_${academy.id}`);
        
        if (!btn) return;
        
        // 거리 표시
        if (distanceEl) {
            distanceEl.textContent = `현재 거리: ${Math.round(distance)}m`;
        }
        
        if (distance <= 50) {
            // 50m 이내 - 활성화!
            btn.className = 'arrival-btn active';
            btn.disabled = false;
            if (statusEl) {
                statusEl.textContent = '✅ 버튼을 눌러주세요!';
                statusEl.style.color = '#4CAF50';
                statusEl.style.fontWeight = 'bold';
            }
        } else {
            // 50m 밖 - 비활성
            btn.className = 'arrival-btn inactive';
            btn.disabled = true;
            if (statusEl) {
                statusEl.textContent = '학원에 가까워지면 버튼이 활성화돼요';
                statusEl.style.color = '#999';
            }
        }
    });
}

// 도착 확인
async function confirmArrival(academyId) {
    const academies = Storage.get('academies') || [];
    const academy = academies.find(a => a.id === academyId);
    
    if (!academy) return;
    
    if (!currentPosition) {
        alert('📍 GPS 위치를 확인 중이에요!\n잠시만 기다려주세요.');
        return;
    }
    
    if (!academy.locationGate) {
        alert('🗺️ 학원 위치가 설정되지 않았어요!\n부모님께 말씀드려주세요!');
        return;
    }
    
    const distance = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        academy.locationGate.lat,
        academy.locationGate.lon
    );
    
    if (distance > 50) {
        alert(`📍 조금 더 가까이 가주세요!\n\n현재 거리: ${Math.round(distance)}m\n(50m 이내에서 가능)`);
        return;
    }
    
    // 출석 기록
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
    showSuccessModal('🎉 도착 완료!', `+${points}P 받았어요!\n잘했어요! 👏`);
    
    // 부모에게 도착 메시지 자동 전송
    sendArrivalMessage(academy.name, arrivalTime);
    
    render();
}

// 도착 메시지 자동 전송
function sendArrivalMessage(academyName, arrivalTime) {
    const message = {
        id: generateId(),
        childId: currentChildId,
        childName: currentChild.name,
        type: 'arrival',
        emoji: '🏫',
        content: `${academyName}에 ${arrivalTime}에 도착했어요!`,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    let messages = Storage.get('childMessages') || [];
    messages.push(message);
    Storage.set('childMessages', messages);
}

// ========================================
// 섹션 접기/펼치기
// ========================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        header.classList.add('open');
    } else {
        section.style.display = 'none';
        header.classList.remove('open');
    }
}

// ========================================
// 보상 목록 렌더
// ========================================
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
