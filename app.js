// 학원가자 - 부모 앱 JavaScript

// Supabase 설정
const SUPABASE_URL = 'https://pvbfblbivboypjsnzmkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YmZibGJpdmJveXBqc256bWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzk0NzMsImV4cCI6MjA1MTkxNTQ3M30.qI4iEEcVy3TxOQWx-EGg8P-LH6CtLSLFvGvT9vGJGfQ';

// Supabase 클라이언트 초기화
let supabaseClient;
if (typeof window.supabase !== 'undefined') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 전역 변수
let currentFamilyId = null;
let currentChildId = null;
let currentTab = 'home';
let messageChannel = null;

// 앱 초기화
window.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  setTimeout(() => {
    initApp();
  }, 1000);
});

// Service Worker 등록
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('[부모앱] Service Worker 등록 완료');
    } catch (error) {
      console.error('[부모앱] Service Worker 등록 실패:', error);
    }
  }
}

// 앱 초기화
async function initApp() {
  currentFamilyId = localStorage.getItem('familyId');
  
  document.getElementById('loadingScreen').style.display = 'none';
  
  if (!currentFamilyId) {
    document.getElementById('setupCodeModal').style.display = 'flex';
    return;
  }
  
  document.getElementById('mainApp').style.display = 'block';
  
  await loadChildren();
  
  const savedChildId = localStorage.getItem('currentChildId');
  if (savedChildId) {
    currentChildId = savedChildId;
    document.getElementById('childSelect').value = savedChildId;
    await loadChildData();
  }
}

// 가족 코드 생성
async function createFamilyCode() {
  const code = document.getElementById('familyCodeSetup').value.trim().toUpperCase();
  
  if (code.length !== 6) {
    alert('6자리를 입력해주세요!');
    return;
  }
  
  if (!/^[A-Z0-9]+$/.test(code)) {
    alert('영문과 숫자만 사용 가능해요!');
    return;
  }
  
  try {
    console.log('🔄 가족 코드 생성 시도:', code);
    
    // Supabase 연결 확인
    if (!supabaseClient) {
      alert('❌ Supabase 연결 실패!\n\n페이지를 새로고침해주세요.');
      return;
    }
    
    const { data, error } = await supabaseClient
      .from('families')
      .insert([{ code: code }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase 에러:', error);
      
      // 자세한 에러 메시지
      if (error.code === '23505') {
        alert('이미 사용 중인 코드예요. 다른 코드를 사용해주세요!');
        return;
      } else if (error.code === '42P01') {
        alert('❌ 테이블이 없어요!\n\nSupabase에서 테이블을 먼저 생성해야 합니다.\n\n에러: ' + error.message);
        return;
      } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
        alert('❌ 권한 에러!\n\nSupabase에서 RLS 정책을 확인해주세요.\n\n에러: ' + error.message);
        return;
      } else if (error.message.includes('uuid')) {
        alert('❌ UUID 에러!\n\nSupabase에서 uuid-ossp 확장을 활성화해야 합니다.\n\n에러: ' + error.message);
        return;
      }
      
      // 기타 에러
      alert('❌ 에러 발생!\n\n' + error.message + '\n\n에러 코드: ' + (error.code || '없음'));
      return;
    }
    
    if (!data) {
      alert('❌ 데이터가 반환되지 않았어요!\n\nSupabase 설정을 확인해주세요.');
      return;
    }
    
    console.log('✅ 코드 생성 성공:', data);
    
    localStorage.setItem('familyId', data.id);
    localStorage.setItem('familyCode', data.code);
    currentFamilyId = data.id;
    
    showFireworks();
    
    alert(`✅ 코드 생성 완료!\n\n자녀 앱에서 "${data.code}"를 입력하세요!`);
    
    document.getElementById('setupCodeModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    await loadChildren();
    
  } catch (error) {
    console.error('❌ 예외 발생:', error);
    alert('❌ 예상치 못한 에러!\n\n' + error.message + '\n\nF12를 눌러 Console을 확인해주세요.');
  }
}

// 자녀 목록 로드
async function loadChildren() {
  if (!currentFamilyId) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('children')
      .select('*')
      .eq('family_id', currentFamilyId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const select = document.getElementById('childSelect');
    select.innerHTML = '<option value="">자녀를 선택하세요</option>';
    
    data.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('자녀 목록 로드 실패:', error);
  }
}

// 자녀 변경
async function onChildChange() {
  const select = document.getElementById('childSelect');
  currentChildId = select.value;
  
  if (!currentChildId) return;
  
  localStorage.setItem('currentChildId', currentChildId);
  
  await loadChildData();
}

// 자녀 데이터 로드
async function loadChildData() {
  if (!currentChildId) return;
  
  // Realtime 구독
  subscribeToMessages();
  
  // 각 탭 데이터 로드
  await renderHomeTab();
  await renderAcademiesTab();
  await renderAttendanceTab();
  await renderMessagesTab();
  
  // 메시지 배지 업데이트
  updateMessageBadge();
}

// 홈 탭 렌더링
async function renderHomeTab() {
  if (!currentChildId) return;
  
  try {
    const { data: child, error } = await supabaseClient
      .from('children')
      .select('*')
      .eq('id', currentChildId)
      .single();
    
    if (error) throw error;
    
    // 출석률 계산
    const { data: academies } = await supabaseClient
      .from('academies')
      .select('id')
      .eq('child_id', currentChildId);
    
    const academyIds = academies?.map(a => a.id) || [];
    
    let attendanceRate = 0;
    if (academyIds.length > 0) {
      const { count: totalDays } = await supabaseClient
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .in('academy_id', academyIds);
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // 예상 출석일수 계산 (간단히 30일로 가정)
      const expectedDays = 30;
      attendanceRate = expectedDays > 0 ? Math.round((totalDays / expectedDays) * 100) : 0;
    }
    
    const statsHtml = `
      <h3>${child.name}님의 통계</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${child.total_points || 0}</span>
          <span class="stat-label">총 포인트</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${attendanceRate}%</span>
          <span class="stat-label">출석률</span>
        </div>
      </div>
    `;
    
    document.getElementById('childStats').innerHTML = statsHtml;
    
    // 오늘 일정
    await renderTodaySchedule();
    
  } catch (error) {
    console.error('홈 탭 렌더링 실패:', error);
  }
}

// 오늘 일정 렌더링
async function renderTodaySchedule() {
  if (!currentChildId) return;
  
  try {
    const { data: academies, error } = await supabaseClient
      .from('academies')
      .select('*')
      .eq('child_id', currentChildId);
    
    if (error) throw error;
    
    const today = new Date().getDay();
    const todayAcademies = academies?.filter(academy => {
      const schedule = academy.schedule || [];
      return schedule.some(s => s.day === today && s.enabled);
    }) || [];
    
    let scheduleHtml = '<h3>📅 오늘 일정</h3>';
    
    if (todayAcademies.length === 0) {
      scheduleHtml += '<div class="empty-state"><div class="empty-state-icon">📅</div><p>오늘은 학원이 없어요!</p></div>';
    } else {
      todayAcademies.forEach(academy => {
        const todaySchedule = academy.schedule.find(s => s.day === today);
        scheduleHtml += `
          <div class="schedule-item">
            <strong>${academy.name}</strong><br>
            출발: ${academy.departure_time} → 수업: ${todaySchedule.time}
          </div>
        `;
      });
    }
    
    document.getElementById('todaySchedule').innerHTML = scheduleHtml;
    
  } catch (error) {
    console.error('오늘 일정 렌더링 실패:', error);
  }
}

// 학원 탭 렌더링
async function renderAcademiesTab() {
  if (!currentChildId) return;
  
  try {
    const { data: academies, error } = await supabaseClient
      .from('academies')
      .select('*')
      .eq('child_id', currentChildId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const container = document.getElementById('academyList');
    
    if (!academies || academies.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><p>등록된 학원이 없어요.<br>학원을 추가해주세요!</p></div>';
      return;
    }
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    container.innerHTML = academies.map(academy => {
      const schedule = academy.schedule || [];
      const scheduleDays = schedule
        .filter(s => s.enabled)
        .map(s => `<span class="schedule-day active">${dayNames[s.day]} ${s.time}</span>`)
        .join('');
      
      return `
        <div class="academy-card">
          <div class="academy-header">
            <div class="academy-name">${academy.name}</div>
            <div class="academy-actions">
              <button onclick="editAcademy('${academy.id}')">✏️</button>
              <button onclick="deleteAcademy('${academy.id}')">🗑️</button>
            </div>
          </div>
          <div class="academy-info">
            <div>📍 ${academy.address || '주소 미등록'}</div>
            <div>🚀 출발: ${academy.departure_time}</div>
            <div>💰 ${academy.fee ? academy.fee.toLocaleString() + '원' : '수강료 미등록'} / ${academy.payment_day || '-'}일 결제</div>
          </div>
          <div class="academy-schedule">
            ${scheduleDays || '<span class="schedule-day">일정 없음</span>'}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('학원 탭 렌더링 실패:', error);
  }
}

// 출석 탭 렌더링
async function renderAttendanceTab() {
  document.getElementById('attendanceCalendar').innerHTML = '<p>출석 달력 준비 중...</p>';
  document.getElementById('attendanceStats').innerHTML = '<p>통계 준비 중...</p>';
}

// 메시지 탭 렌더링
async function renderMessagesTab() {
  if (!currentChildId) return;
  
  try {
    const { data: messages, error } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('child_id', currentChildId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    const container = document.getElementById('messageList');
    
    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p>메시지가 없어요!</p></div>';
      return;
    }
    
    container.innerHTML = messages.map(msg => {
      const time = new Date(msg.created_at).toLocaleString('ko-KR');
      return `
        <div class="message-item ${msg.read ? '' : 'unread'}">
          <div class="message-header">
            <span class="message-emoji">${msg.emoji || '💬'}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-content">${msg.content}</div>
        </div>
      `;
    }).join('');
    
    // 읽음 처리
    await supabaseClient
      .from('messages')
      .update({ read: true })
      .eq('child_id', currentChildId)
      .eq('read', false);
    
    updateMessageBadge();
    
  } catch (error) {
    console.error('메시지 탭 렌더링 실패:', error);
  }
}

// 메시지 배지 업데이트
async function updateMessageBadge() {
  if (!currentChildId) return;
  
  try {
    const { count, error } = await supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', currentChildId)
      .eq('read', false);
    
    if (error) throw error;
    
    const badge = document.getElementById('messageBadge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
    
  } catch (error) {
    console.error('메시지 배지 업데이트 실패:', error);
  }
}

// Realtime 메시지 구독
function subscribeToMessages() {
  if (messageChannel) {
    supabaseClient.removeChannel(messageChannel);
  }
  
  messageChannel = supabaseClient
    .channel('child-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `child_id=eq.${currentChildId}`
      },
      (payload) => {
        console.log('새 메시지:', payload.new);
        
        if (payload.new.type === 'arrival') {
          showFireworks();
        }
        
        if (currentTab !== 'messages') {
          updateMessageBadge();
          showNewMessageNotification(payload.new);
        } else {
          renderMessagesTab();
        }
      }
    )
    .subscribe();
}

// 새 메시지 알림
function showNewMessageNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('학원가자', {
      body: message.content,
      icon: 'icon-parent-192.png'
    });
  }
}

// 탭 전환
function switchToTab(tab) {
  currentTab = tab;
  
  // 모든 탭 숨기기
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  
  // 모든 네비게이션 비활성화
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // 선택된 탭 표시
  document.getElementById(tab + 'Tab').classList.add('active');
  document.querySelectorAll('.nav-item')[
    ['home', 'academies', 'attendance', 'messages', 'settings'].indexOf(tab)
  ].classList.add('active');
}

// 자녀 추가 모달
function showAddChildModal() {
  document.getElementById('addChildModal').style.display = 'flex';
  document.getElementById('childName').value = '';
}

// 자녀 추가
async function addChild() {
  const name = document.getElementById('childName').value.trim();
  
  if (!name) {
    alert('이름을 입력해주세요!');
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('children')
      .insert([{
        family_id: currentFamilyId,
        name: name,
        total_points: 0
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    alert('✅ 자녀가 추가되었어요!');
    closeModal('addChildModal');
    await loadChildren();
    
  } catch (error) {
    console.error('자녀 추가 실패:', error);
    alert('자녀 추가에 실패했어요!');
  }
}

// 학원 추가 모달
function showAddAcademyModal() {
  if (!currentChildId) {
    alert('먼저 자녀를 선택해주세요!');
    return;
  }
  
  document.getElementById('academyModalTitle').textContent = '📚 학원 추가';
  document.getElementById('editAcademyId').value = '';
  document.getElementById('academyName').value = '';
  document.getElementById('academyAddress').value = '';
  document.getElementById('academyDepartureTime').value = '';
  document.getElementById('academyFee').value = '';
  document.getElementById('academyPaymentDay').value = '';
  document.getElementById('academyLat').value = '';
  document.getElementById('academyLon').value = '';
  
  // 요일별 일정 입력 생성
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const scheduleHtml = dayNames.map((day, index) => `
    <div class="schedule-input-row">
      <input type="checkbox" id="day${index}" class="schedule-checkbox">
      <label for="day${index}">${day}</label>
      <input type="time" id="time${index}" placeholder="시간">
    </div>
  `).join('');
  
  document.getElementById('scheduleInputs').innerHTML = scheduleHtml;
  document.getElementById('academyModal').style.display = 'flex';
}

// 학원 수정
async function editAcademy(academyId) {
  try {
    const { data: academy, error } = await supabaseClient
      .from('academies')
      .select('*')
      .eq('id', academyId)
      .single();
    
    if (error) throw error;
    
    document.getElementById('academyModalTitle').textContent = '✏️ 학원 수정';
    document.getElementById('editAcademyId').value = academyId;
    document.getElementById('academyName').value = academy.name;
    document.getElementById('academyAddress').value = academy.address || '';
    document.getElementById('academyDepartureTime').value = academy.departure_time;
    document.getElementById('academyFee').value = academy.fee || '';
    document.getElementById('academyPaymentDay').value = academy.payment_day || '';
    
    if (academy.location_gate) {
      document.getElementById('academyLat').value = academy.location_gate.lat;
      document.getElementById('academyLon').value = academy.location_gate.lon;
    }
    
    // 요일별 일정 입력 생성
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const scheduleHtml = dayNames.map((day, index) => {
      const daySchedule = academy.schedule?.find(s => s.day === index);
      return `
        <div class="schedule-input-row">
          <input type="checkbox" id="day${index}" class="schedule-checkbox" ${daySchedule?.enabled ? 'checked' : ''}>
          <label for="day${index}">${day}</label>
          <input type="time" id="time${index}" value="${daySchedule?.time || ''}">
        </div>
      `;
    }).join('');
    
    document.getElementById('scheduleInputs').innerHTML = scheduleHtml;
    document.getElementById('academyModal').style.display = 'flex';
    
  } catch (error) {
    console.error('학원 정보 로드 실패:', error);
    alert('학원 정보를 불러올 수 없어요!');
  }
}

// 학원 저장
async function saveAcademy() {
  const name = document.getElementById('academyName').value.trim();
  const address = document.getElementById('academyAddress').value.trim();
  const departureTime = document.getElementById('academyDepartureTime').value;
  const fee = document.getElementById('academyFee').value;
  const paymentDay = document.getElementById('academyPaymentDay').value;
  const lat = document.getElementById('academyLat').value;
  const lon = document.getElementById('academyLon').value;
  
  if (!name) {
    alert('학원 이름을 입력해주세요!');
    return;
  }
  
  if (!departureTime) {
    alert('출발 시간을 입력해주세요!');
    return;
  }
  
  // 일정 수집
  const schedule = [];
  for (let i = 0; i < 7; i++) {
    const enabled = document.getElementById(`day${i}`).checked;
    const time = document.getElementById(`time${i}`).value;
    schedule.push({
      day: i,
      enabled: enabled && time !== '',
      time: time || null
    });
  }
  
  const academyData = {
    child_id: currentChildId,
    name: name,
    address: address,
    departure_time: departureTime,
    fee: fee ? parseInt(fee) : null,
    payment_day: paymentDay ? parseInt(paymentDay) : null,
    schedule: schedule,
    location_gate: lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null
  };
  
  try {
    const academyId = document.getElementById('editAcademyId').value;
    
    if (academyId) {
      // 수정
      const { error } = await supabaseClient
        .from('academies')
        .update(academyData)
        .eq('id', academyId);
      
      if (error) throw error;
      alert('✅ 학원이 수정되었어요!');
    } else {
      // 추가
      const { error } = await supabaseClient
        .from('academies')
        .insert([academyData]);
      
      if (error) throw error;
      alert('✅ 학원이 추가되었어요!');
    }
    
    closeModal('academyModal');
    await renderAcademiesTab();
    await renderHomeTab();
    
  } catch (error) {
    console.error('학원 저장 실패:', error);
    alert('학원 저장에 실패했어요!');
  }
}

// 학원 삭제
async function deleteAcademy(academyId) {
  if (!confirm('정말 삭제하시겠어요?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('academies')
      .delete()
      .eq('id', academyId);
    
    if (error) throw error;
    
    alert('✅ 학원이 삭제되었어요!');
    await renderAcademiesTab();
    await renderHomeTab();
    
  } catch (error) {
    console.error('학원 삭제 실패:', error);
    alert('학원 삭제에 실패했어요!');
  }
}

// 현재 위치 가져오기
function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert('GPS를 지원하지 않는 기기예요!');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.getElementById('academyLat').value = position.coords.latitude;
      document.getElementById('academyLon').value = position.coords.longitude;
      alert('✅ 현재 위치가 입력되었어요!');
    },
    (error) => {
      console.error('위치 가져오기 실패:', error);
      alert('위치를 가져올 수 없어요!');
    }
  );
}

// 보상 관리
function showRewardsManagement() {
  if (!currentChildId) {
    alert('먼저 자녀를 선택해주세요!');
    return;
  }
  
  loadRewards();
  document.getElementById('rewardsModal').style.display = 'flex';
}

async function loadRewards() {
  try {
    const { data: rewards, error } = await supabaseClient
      .from('rewards')
      .select('*')
      .eq('child_id', currentChildId)
      .order('points_required', { ascending: true });
    
    if (error) throw error;
    
    const container = document.getElementById('rewardsList');
    
    if (!rewards || rewards.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>등록된 보상이 없어요!</p></div>';
      return;
    }
    
    container.innerHTML = rewards.map(reward => `
      <div class="reward-item">
        <div class="reward-info">
          <div class="reward-name">${reward.name}</div>
          <div class="reward-points">${reward.points_required}P 필요</div>
          ${reward.claimed ? '<div style="color: green;">✅ 받음</div>' : ''}
        </div>
        <button class="btn-delete" onclick="deleteReward('${reward.id}')">삭제</button>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('보상 로드 실패:', error);
  }
}

async function addReward() {
  const name = document.getElementById('rewardName').value.trim();
  const points = document.getElementById('rewardPoints').value;
  
  if (!name || !points) {
    alert('보상 이름과 포인트를 입력해주세요!');
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('rewards')
      .insert([{
        child_id: currentChildId,
        name: name,
        points_required: parseInt(points),
        claimed: false
      }]);
    
    if (error) throw error;
    
    document.getElementById('rewardName').value = '';
    document.getElementById('rewardPoints').value = '';
    
    await loadRewards();
    
  } catch (error) {
    console.error('보상 추가 실패:', error);
    alert('보상 추가에 실패했어요!');
  }
}

async function deleteReward(rewardId) {
  if (!confirm('정말 삭제하시겠어요?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('rewards')
      .delete()
      .eq('id', rewardId);
    
    if (error) throw error;
    
    await loadRewards();
    
  } catch (error) {
    console.error('보상 삭제 실패:', error);
    alert('보상 삭제에 실패했어요!');
  }
}

// 자녀 관리
function showChildManagement() {
  loadChildrenList();
  document.getElementById('childManagementModal').style.display = 'flex';
}

async function loadChildrenList() {
  try {
    const { data: children, error } = await supabaseClient
      .from('children')
      .select('*')
      .eq('family_id', currentFamilyId);
    
    if (error) throw error;
    
    const container = document.getElementById('childrenList');
    
    if (!children || children.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>등록된 자녀가 없어요!</p></div>';
      return;
    }
    
    container.innerHTML = children.map(child => `
      <div class="child-item">
        <div class="child-info">
          <div class="child-name">${child.name}</div>
          <div style="font-size: 14px; color: #666;">${child.total_points || 0}P</div>
        </div>
        <button class="btn-delete" onclick="deleteChild('${child.id}')">삭제</button>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('자녀 목록 로드 실패:', error);
  }
}

async function deleteChild(childId) {
  if (!confirm('정말 삭제하시겠어요? 모든 학원과 출석 기록이 함께 삭제됩니다!')) return;
  
  try {
    const { error } = await supabaseClient
      .from('children')
      .delete()
      .eq('id', childId);
    
    if (error) throw error;
    
    if (currentChildId === childId) {
      currentChildId = null;
      localStorage.removeItem('currentChildId');
    }
    
    await loadChildren();
    await loadChildrenList();
    
  } catch (error) {
    console.error('자녀 삭제 실패:', error);
    alert('자녀 삭제에 실패했어요!');
  }
}

// 가족 코드 보기
function showFamilyCode() {
  const code = localStorage.getItem('familyCode');
  alert(`🔑 가족 코드\n\n${code}\n\n자녀 앱에서 이 코드를 입력하세요!`);
}

// 앱 정보
function showAppInfo() {
  alert('학원가자 v1.0\n\n초등학생 자녀의 학원 출석을 돕는 앱입니다.\n\n© 2025 Ondolcare');
}

// 모달 닫기
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// 폭죽 애니메이션
function showFireworks() {
  const colors = ['#FFD700', '#FF69B4', '#87CEEB', '#98D8C8'];
  
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.left = Math.random() * 100 + '%';
      firework.style.top = Math.random() * 100 + '%';
      firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(firework);
      
      setTimeout(() => firework.remove(), 1000);
    }, i * 30);
  }
}

// 알림 권한 요청
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
