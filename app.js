const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://elsu-demo-1.onrender.com';

let fallbackCaptcha = { student: 9, admin: 10 };

function switchView(viewName) {
  const views = {
    'start': 'viewStart',
    'student-login': 'viewStudentLogin',
    'admin-login': 'viewAdminLogin',
    'student-cabinet': 'viewStudentCabinet',
    'admin-panel': 'viewAdminPanel'
  };

  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
  document.getElementById(views[viewName]).classList.add('active');

  document.querySelectorAll('.portal-nav button').forEach(b => b.classList.remove('active'));
  if (viewName === 'start') document.getElementById('navBtnStart').classList.add('active');
  if (viewName === 'student-login') { document.getElementById('navBtnStudentLogin').classList.add('active'); fetchCaptcha('STUDENT'); }
  if (viewName === 'admin-login') { document.getElementById('navBtnAdminLogin').classList.add('active'); fetchCaptcha('ADMIN'); }
  if (viewName === 'student-cabinet') document.getElementById('navBtnStudentCabinet').classList.add('active');
  if (viewName === 'admin-panel') document.getElementById('navBtnAdminPanel').classList.add('active');
}

async function fetchCaptcha(type) {
  const isStudent = (type === 'STUDENT');
  const qEl = document.getElementById(isStudent ? 'studentCaptchaQuestion' : 'adminCaptchaQuestion');
  const idEl = document.getElementById(isStudent ? 'studentCaptchaId' : 'adminCaptchaId');

  const n1 = Math.floor(Math.random() * 8) + 2;
  const n2 = Math.floor(Math.random() * 8) + 1;
  const sum = n1 + n2;
  
  if (isStudent) fallbackCaptcha.student = sum;
  else fallbackCaptcha.admin = sum;

  qEl.innerText = `${n1} + ${n2} = ?`;
  idEl.value = 'local_fallback_' + Date.now();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/captcha`);
    if (res.ok) {
      const data = await res.json();
      qEl.innerText = data.question;
      idEl.value = data.captchaId;
    }
  } catch (err) {}
}

async function handleLoginSubmit(e, role) {
  e.preventDefault();
  const isStudent = (role === 'STUDENT');
  const username = document.getElementById(isStudent ? 'studentUsernameInput' : 'adminUsernameInput').value;
  const password = document.getElementById(isStudent ? 'studentPasswordInput' : 'adminPasswordInput').value;
  const captchaId = document.getElementById(isStudent ? 'studentCaptchaId' : 'adminCaptchaId').value;
  const captchaAnswer = document.getElementById(isStudent ? 'studentCaptchaAnswer' : 'adminCaptchaAnswer').value;
  const errBox = document.getElementById(isStudent ? 'studentLoginError' : 'adminLoginError');

  errBox.style.display = 'none';

  if (captchaId.startsWith('local_fallback_')) {
    const expected = isStudent ? fallbackCaptcha.student : fallbackCaptcha.admin;
    if (parseInt(captchaAnswer) !== expected) {
      errBox.innerText = 'CAPTCHA cavabı yanlışdır!';
      errBox.style.display = 'block';
      fetchCaptcha(role);
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, captchaId, captchaAnswer })
    });

    const data = await res.json();
    if (!res.ok) {
      errBox.innerText = data.error || 'ID və ya password yanlışdır.';
      errBox.style.display = 'block';
      fetchCaptcha(role);
      return;
    }

    if (data.user.role === 'STUDENT') {
      document.getElementById('navBtnStudentCabinet').style.display = 'block';
      loadStudentPortalData(data.user);
      switchView('student-cabinet');
    } else if (data.user.role === 'ADMIN') {
      document.getElementById('navBtnAdminPanel').style.display = 'block';
      loadAdminPortalData();
      switchView('admin-panel');
    }
  } catch (err) {
    errBox.innerText = 'Server ilə əlaqə qurula bilmədi. Zəhmət olmasa internet bağlantısını yoxlayın.';
    errBox.style.display = 'block';
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch(e) {}
  document.getElementById('navBtnStudentCabinet').style.display = 'none';
  document.getElementById('navBtnAdminPanel').style.display = 'none';
  switchView('start');
}

async function loadStudentPortalData(user) {
  document.getElementById('stMetaName').innerText = user.full_name;
  document.getElementById('stMetaId').innerText = user.username;
  document.getElementById('stMetaFaculty').innerText = `${user.faculty} : BAKALAVR : ƏYANİ : 3`;
  document.getElementById('stMetaSemester').innerText = user.semester || 'VI';

  try {
    const res = await fetch(`${API_BASE_URL}/api/student/records`, { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('studentJournalTableBody');
    tbody.innerHTML = '';

    data.records.forEach((rec, idx) => {
      let examDisplay = rec.exam_date ? `${rec.exam_date.split('T')[0]} ${rec.exam_time}` : '<span style="color:#888;">Təyin edilməyib</span>';
      let percentHtml = `Ü: ${rec.percent_u}<br>M: ${rec.percent_m}<br>L: ${rec.percent_l}`;
      if (rec.percent_s) percentHtml += `<br>S: ${rec.percent_s}`;

      let colloqHtml = rec.colloquium_info ? `<div style="font-size:10px; color:#1a4f8b; font-style:italic; margin-top:3px;">${rec.colloquium_info}</div>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>2025/2026 2</td>
        <td>
          <div style="font-size:10.5px; font-weight:600;">${examDisplay}</div>
          <button class="btn-login" style="width:auto; padding:2px 6px; font-size:10px; margin:2px auto 0 auto;" onclick="switchStudentTab('exams')">Düzəliş et</button>
        </td>
        <td style="text-align:left; padding-left:8px;">
          <span style="font-weight:700; color:#124578; cursor:pointer;" onclick="openSubjectModal(${rec.subject_id}, '${rec.subject_name}')">
            ${rec.subject_name} (${rec.subject_code}) 🗓️
          </span>
          <span style="display:block; color:#0275d8; font-size:10.5px; cursor:pointer;" onclick="alert('${rec.subject_name} fənni üzrə sillabus yüklənir...')">Sillabus</span>
          ${colloqHtml}
        </td>
        <td style="font-size:10px; text-align:left; line-height:1.3;">${percentHtml}</td>
        <td style="font-size:13px; font-weight:800; color:#0b3c68; background:#f0fdf4;">${rec.qb}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('reqSubjectSelect').innerHTML = data.records.map(r => `<option value="${r.subject_id}">${r.subject_name}</option>`).join('');
  } catch (err) {
    console.error('Error loading records:', err);
  }
}

async function openSubjectModal(subjectId, subjectName) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/subject/${subjectId}/attendance`, { credentials: 'include' });
    const data = await res.json();
    const modalBody = document.getElementById('modalSubjectBodyContent');
    
    function buildGrid(list) {
      if (!list || list.length === 0) return '<div style="color:#777; font-size:11px; padding:4px;">Dərs qeydi daxil edilməyib.</div>';
      let rows = '';
      for (let i = 0; i < list.length; i += 4) {
        rows += '<tr>';
        for (let j = 0; j < 4; j++) {
          const item = list[i + j];
          if (item) {
            let cls = (item.status_val === 'Q') ? 'color:red; font-weight:700;' : (item.status_val === 'İ' ? 'color:#111;' : 'color:blue; font-weight:700;');
            rows += `<td style="border:1px solid #9bb7d4; padding:5px 2px;"><b>${item.lesson_no}:</b> ${item.lesson_date} - <span style="${cls}">${item.status_val}</span></td>`;
          } else {
            rows += '<td style="border:1px solid #9bb7d4;"></td>';
          }
        }
        rows += '</tr>';
      }
      return `<table style="width:100%; border-collapse:collapse; margin:6px 0; font-size:10.5px; text-align:center;"><tr><th style="background:#d4e3f3; padding:4px;">1</th><th style="background:#d4e3f3; padding:4px;">2</th><th style="background:#d4e3f3; padding:4px;">3</th><th style="background:#d4e3f3; padding:4px;">4</th></tr>${rows}</table>`;
    }

    const muhaziraList = data.attendance.filter(a => a.lesson_type === 'muhazira');
    const labList = data.attendance.filter(a => a.lesson_type === 'laboratoriya');

    modalBody.innerHTML = `
      <div style="font-size:12px; margin-bottom:8px; line-height:1.4;">
        <b>Fənn:</b> ${subjectName}<br>
        <b>Tələbə:</b> ${document.getElementById('stMetaName').innerText}
      </div>
      <div style="font-weight:700; color:#0f375f; margin-top:8px; font-size:12px; border-bottom:1.5px solid #a8c4df;">Mühazirə</div>
      ${buildGrid(muhaziraList)}
      <div style="font-weight:700; color:#0f375f; margin-top:8px; font-size:12px; border-bottom:1.5px solid #a8c4df;">Laboratoriya / Praktik</div>
      ${buildGrid(labList)}
    `;

    document.getElementById('subjectModal').classList.add('active');
  } catch(e) {}
}

function closeSubjectModal() { document.getElementById('subjectModal').classList.remove('active'); }
function openAbsenceCalcModal() { document.getElementById('calcModal').classList.add('active'); }
function closeAbsenceCalcModal() { document.getElementById('calcModal').classList.remove('active'); }

function calcLimits() {
  const m = parseInt(document.getElementById('calcM').value) || 0;
  const l = parseInt(document.getElementById('calcL').value) || 0;
  const total = m + l;
  const limitHours = Math.round(total * 0.20);
  document.getElementById('calcResult').innerHTML = `Ümumi dərs saatları: <b>${total}</b><br>Ümumi qayıb limitindən: <b>${limitHours} saat (${limitHours/2} dərs)</b> çox qayıbi olan tələbə imtahana buraxılmır.`;
}

function switchStudentTab(tab) {
  document.querySelectorAll('.student-subnav button').forEach(b => b.classList.remove('active'));
  ['journal', 'exams', 'requests', 'notifications'].forEach(t => {
    document.getElementById('stSubTab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = (t === tab) ? 'block' : 'none';
  });
  event.target.classList.add('active');
  if (tab === 'exams') loadStudentExamSlots();
  if (tab === 'requests') loadStudentRequests();
  if (tab === 'notifications') loadStudentNotifications();
}

async function loadStudentExamSlots() {
  const container = document.getElementById('studentExamSlotsContainer');
  container.innerHTML = '<div style="font-size:12px;">Yüklənir...</div>';
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/exam-slots`, { credentials: 'include' });
    const data = await res.json();
    if (data.slots.length === 0) {
      container.innerHTML = '<div style="font-size:12px; color:#888;">Hazırda aktiv imtahan seçimi yoxdur.</div>';
      return;
    }

    container.innerHTML = data.slots.map(slot => `
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b>${slot.subject_name} (${slot.subject_code})</b><br>
          📅 ${slot.exam_date.split('T')[0]} | ⏰ ${slot.exam_time} <span style="font-size:11px; color:#64748b;">(Dolu: ${slot.taken_count}/${slot.capacity})</span>
        </div>
        <div>
          ${slot.is_selected_by_me 
            ? '<span class="badge-status badge-active">✅ Sizin Seçiminiz</span>' 
            : (slot.taken_count >= slot.capacity 
                ? '<span class="badge-status badge-inactive">🚫 Yerlər Dolub</span>' 
                : `<button class="admin-btn" style="padding:5px 10px; font-size:11px;" onclick="chooseSlot(${slot.subject_id}, ${slot.slot_id})">Seçimi Təsdiqlə</button>`)}
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

async function chooseSlot(subjectId, slotId) {
  const res = await fetch(`${API_BASE_URL}/api/student/select-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subjectId, slotId })
  });
  const data = await res.json();
  alert(data.message || data.error);
  loadStudentExamSlots();
  loadStudentPortalData({ full_name: document.getElementById('stMetaName').innerText, username: document.getElementById('stMetaId').innerText, faculty: 'Kimya və biologiya müəllimliyi' });
}

async function handleSendCorrectionRequest(e) {
  e.preventDefault();
  const subjectId = document.getElementById('reqSubjectSelect').value;
  const topic = document.getElementById('reqTopic').value;
  const description = document.getElementById('reqDescription').value;

  const res = await fetch(`${API_BASE_URL}/api/student/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subjectId, topic, description })
  });
  const data = await res.json();
  alert(data.message);
  document.getElementById('reqTopic').value = '';
  document.getElementById('reqDescription').value = '';
  loadStudentRequests();
}

async function loadStudentRequests() {
  const container = document.getElementById('studentRequestsHistoryList');
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/corrections`, { credentials: 'include' });
    const data = await res.json();
    container.innerHTML = data.requests.map(r => `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:8px; margin-bottom:6px; font-size:12px;">
        <div style="display:flex; justify-content:space-between;"><b>${r.subject_name} - ${r.topic}</b> <span class="badge-status ${r.status==='accepted'?'badge-active':(r.status==='rejected'?'badge-inactive':'')}">${r.status}</span></div>
        <div style="color:#555; margin-top:2px;">${r.description}</div>
      </div>
    `).join('');
  } catch(e) {}
}

async function loadStudentNotifications() {
  const container = document.getElementById('studentNotificationsList');
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/notifications`, { credentials: 'include' });
    const data = await res.json();
    container.innerHTML = data.notifications.map(n => `
      <div style="background:#fff8e1; border-left:4px solid #f59e0b; padding:8px; margin-bottom:8px; font-size:12px;">
        <b>${n.title}</b><br>${n.body}
      </div>
    `).join('');
  } catch(e) {}
}

function switchAdminSection(sec) {
  ['dashboard', 'students', 'grading', 'examslots'].forEach(s => {
    document.getElementById('adminSec' + s.charAt(0).toUpperCase() + s.slice(1)).style.display = (s === sec) ? 'block' : 'none';
  });
  document.querySelectorAll('.admin-sidebar button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (sec === 'examslots') loadAdminSlots();
}

async function loadAdminPortalData() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/students`, { credentials: 'include' });
    const data = await res.json();
    document.getElementById('adminStudentsTableBody').innerHTML = data.students.map(s => `
      <tr><td><b>${s.username}</b></td><td>${s.full_name}</td><td>${s.faculty}</td><td>${s.course}</td><td><span class="badge-status badge-active">Aktiv</span></td></tr>
    `).join('');

    const stOptions = data.students.map(s => `<option value="${s.id}">${s.full_name} (${s.username})</option>`).join('');
    document.getElementById('admGradeStudentSelect').innerHTML = stOptions;

    const subRes = await fetch(`${API_BASE_URL}/api/admin/subjects`, { credentials: 'include' });
    const subData = await subRes.json();
    const sbOptions = subData.subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
    document.getElementById('admGradeSubjectSelect').innerHTML = sbOptions;
    document.getElementById('admSlotSubjectSelect').innerHTML = sbOptions;
    loadAdminSlots();
  } catch(e) {}
}

async function handleSaveAdminGrades(e) {
  e.preventDefault();
  const userId = document.getElementById('admGradeStudentSelect').value;
  const subjectId = document.getElementById('admGradeSubjectSelect').value;
  const d = document.getElementById('admInputD').value;
  const si = document.getElementById('admInputSI').value;
  const s = document.getElementById('admInputS').value;
  const l = document.getElementById('admInputL').value;
  const k = document.getElementById('admInputK').value;
  const qb = document.getElementById('admInputQB').value;
  const examScore = document.getElementById('admInputIB').value;
  const isExamVisible = document.getElementById('admInputIsExamVisible').checked;

  const res = await fetch(`${API_BASE_URL}/api/admin/grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, subjectId, d, si, s, l, k, qb, examScore, isExamVisible })
  });
  const data = await res.json();
  alert(data.message);
}

async function handleCreateExamSlot(e) {
  e.preventDefault();
  const subjectId = document.getElementById('admSlotSubjectSelect').value;
  const examDate = document.getElementById('admSlotDate').value;
  const examTime = document.getElementById('admSlotTime').value;
  const capacity = document.getElementById('admSlotCapacity').value;
  const status = document.getElementById('admSlotStatus').value;

  const res = await fetch(`${API_BASE_URL}/api/admin/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subjectId, examDate, examTime, capacity, status })
  });
  const data = await res.json();
  alert(data.message);
  loadAdminSlots();
}

async function loadAdminSlots() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/slots`, { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('adminSlotsListTableBody');
    tbody.innerHTML = data.slots.map(s => `
      <tr>
        <td><b>${s.subject_name} (${s.subject_code})</b></td>
        <td>📅 ${s.exam_date.split('T')[0]} | ⏰ ${s.exam_time}</td>
        <td>${s.taken_count} / ${s.capacity}</td>
        <td><span class="badge-status ${s.status==='active'?'badge-active':'badge-inactive'}">${s.status==='active'?'Aktiv':'Deaktiv'}</span></td>
        <td>
          <button class="admin-btn" style="padding:2px 6px; font-size:10px; background:#475569;" onclick="toggleSlotStatus(${s.id}, '${s.status==='active'?'inactive':'active'}')">
            ${s.status==='active'?'Deaktiv et':'Aktiv et'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch(e) {}
}

async function toggleSlotStatus(id, newStatus) {
  const res = await fetch(`${API_BASE_URL}/api/admin/slots/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: newStatus })
  });
  const data = await res.json();
  alert(data.message);
  loadAdminSlots();
}
