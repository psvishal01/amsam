if (!requireAdminAccess()) { /* redirected */ }

const adminUser = getUser();
document.getElementById('navName').textContent = adminUser?.name || '';
renderNavAvatar(adminUser || {});
const badge = document.getElementById('roleBadge');
if (badge) {
  badge.textContent = adminUser?.role === 'super_admin' ? '👑 Super Admin' : '🛡️ Sub Admin';
  badge.className   = `badge ${adminUser?.role === 'super_admin' ? 'badge-admin' : 'badge-subadmin'}`;
}

// Lock "Add Student" button for sub-admins
if (!isSuperAdmin()) {
  const btn = document.getElementById('addStudentBtn');
  if (btn) { btn.disabled = true; btn.title = 'Only Super Admin can create students'; }
}

// ── Tab switching ──────────────────────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  document.getElementById(`panel${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  if (tab === 'students') loadStudents();
  if (tab === 'events')   loadEvents();
  if (tab === 'mom')      loadMOMs();
  if (tab === 'scanner')  stopScanner();
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  stopScanner();
}
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); }));

// ── STUDENTS ───────────────────────────────────────────────────
let students = [];

async function loadStudents() {
  document.getElementById('studentsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    students = await apiFetch('/api/users');
    renderStudentsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderStudentsTable() {
  const list = students.filter(s => s.role !== 'super_admin');
  if (!list.length) {
    document.getElementById('studentsTable').innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>No students yet</h3><p>Add your first student account.</p></div>';
    return;
  }
  const superAdmin = isSuperAdmin();
  document.getElementById('studentsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Student</th><th>College ID</th><th>Email</th><th>Dept / Batch</th><th>Role</th>
          ${superAdmin ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${list.map(s => `<tr>
            <td>
              <div class="student-name-cell">
                <div class="student-avatar">${s.photo_path ? `<img src="${s.photo_path}" alt="${s.name}"/>` : s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                <span style="font-weight:500">${s.name}</span>
              </div>
            </td>
            <td><code style="font-size:.82rem;background:var(--cream);padding:.15rem .4rem;border-radius:4px;">${s.college_id}</code></td>
            <td style="font-size:.83rem">${s.email}</td>
            <td style="font-size:.83rem">${s.department||'—'} / ${s.batch||'—'}</td>
            <td>
              <span class="badge ${s.role==='sub_admin'?'badge-subadmin':'badge-student'}">
                ${s.role==='sub_admin'?'🛡️ Sub Admin':'👤 Student'}
              </span>
            </td>
            ${superAdmin ? `<td>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="editStudent(${s.id})">✏️</button>
                <button class="btn btn-warning btn-sm" onclick="openResetPw(${s.id},'${s.name.replace(/'/g,"\\'")}')">🔑</button>
                <button class="btn ${s.role==='sub_admin'?'btn-secondary':'btn-success'} btn-sm" onclick="toggleRole(${s.id},'${s.role}')">
                  ${s.role==='sub_admin'?'⬇️ Demote':'⬆️ Promote'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id},'${s.name.replace(/'/g,"\\'")}')">🗑️</button>
              </div>
            </td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openStudentModal(id = null) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can add students', 'error');
  document.getElementById('studentModalTitle').textContent = id ? 'Edit Student' : 'Add Student';
  document.getElementById('saveStudentBtn').textContent    = id ? 'Save Changes' : 'Create Account';
  document.getElementById('studentId').value = id || '';
  if (!id) {
    ['sName','sCollegeId','sEmail','sPassword','sBatch','sDept','sPhone'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('sPassword').required = true;
    document.getElementById('photoPreview').style.display = 'none';
  } else {
    const s = students.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sName').value      = s.name;
    document.getElementById('sCollegeId').value = s.college_id;
    document.getElementById('sEmail').value     = s.email;
    document.getElementById('sBatch').value     = s.batch || '';
    document.getElementById('sDept').value      = s.department || '';
    document.getElementById('sPhone').value     = s.phone || '';
    document.getElementById('sPassword').value  = '';
    document.getElementById('sPassword').required = false;
    if (s.photo_path) {
      document.getElementById('photoPreview').src = s.photo_path;
      document.getElementById('photoPreview').style.display = 'block';
    }
  }
  openModal('studentModal');
}

function editStudent(id) { openStudentModal(id); }

function previewPhoto(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('photoPreview');
      prev.src = e.target.result; prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

async function saveStudent() {
  const id   = document.getElementById('studentId').value;
  const name = document.getElementById('sName').value.trim();
  const cid  = document.getElementById('sCollegeId').value.trim();
  const email= document.getElementById('sEmail').value.trim();
  const pwd  = document.getElementById('sPassword').value;
  if (!name || !cid || !email) return showToast('Name, College ID, and Email are required', 'error');
  if (!id && !pwd) return showToast('Password is required for new accounts', 'error');

  const body = { name, college_id: cid, email, batch: document.getElementById('sBatch').value, department: document.getElementById('sDept').value, phone: document.getElementById('sPhone').value };
  if (pwd) body.password = pwd;

  try {
    let userId = id;
    if (id) { await apiFetch(`/api/users/${id}`, { method:'PUT', body:JSON.stringify(body) }); }
    else     { const r = await apiFetch('/api/users', { method:'POST', body:JSON.stringify(body) }); userId = r.id; }

    // Upload photo if selected
    const photoFile = document.getElementById('sPhoto').files[0];
    if (photoFile && userId) {
      const fd = new FormData();
      fd.append('photo', photoFile);
      await fetch(`/api/users/${userId}/photo`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`}, body:fd });
    }

    showToast(id ? 'Student updated!' : 'Student account created!', 'success');
    closeModal('studentModal');
    loadStudents();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete account for "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/users/${id}`, { method:'DELETE' });
    showToast('Student deleted', 'success');
    loadStudents();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function toggleRole(id, currentRole) {
  const newRole = currentRole === 'sub_admin' ? 'student' : 'sub_admin';
  const action  = newRole === 'sub_admin' ? 'promote to Sub-Admin' : 'demote to Student';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  try {
    await apiFetch(`/api/users/${id}/role`, { method:'PUT', body:JSON.stringify({role:newRole}) });
    showToast(`User ${newRole === 'sub_admin' ? 'promoted to Sub-Admin' : 'demoted to Student'}!`, 'success');
    loadStudents();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

let resetPwUserId = null;
function openResetPw(id, name) {
  resetPwUserId = id;
  document.getElementById('resetPwName').textContent = `Resetting password for: ${name}`;
  document.getElementById('resetPwVal').value = '';
  openModal('resetPwModal');
}
async function doResetPassword() {
  const pwd = document.getElementById('resetPwVal').value;
  if (!pwd || pwd.length < 6) return showToast('Password must be at least 6 characters', 'error');
  try {
    await apiFetch(`/api/users/${resetPwUserId}/reset-password`, { method:'POST', body:JSON.stringify({newPassword:pwd}) });
    showToast('Password reset successfully!', 'success');
    closeModal('resetPwModal');
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

// ── EVENTS ─────────────────────────────────────────────────────
let events = [];

async function loadEvents() {
  document.getElementById('eventsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    events = await apiFetch('/api/events');
    renderEventsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderEventsTable() {
  if (!events.length) {
    document.getElementById('eventsTable').innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No events yet</h3><p>Add your first event.</p></div>';
    return;
  }
  document.getElementById('eventsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Venue</th><th>Actions</th></tr></thead>
        <tbody>
          ${events.map(e => `<tr>
            <td style="font-weight:500;max-width:260px">${e.title}</td>
            <td style="white-space:nowrap">${e.event_date||'—'}</td>
            <td style="white-space:nowrap">${e.event_time||'—'}</td>
            <td style="font-size:.83rem;max-width:200px">${e.venue||'—'}</td>
            <td>
              <div style="display:flex;gap:.4rem">
                <button class="btn btn-secondary btn-sm" onclick="editEvent(${e.id})">✏️ Edit</button>
                <button class="btn btn-danger btn-sm"    onclick="deleteEvent(${e.id},'${e.title.replace(/'/g,"\\'")}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openEventModal(id = null) {
  document.getElementById('eventModalTitle').textContent = id ? 'Edit Event' : 'Add Event';
  document.getElementById('eventId').value = id || '';
  if (!id) { ['evTitle','evDate','evTime','evVenue','evDesc'].forEach(f => document.getElementById(f).value=''); }
  else {
    const ev = events.find(x=>x.id===id);
    if (!ev) return;
    document.getElementById('evTitle').value = ev.title;
    document.getElementById('evDate').value  = ev.event_date;
    document.getElementById('evTime').value  = ev.event_time;
    document.getElementById('evVenue').value = ev.venue;
    document.getElementById('evDesc').value  = ev.description;
  }
  openModal('eventModal');
}
function editEvent(id) { openEventModal(id); }

async function saveEvent() {
  const id    = document.getElementById('eventId').value;
  const title = document.getElementById('evTitle').value.trim();
  if (!title) return showToast('Title is required', 'error');
  const body = {
    title, description: document.getElementById('evDesc').value,
    venue: document.getElementById('evVenue').value,
    event_date: document.getElementById('evDate').value,
    event_time: document.getElementById('evTime').value
  };
  try {
    await apiFetch(id ? `/api/events/${id}` : '/api/events', { method: id ? 'PUT':'POST', body:JSON.stringify(body) });
    showToast(id ? 'Event updated!' : 'Event created!', 'success');
    closeModal('eventModal');
    loadEvents();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function deleteEvent(id, title) {
  if (!confirm(`Delete event "${title}"?`)) return;
  try {
    await apiFetch(`/api/events/${id}`, {method:'DELETE'});
    showToast('Event deleted','success'); loadEvents();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

// ── MOM ────────────────────────────────────────────────────────
let moms = [];

async function loadMOMs() {
  document.getElementById('momTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    moms = await apiFetch('/api/mom');
    renderMOMTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderMOMTable() {
  if (!moms.length) {
    document.getElementById('momTable').innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No MOM records yet</h3><p>Add your first meeting record.</p></div>';
    return;
  }
  document.getElementById('momTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Date</th><th>Attendees</th><th>Actions</th></tr></thead>
        <tbody>
          ${moms.map(m => {
            let att = [];
            try { att = JSON.parse(m.attendees||'[]'); } catch{}
            return `<tr>
              <td style="font-weight:500;max-width:280px">${m.title}</td>
              <td style="white-space:nowrap">${m.meeting_date||'—'}</td>
              <td style="font-size:.82rem">${att.slice(0,3).join(', ')}${att.length>3?` +${att.length-3} more`:''}</td>
              <td>
                <div style="display:flex;gap:.4rem">
                  <button class="btn btn-secondary btn-sm" onclick="editMOM(${m.id})">✏️ Edit</button>
                  <button class="btn btn-danger btn-sm"    onclick="deleteMOM(${m.id},'${m.title.replace(/'/g,"\\'")}')">🗑️</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function openMOMModal(id = null) {
  document.getElementById('momModalTitle').textContent = id ? 'Edit MOM' : 'Add MOM';
  document.getElementById('momId').value = id || '';
  if (!id) { ['momTitle','momDate','momAttendees','momAgenda','momNotes','momActions'].forEach(f => document.getElementById(f).value=''); }
  else {
    const m = moms.find(x=>x.id===id);
    if (!m) return;
    let att=[], acts=[];
    try{att=JSON.parse(m.attendees||'[]');}catch{}
    try{acts=JSON.parse(m.action_items||'[]');}catch{}
    document.getElementById('momTitle').value     = m.title;
    document.getElementById('momDate').value      = m.meeting_date;
    document.getElementById('momAttendees').value = att.join(', ');
    document.getElementById('momAgenda').value    = m.agenda;
    document.getElementById('momNotes').value     = m.notes;
    document.getElementById('momActions').value   = acts.join('\n');
  }
  openModal('momModal');
}
function editMOM(id) { openMOMModal(id); }

async function saveMOM() {
  const id    = document.getElementById('momId').value;
  const title = document.getElementById('momTitle').value.trim();
  if (!title) return showToast('Title is required', 'error');
  const attRaw = document.getElementById('momAttendees').value;
  const actRaw = document.getElementById('momActions').value;
  const body = {
    title,
    meeting_date: document.getElementById('momDate').value,
    attendees:    attRaw ? attRaw.split(',').map(s=>s.trim()).filter(Boolean) : [],
    agenda:       document.getElementById('momAgenda').value,
    notes:        document.getElementById('momNotes').value,
    action_items: actRaw ? actRaw.split('\n').map(s=>s.trim()).filter(Boolean) : []
  };
  try {
    await apiFetch(id ? `/api/mom/${id}` : '/api/mom', { method: id?'PUT':'POST', body:JSON.stringify(body) });
    showToast(id ? 'MOM updated!' : 'MOM created!', 'success');
    closeModal('momModal');
    loadMOMs();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteMOM(id, title) {
  if (!confirm(`Delete MOM record "${title}"?`)) return;
  try {
    await apiFetch(`/api/mom/${id}`,{method:'DELETE'});
    showToast('MOM deleted','success'); loadMOMs();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

// ── QR SCANNER ─────────────────────────────────────────────────
let scanStream = null;
let scanInterval = null;

async function startScanner() {
  document.getElementById('scanStatus').textContent = 'Requesting camera access…';
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } });
    const video = document.getElementById('qrVideo');
    video.srcObject = scanStream;
    document.getElementById('videoWrap').style.display = 'block';
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';
    document.getElementById('scanStatus').textContent = '🔍 Scanning for QR code…';
    document.getElementById('scanResult').classList.remove('show');

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');

    scanInterval = setInterval(() => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts:'dontInvert' });
      if (code && code.data.startsWith('AMSAM_VERIFY_')) {
        const parts = code.data.split('_');
        const userId = parseInt(parts[2]);
        if (!isNaN(userId)) { stopScanner(); showScanResult(userId); }
      }
    }, 300);
  } catch(e) {
    document.getElementById('scanStatus').textContent = '❌ Camera access denied. Please allow camera permissions.';
    showToast('Camera access denied', 'error');
  }
}

function stopScanner() {
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  document.getElementById('videoWrap').style.display  = 'none';
  document.getElementById('startScanBtn').style.display = 'block';
  document.getElementById('stopScanBtn').style.display  = 'none';
  document.getElementById('scanStatus').textContent = '';
}

async function showScanResult(userId) {
  const resultDiv = document.getElementById('scanResult');
  resultDiv.classList.add('show');
  document.getElementById('scanResultPhoto').innerHTML = '<div class="page-loader" style="min-height:60px"><div class="spinner"></div></div>';
  document.getElementById('scanResultInfo').innerHTML = '';
  try {
    const student = await apiFetch(`/api/verify/${userId}`);
    const photoHTML = student.photo_path
      ? `<img src="${student.photo_path}" class="scan-result-photo" alt="${student.name}"/>`
      : `<div class="scan-result-initials">${student.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>`;
    document.getElementById('scanResultPhoto').innerHTML = photoHTML;
    document.getElementById('scanResultInfo').innerHTML = `
      <div class="scan-row"><span class="scan-key">Full Name</span><span class="scan-val">${student.name}</span></div>
      <div class="scan-row"><span class="scan-key">College ID</span><span class="scan-val">${student.college_id}</span></div>
      <div class="scan-row"><span class="scan-key">Email</span><span class="scan-val">${student.email}</span></div>
      <div class="scan-row"><span class="scan-key">Department</span><span class="scan-val">${student.department||'—'}</span></div>
      <div class="scan-row"><span class="scan-key">Batch</span><span class="scan-val">${student.batch||'—'}</span></div>
      <div class="scan-row"><span class="scan-key">Phone</span><span class="scan-val">${student.phone||'—'}</span></div>
      <div class="scan-row"><span class="scan-key">Member Since</span><span class="scan-val">${new Date(student.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</span></div>
    `;
  } catch(e) {
    document.getElementById('scanResultPhoto').innerHTML = '';
    document.getElementById('scanResultInfo').innerHTML  = `<p style="color:var(--error)">Failed to load student: ${e.message}</p>`;
  }
}

function clearScanResult() {
  document.getElementById('scanResult').classList.remove('show');
  document.getElementById('startScanBtn').style.display = 'block';
}

// ── Init ───────────────────────────────────────────────────────
loadStudents();
