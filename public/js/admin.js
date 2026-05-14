if (!requireAdminAccess()) { /* redirected */ }

const adminUser = getUser();
document.getElementById('navName').textContent = adminUser?.name || '';
renderNavAvatar(adminUser || {});
const badge = document.getElementById('roleBadge');
if (badge) {
  badge.textContent = adminUser?.role === 'super_admin' ? '👑 Super Admin' : '🛡️ Sub Admin';
  badge.className   = `badge ${adminUser?.role === 'super_admin' ? 'badge-admin' : 'badge-subadmin'}`;
}

// Lock "Add Student" and "Import Excel" buttons for sub-admins
if (!isSuperAdmin()) {
  const btn = document.getElementById('addStudentBtn');
  if (btn) { btn.disabled = true; btn.title = 'Only Super Admin can create students'; }
  const impBtn = document.getElementById('importExcelBtn');
  if (impBtn) { impBtn.disabled = true; impBtn.title = 'Only Super Admin can import students'; }
}

// ── Tab switching ──────────────────────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  document.getElementById(`panel${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  if (tab === 'students') loadStudents();
  if (tab === 'events')   loadEvents();
  if (tab === 'documents') loadDocuments();
  if (tab === 'scanner')  stopScanner();
}

// ── Modal & Dropdown helpers ───────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  stopScanner();
}
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); }));

function toggleDropdown(e, id) {
  e.stopPropagation();
  // Close all others
  document.querySelectorAll('.dropdown-menu.show').forEach(m => {
    if (m.id !== `dropdown-${id}`) m.classList.remove('show');
  });
  const menu = document.getElementById(`dropdown-${id}`);
  if (menu) menu.classList.toggle('show');
}

// Close dropdowns when clicking outside
window.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
});

// ── STUDENTS ─────────────────────────────────────────────
let students = [];
let selectedStudents = new Set(); // tracks selected student IDs

async function loadStudents() {
  document.getElementById('studentsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    students = await apiFetch('/api/users');
    renderStudentsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderStudentsTable() {
  const searchQuery = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const paymentFilter = document.getElementById('paymentFilter')?.value || 'all';

  const list = students.filter(s => {
    if (s.role === 'super_admin') return false;
    
    if (paymentFilter === 'paid' && !s.is_paid) return false;
    if (paymentFilter === 'unpaid' && s.is_paid) return false;

    if (!searchQuery) return true;
    return s.name.toLowerCase().includes(searchQuery) || 
           s.college_id.toLowerCase().includes(searchQuery) || 
           s.email.toLowerCase().includes(searchQuery);
  });

  if (!list.length) {
    document.getElementById('studentsTable').innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>No students found</h3><p>Try adjusting your search or add a new student.</p></div>';
    return;
  }
  const superAdmin = isSuperAdmin();
  const allIds = list.map(s => s.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedStudents.has(id));

  document.getElementById('studentsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          ${superAdmin ? `<th class="cb-col"><input type="checkbox" class="select-cb" id="selectAllCb" ${allSelected ? 'checked' : ''} onchange="toggleSelectAll(this, [${allIds.join(',')}])"/></th>` : ''}
          <th>Student</th><th>College ID</th><th>Email</th><th>Dept / Batch</th><th>Payment</th><th>Role</th>
          ${superAdmin ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${list.map(s => `<tr id="row-${s.id}" class="${selectedStudents.has(s.id) ? 'row-selected' : ''}">
            ${superAdmin ? `<td class="cb-col"><input type="checkbox" class="select-cb" id="cb-${s.id}" ${selectedStudents.has(s.id) ? 'checked' : ''} onchange="toggleSelect(${s.id}, this)"/></td>` : ''}
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
              <span class="badge ${s.is_paid ? 'badge-paid' : 'badge-unpaid'}">
                ${s.is_paid ? '✅ Paid' : '⏳ Unpaid'}
              </span>
            </td>
            <td>
              <span class="badge ${s.role==='sub_admin'?'badge-subadmin':'badge-student'}">
                ${s.role==='sub_admin'?'🛡️ Sub Admin':'👤 Student'}
              </span>
            </td>
            ${superAdmin ? `<td>
              <div class="action-dropdown">
                <button class="btn btn-secondary btn-sm" onclick="toggleDropdown(event, ${s.id})">⚙️ Actions</button>
                <div class="dropdown-menu" id="dropdown-${s.id}">
                  <button class="dropdown-item" onclick="editStudent(${s.id})">✏️ Edit Profile</button>
                  <button class="dropdown-item" onclick="openResetPw(${s.id},'${s.name.replace(/'/g,"\\'")}')">🔑 Reset Password</button>
                  <button class="dropdown-item" onclick="togglePayment(${s.id},${s.is_paid ? 1 : 0},'${s.name.replace(/'/g,"\\'")}')">
                    ${s.is_paid ? '❌ Mark Unpaid' : '💳 Mark Paid'}
                  </button>
                  <button class="dropdown-item" onclick="toggleRole(${s.id},'${s.role}')">
                    ${s.role==='sub_admin'?'⬇️ Demote to Student':'⬆️ Promote to Sub-Admin'}
                  </button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item text-danger" onclick="deleteStudent(${s.id},'${s.name.replace(/'/g,"\\'")}')">🗑️ Delete Account</button>
                </div>
              </div>
            </td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function filterStudents() {
  renderStudentsTable();
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

async function togglePayment(id, currentPaid, name) {
  const markPaid = !currentPaid;
  const action   = markPaid ? `mark "${name}" as PAID` : `mark "${name}" as UNPAID`;
  if (!confirm(`Are you sure you want to ${action}?`)) return;
  try {
    await apiFetch(`/api/users/${id}/payment`, { method:'PUT', body:JSON.stringify({ is_paid: markPaid }) });
    showToast(markPaid ? `✅ ${name} marked as paid!` : `⏳ ${name} marked as unpaid.`, markPaid ? 'success' : 'info');
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
        <thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Venue</th><th>Fee</th><th>Actions</th></tr></thead>
        <tbody>
          ${events.map(e => `<tr>
            <td style="font-weight:500;max-width:260px">${e.title}</td>
            <td style="white-space:nowrap">${e.event_date||'—'}</td>
            <td style="white-space:nowrap">${e.event_time||'—'}</td>
            <td style="font-size:.83rem;max-width:200px">${e.venue||'—'}</td>
            <td style="white-space:nowrap">₹${e.fee||0}</td>
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
  if (!id) { ['evTitle','evDate','evTime','evVenue','evDesc','evFee'].forEach(f => { if(document.getElementById(f)) document.getElementById(f).value=''; }); document.getElementById('evFee').value = '0'; }
  else {
    const ev = events.find(x=>x.id===id);
    if (!ev) return;
    document.getElementById('evTitle').value = ev.title;
    document.getElementById('evDate').value  = ev.event_date;
    document.getElementById('evTime').value  = ev.event_time;
    document.getElementById('evVenue').value = ev.venue;
    document.getElementById('evDesc').value  = ev.description;
    document.getElementById('evFee').value   = ev.fee || 0;
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
    event_time: document.getElementById('evTime').value,
    fee: parseInt(document.getElementById('evFee').value) || 0
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

// ── DOCUMENTS ────────────────────────────────────────────────────────
let documents = [];

async function loadDocuments() {
  document.getElementById('documentsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    documents = await apiFetch('/api/documents');
    renderDocumentsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderDocumentsTable() {
  if (!documents.length) {
    document.getElementById('documentsTable').innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><h3>No Documents yet</h3><p>Upload your first document.</p></div>';
    return;
  }
  document.getElementById('documentsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Description</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${documents.map(d => `<tr>
            <td style="font-weight:500;max-width:240px">
              <a href="${d.file_path}" target="_blank" style="color:var(--navy);text-decoration:none;">
                📄 ${d.title}
              </a>
            </td>
            <td><span class="badge" style="background:var(--teal-pale);color:var(--teal-dark);">${d.category}</span></td>
            <td style="max-width:280px;font-size:.85rem">${d.description || '—'}</td>
            <td style="white-space:nowrap">${new Date(d.created_at).toLocaleDateString('en-IN')}</td>
            <td>
              <div style="display:flex;gap:.4rem">
                <button class="btn btn-secondary btn-sm" onclick="editDocument(${d.id})">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDocument(${d.id},'${d.title.replace(/'/g,"\\'")}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openDocumentModal(id = null) {
  const modalTitle = document.getElementById('documentModalTitle');
  const saveBtn = document.getElementById('saveDocBtn');
  const fileNote = document.getElementById('docFileRequiredNote');
  
  document.getElementById('docId').value = id || '';
  
  if (id) {
    const d = documents.find(x => x.id === id);
    if (!d) return;
    modalTitle.textContent = 'Edit Document';
    saveBtn.textContent = 'Save Changes';
    document.getElementById('docTitle').value = d.title;
    document.getElementById('docCategory').value = d.category;
    document.getElementById('docDesc').value = d.description || '';
    document.getElementById('docFile').value = '';
    fileNote.style.display = 'none'; // Optional when editing
  } else {
    modalTitle.textContent = 'Upload Document';
    saveBtn.textContent = 'Upload';
    document.getElementById('docTitle').value = '';
    document.getElementById('docCategory').value = 'MOM';
    document.getElementById('docDesc').value = '';
    document.getElementById('docFile').value = '';
    fileNote.style.display = 'inline'; // Required when creating
  }
  openModal('documentModal');
}

function editDocument(id) { openDocumentModal(id); }

async function saveDocument() {
  const id = document.getElementById('docId').value;
  const title = document.getElementById('docTitle').value.trim();
  const category = document.getElementById('docCategory').value;
  const desc = document.getElementById('docDesc').value.trim();
  const fileInput = document.getElementById('docFile');

  if (!title) return showToast('Title is required', 'error');
  if (!id && !fileInput.files[0]) return showToast('Please select a file to upload', 'error');

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('description', desc);
  if (fileInput.files[0]) {
    formData.append('file', fileInput.files[0]);
  }

  try {
    const btn = document.getElementById('saveDocBtn');
    const oldText = btn.textContent;
    btn.textContent = id ? 'Saving...' : 'Uploading...';
    btn.disabled = true;

    const url = id ? `/api/documents/${id}` : '/api/documents';
    const method = id ? 'PUT' : 'POST';

    await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error(id ? 'Update failed' : 'Upload failed');
      return res.json();
    });

    btn.textContent = oldText;
    btn.disabled = false;

    showToast(id ? 'Document updated!' : 'Document uploaded!', 'success');
    closeModal('documentModal');
    loadDocuments();
  } catch(e) { 
    showToast('Error: '+e.message,'error'); 
    const btn = document.getElementById('saveDocBtn');
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Upload';
  }
}

async function deleteDocument(id, title) {
  if (!confirm(`Delete document "${title}"?`)) return;
  try {
    await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
    showToast('Document deleted','success'); 
    loadDocuments();
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
      if (code) {
        if (code.data.startsWith('AMSAM_VERIFY_')) {
          const parts = code.data.split('_');
          const userId = parseInt(parts[2]);
          if (!isNaN(userId)) { stopScanner(); showScanResult(userId); }
        } else if (code.data.startsWith('AMSAM_EVENT_')) {
          stopScanner(); showEventScanResult(code.data);
        }
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

    const paymentBadge = student.is_paid
      ? `<div class="verified-badge" style="background:#F0FDF4;border-color:#86EFAC;color:#166534;">💳 MEMBERSHIP FEE PAID${student.paid_at ? ' · ' + new Date(student.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>`
      : `<div class="verified-badge" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B;">❌ PAYMENT PENDING — Membership fee not paid</div>`;

    document.getElementById('scanResultInfo').innerHTML = `
      ${paymentBadge}
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

async function showEventScanResult(qrCode) {
  const resultDiv = document.getElementById('scanResult');
  resultDiv.classList.add('show');
  document.getElementById('scanResultPhoto').innerHTML = '<div class="page-loader" style="min-height:60px"><div class="spinner"></div></div>';
  document.getElementById('scanResultInfo').innerHTML = '';
  try {
    const registration = await apiFetch(`/api/registrations/scan`, {
      method: 'POST',
      body: JSON.stringify({ qr_code: qrCode })
    });
    
    document.getElementById('scanResultPhoto').innerHTML = `<div class="scan-result-initials">🎫</div>`;

    const admittedBadge = registration.is_admitted
      ? `<div class="verified-badge" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B;">❌ ALREADY ADMITTED — QR Used</div>`
      : `<div class="verified-badge" style="background:#F0FDF4;border-color:#86EFAC;color:#166534;">✅ VALID REGISTRATION — Not Admitted Yet</div>`;

    document.getElementById('scanResultInfo').innerHTML = `
      ${admittedBadge}
      <div class="scan-row"><span class="scan-key">Event</span><span class="scan-val">${registration.event_title}</span></div>
      <div class="scan-row"><span class="scan-key">Student Name</span><span class="scan-val">${registration.user_name}</span></div>
      <div class="scan-row"><span class="scan-key">College ID</span><span class="scan-val">${registration.college_id}</span></div>
      <div class="scan-row"><span class="scan-key">Payment Status</span><span class="scan-val">${registration.is_paid ? 'Paid' : 'Unpaid'}</span></div>
      ${!registration.is_admitted ? `<button class="btn btn-primary w-full mt-2" onclick="admitStudent('${qrCode}')">Mark as Admitted</button>` : ''}
    `;
  } catch(e) {
    document.getElementById('scanResultPhoto').innerHTML = '';
    document.getElementById('scanResultInfo').innerHTML  = `<p style="color:var(--error)">Failed to load registration: ${e.message}</p>`;
  }
}

async function admitStudent(qrCode) {
  try {
    await apiFetch('/api/registrations/admit', {
      method: 'POST',
      body: JSON.stringify({ qr_code: qrCode })
    });
    showToast('Student successfully admitted!', 'success');
    showEventScanResult(qrCode); // refresh result
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

function clearScanResult() {
  document.getElementById('scanResult').classList.remove('show');
  document.getElementById('startScanBtn').style.display = 'block';
}

// ── Init ───────────────────────────────────────────────────────
loadStudents();

// ── BULK IMPORT ────────────────────────────────────────────────
let importFile = null;

function openImportModal() {
  if (!isSuperAdmin()) return showToast('Only Super Admin can import students', 'error');
  importFile = null;
  document.getElementById('importFileInput').value = '';
  document.getElementById('importFileName').textContent = '';
  document.getElementById('importResult').classList.remove('show');
  document.getElementById('importSubmitBtn').disabled = true;
  openModal('importModal');
}

// Drag-and-drop on drop zone
const dropZone = document.getElementById('importDropZone');
if (dropZone) {
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setImportFile(file);
  });
}

function handleImportFileInput(input) {
  if (input.files[0]) setImportFile(input.files[0]);
}

function setImportFile(file) {
  const validExts = /\.(xlsx|xls|csv)$/i;
  if (!validExts.test(file.name)) {
    showToast('Only .xlsx, .xls or .csv files are allowed', 'error');
    return;
  }
  importFile = file;
  document.getElementById('importFileName').textContent = '📎 ' + file.name;
  document.getElementById('importResult').classList.remove('show');
  document.getElementById('importSubmitBtn').disabled = false;
}

async function downloadTemplate(e) {
  e.preventDefault();
  try {
    const resp = await fetch('/api/users/import-template', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!resp.ok) throw new Error('Failed to download template');
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'amsam_students_template.xlsx';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(err) { showToast('Error: ' + err.message, 'error'); }
}

async function submitImport() {
  if (!importFile) return showToast('Please select a file first', 'error');
  const btn = document.getElementById('importSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  const fd = new FormData();
  fd.append('file', importFile);

  try {
    const resp = await fetch('/api/users/bulk-import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Import failed');

    // Show stats
    document.getElementById('impStatImported').textContent = data.imported;
    document.getElementById('impStatSkipped').textContent  = data.skipped.length;
    document.getElementById('impStatTotal').textContent    = data.total;

    // Build skip list
    const skipList = document.getElementById('importSkipList');
    if (data.skipped.length) {
      skipList.innerHTML = data.skipped.map(s =>
        `<div class="import-skip-item">Row ${s.row}: <strong>${s.data.name || s.data.email || 'Unknown'}</strong> — ${s.reason}</div>`
      ).join('');
    } else {
      skipList.innerHTML = '';
    }

    document.getElementById('importResult').classList.add('show');
    const emailNote = data.emailsSent > 0 ? ` 📧 Welcome emails sent to ${data.emailsSent} student${data.emailsSent !== 1 ? 's' : ''}.` : '';
    showToast(`✅ ${data.imported} student${data.imported !== 1 ? 's' : ''} imported!${emailNote}`, 'success');

    // Refresh students table
    if (data.imported > 0) loadStudents();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import';
  }
}

// ── BULK SELECT & DELETE ────────────────────────────────────

function updateBulkToolbar() {
  const count = selectedStudents.size;
  const toolbar = document.getElementById('bulkToolbar');
  document.getElementById('bulkCount').textContent = count;
  toolbar.classList.toggle('show', count > 0);
}

function toggleSelect(id, cb) {
  if (cb.checked) {
    selectedStudents.add(id);
  } else {
    selectedStudents.delete(id);
  }
  // Toggle row highlight
  const row = document.getElementById(`row-${id}`);
  if (row) row.classList.toggle('row-selected', cb.checked);

  // Sync select-all checkbox state
  const visibleIds = Array.from(document.querySelectorAll('[id^="cb-"]')).map(el => parseInt(el.id.replace('cb-', '')));
  const allChecked = visibleIds.length > 0 && visibleIds.every(vid => selectedStudents.has(vid));
  const selectAllCb = document.getElementById('selectAllCb');
  if (selectAllCb) selectAllCb.checked = allChecked;

  updateBulkToolbar();
}

function toggleSelectAll(masterCb, ids) {
  ids.forEach(id => {
    if (masterCb.checked) {
      selectedStudents.add(id);
    } else {
      selectedStudents.delete(id);
    }
    const cb = document.getElementById(`cb-${id}`);
    if (cb) cb.checked = masterCb.checked;
    const row = document.getElementById(`row-${id}`);
    if (row) row.classList.toggle('row-selected', masterCb.checked);
  });
  updateBulkToolbar();
}

function clearSelection() {
  selectedStudents.clear();
  renderStudentsTable(); // re-render clears all checkboxes
  updateBulkToolbar();
}

function confirmBulkDelete() {
  if (!isSuperAdmin()) return showToast('Only Super Admin can delete students', 'error');
  if (selectedStudents.size === 0) return;
  const n = selectedStudents.size;
  document.getElementById('bulkDeleteCount').textContent = `${n} student${n !== 1 ? 's' : ''}`;
  openModal('bulkDeleteModal');
}

async function executeBulkDelete() {
  const ids = Array.from(selectedStudents);
  if (!ids.length) return;

  const btn = document.getElementById('confirmBulkDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const data = await apiFetch('/api/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
    closeModal('bulkDeleteModal');
    selectedStudents.clear();
    updateBulkToolbar();
    showToast(`🗑️ ${data.deleted} student${data.deleted !== 1 ? 's' : ''} deleted.`, 'success');
    loadStudents();
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete All';
  }
}
