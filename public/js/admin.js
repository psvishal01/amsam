if (!requireAdminAccess()) { /* redirected */ }

const adminUser = getUser();
document.getElementById('navName').textContent = adminUser?.name || '';
renderNavAvatar(adminUser || {});
const badge = document.getElementById('roleBadge');
if (badge) {
  badge.textContent = adminUser?.role === 'super_admin' ? '👑 Super Admin' : '🛡️ Sub Admin';
  badge.className   = `badge ${adminUser?.role === 'super_admin' ? 'badge-admin' : 'badge-subadmin'}`;
}

// Show "My Dashboard" link for sub-admins (they are also students)
if (!isSuperAdmin()) {
  const dashBtn = document.getElementById('myDashboardBtn');
  if (dashBtn) dashBtn.style.display = 'inline';

  // Hide Events and Documents tabs — sub-admins don't need these
  ['tabEvents', 'tabDocuments'].forEach(id => {
    const tab = document.getElementById(id);
    if (tab) tab.style.display = 'none';
  });
}

// Lock "Add Student" and "Import Excel" buttons for sub-admins
if (!isSuperAdmin()) {
  const btn = document.getElementById('addStudentBtn');
  if (btn) { btn.disabled = true; btn.title = 'Only Super Admin can create students'; }
  const impBtn = document.getElementById('importExcelBtn');
  if (impBtn) { impBtn.disabled = true; impBtn.title = 'Only Super Admin can import students'; }
  const rdaBtn = document.getElementById('addRdaBtn');
  if (rdaBtn) { rdaBtn.disabled = true; rdaBtn.title = 'Only Super Admin can create PG students'; }
  const rdaImpBtn = document.getElementById('importRdaExcelBtn');
  if (rdaImpBtn) { rdaImpBtn.disabled = true; rdaImpBtn.title = 'Only Super Admin can import PG students'; }
}

// ── Tab switching ──────────────────────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  document.getElementById(`panel${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
  if (tab === 'students')  loadStudents();
  if (tab === 'rda')       loadRda();
  if (tab === 'guests')    loadGuests();
  if (tab === 'events')    loadEvents();
  if (tab === 'workshops') loadWorkshops();
  if (tab === 'documents') loadDocuments();
  if (tab === 'clubs')     loadClubs();
  if (tab === 'scanner')   stopScanner();
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

// ── GUESTS ──────────────────────────────────────────────────
let guests = [];

async function loadGuests() {
  document.getElementById('guestsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    guests = await apiFetch('/api/users?role=guest');
    renderGuestsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderGuestsTable() {
  const q = (document.getElementById('guestSearch')?.value || '').toLowerCase();
  const list = guests.filter(g =>
    !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || (g.organization||'').toLowerCase().includes(q)
  );
  if (!list.length) {
    document.getElementById('guestsTable').innerHTML = '<div class="empty-state"><div class="empty-icon">🙋</div><h3>No guests found</h3><p>Guests who sign up from outside the college will appear here.</p></div>';
    return;
  }
  document.getElementById('guestsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Guest</th><th>Email</th><th>Organization</th><th>Phone</th><th>Joined</th>
          ${isSuperAdmin() ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${list.map(g => `<tr>
            <td>
              <div class="student-name-cell">
                <div class="student-avatar">${g.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                <span style="font-weight:500">${g.name}</span>
              </div>
            </td>
            <td style="font-size:.83rem">${g.email}</td>
            <td style="font-size:.83rem">${g.organization || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="font-size:.83rem">${g.phone || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="font-size:.83rem">${new Date(g.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
            ${isSuperAdmin() ? `<td style="display:flex;gap:0.5rem;"><button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none;padding:.3rem .8rem;border-radius:6px;cursor:pointer;font-size:.8rem;" onclick="editGuest(${g.id})">✏️ Edit</button> <button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:.3rem .8rem;border-radius:6px;cursor:pointer;font-size:.8rem;" onclick="deleteGuest(${g.id},'${g.name.replace(/'/g,"\\'")}')">🗑️ Delete</button></td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function filterGuests() { renderGuestsTable(); }

function openGuestModal(id = null) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can manage guests', 'error');
  document.getElementById('guestModalTitle').textContent = id ? 'Edit Guest' : 'Add Guest';
  document.getElementById('saveGuestBtn').textContent    = id ? 'Save Changes' : 'Create Guest';
  document.getElementById('guestId').value = id || '';
  if (!id) {
    ['mGuestName','mGuestPhone','mGuestOrg','mGuestEmail','mGuestPassword'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('mGuestPassword').required = true;
  } else {
    const g = guests.find(x => x.id === id);
    if (!g) return;
    document.getElementById('mGuestName').value      = g.name;
    document.getElementById('mGuestPhone').value     = g.phone || '';
    document.getElementById('mGuestOrg').value       = g.organization || '';
    document.getElementById('mGuestEmail').value     = g.email;
    document.getElementById('mGuestPassword').value  = '';
    document.getElementById('mGuestPassword').required = false;
  }
  openModal('guestModal');
}

function editGuest(id) { openGuestModal(id); }

async function saveGuest() {
  const id = document.getElementById('guestId').value;
  const body = {
    name: document.getElementById('mGuestName').value.trim(),
    email: document.getElementById('mGuestEmail').value.trim(),
    phone: document.getElementById('mGuestPhone').value.trim(),
    organization: document.getElementById('mGuestOrg').value.trim(),
    role: 'guest'
  };
  const pw = document.getElementById('mGuestPassword').value;
  if (!id && !pw) return showToast('Password is required for new guest', 'error');
  if (pw) body.password = pw;
  if (!body.name || !body.email) return showToast('Name and Email are required', 'error');

  try {
    await apiFetch(id ? `/api/users/${id}` : '/api/users', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    showToast(id ? 'Guest updated!' : 'Guest created!', 'success');
    closeModal('guestModal');
    loadGuests();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteGuest(id, name) {
  if (!confirm(`Delete guest account for "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    guests = guests.filter(g => g.id !== id);
    renderGuestsTable();
    showToast(`Guest "${name}" deleted`, 'success');
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

// ── RDA (PG STUDENTS) ───────────────────────────────────────────
let rdaStudents = [];
let selectedRda = new Set();

async function loadRda() {
  document.getElementById('rdaTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    rdaStudents = await apiFetch('/api/users?role=pg_student');
    renderRdaTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function renderRdaTable() {
  const searchQuery = (document.getElementById('rdaSearch')?.value || '').toLowerCase();
  const paymentFilter = document.getElementById('rdaPaymentFilter')?.value || 'all';

  const list = rdaStudents.filter(s => {
    if (paymentFilter === 'paid'   && !s.is_paid) return false;
    if (paymentFilter === 'unpaid' &&  s.is_paid) return false;
    if (!searchQuery) return true;
    return s.name.toLowerCase().includes(searchQuery) ||
           (s.college_id||'').toLowerCase().includes(searchQuery) ||
           s.email.toLowerCase().includes(searchQuery) ||
           (s.department||'').toLowerCase().includes(searchQuery);
  });

  if (!list.length) {
    document.getElementById('rdaTable').innerHTML = '<div class="empty-state"><div class="empty-icon">🎓</div><h3>No PG students found</h3><p>Add or import PG / RDA students to see them here.</p></div>';
    return;
  }
  const superAdmin = isSuperAdmin();
  const allIds = list.map(s => s.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedRda.has(id));

  document.getElementById('rdaTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          ${superAdmin ? `<th class="cb-col"><input type="checkbox" class="select-cb" id="rdaSelectAllCb" ${allSelected ? 'checked' : ''} onchange="toggleRdaSelectAll(this, [${allIds.join(',')}])"/></th>` : ''}
          <th>PG Student</th><th>College ID</th><th>Email</th><th>Specialization / Batch</th><th>Payment</th>
          ${superAdmin ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${list.map(s => `<tr id="rda-row-${s.id}" class="${selectedRda.has(s.id) ? 'row-selected' : ''}">
            ${superAdmin ? `<td class="cb-col"><input type="checkbox" class="select-cb" id="rda-cb-${s.id}" ${selectedRda.has(s.id) ? 'checked' : ''} onchange="toggleRdaSelect(${s.id}, this)"/></td>` : ''}
            <td>
              <div class="student-name-cell">
                <div class="student-avatar" style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.15));color:#6366f1;">
                  ${s.photo_path ? `<img src="${s.photo_path}" alt="${s.name}"/>` : s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <span style="font-weight:500">${s.name}</span>
              </div>
            </td>
            <td><code style="font-size:.82rem;background:rgba(99,102,241,.08);padding:.15rem .4rem;border-radius:4px;color:#4338ca;">${s.college_id}</code></td>
            <td style="font-size:.83rem">${s.email}</td>
            <td style="font-size:.83rem">${s.department||'—'} / ${s.batch||'—'}</td>
            <td>
              <span class="badge ${s.is_paid ? 'badge-paid' : 'badge-unpaid'}">
                ${s.is_paid ? '✅ Paid' : '⏳ Unpaid'}
              </span>
            </td>
            ${superAdmin ? `<td>
              <div class="action-dropdown">
                <button class="btn btn-secondary btn-sm" onclick="toggleDropdown(event, 'rda_${s.id}')">⚙️ Actions</button>
                <div class="dropdown-menu" id="dropdown-rda_${s.id}">
                  <button class="dropdown-item" onclick="editRdaStudent(${s.id})">✏️ Edit Profile</button>
                  <button class="dropdown-item" onclick="openResetPw(${s.id},'${s.name.replace(/'/g,"\\'")}')">&#128273; Reset Password</button>
                  <button class="dropdown-item" onclick="toggleRdaPayment(${s.id},${s.is_paid ? 1 : 0},'${s.name.replace(/'/g,"\\'")}')">  
                    ${s.is_paid ? '❌ Mark Unpaid' : '💳 Mark Paid'}
                  </button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item text-danger" onclick="deleteRdaStudent(${s.id},'${s.name.replace(/'/g,"\\'")}')">&#128465; Delete Account</button>
                </div>
              </div>
            </td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function filterRda() { renderRdaTable(); }

function openRdaModal(id = null) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can add PG students', 'error');
  document.getElementById('rdaModalTitle').textContent  = id ? '✏️ Edit PG Student' : '🎓 Add PG Student';
  document.getElementById('saveRdaBtn').textContent      = id ? 'Save Changes' : 'Create Account';
  document.getElementById('rdaStudentId').value = id || '';
  if (!id) {
    ['rName','rCollegeId','rEmail','rPassword','rBatch','rDept','rPhone'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('rPassword').required = true;
    document.getElementById('rdaPhotoPreview').style.display = 'none';
  } else {
    const s = rdaStudents.find(x => x.id === id);
    if (!s) return;
    document.getElementById('rName').value      = s.name;
    document.getElementById('rCollegeId').value = s.college_id;
    document.getElementById('rEmail').value     = s.email;
    document.getElementById('rBatch').value     = s.batch || '';
    document.getElementById('rDept').value      = s.department || '';
    document.getElementById('rPhone').value     = s.phone || '';
    document.getElementById('rPassword').value  = '';
    document.getElementById('rPassword').required = false;
    if (s.photo_path) {
      document.getElementById('rdaPhotoPreview').src = s.photo_path;
      document.getElementById('rdaPhotoPreview').style.display = 'block';
    } else {
      document.getElementById('rdaPhotoPreview').style.display = 'none';
    }
  }
  openModal('rdaModal');
}

function editRdaStudent(id) { openRdaModal(id); }

function previewRdaPhoto(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('rdaPhotoPreview');
      prev.src = e.target.result; prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

async function saveRdaStudent() {
  const id   = document.getElementById('rdaStudentId').value;
  const name = document.getElementById('rName').value.trim();
  const cid  = document.getElementById('rCollegeId').value.trim();
  const email= document.getElementById('rEmail').value.trim();
  const pwd  = document.getElementById('rPassword').value;
  if (!name || !cid || !email) return showToast('Name, College ID, and Email are required', 'error');
  if (!id && !pwd) return showToast('Password is required for new accounts', 'error');

  const body = { name, college_id: cid, email, batch: document.getElementById('rBatch').value, department: document.getElementById('rDept').value, phone: document.getElementById('rPhone').value, role: 'pg_student' };
  if (pwd) body.password = pwd;

  try {
    let userId = id;
    if (id) { await apiFetch(`/api/users/${id}`, { method:'PUT', body:JSON.stringify(body) }); }
    else     { const r = await apiFetch('/api/users', { method:'POST', body:JSON.stringify(body) }); userId = r.id; }

    const photoFile = document.getElementById('rPhoto').files[0];
    if (photoFile && userId) {
      const fd = new FormData();
      fd.append('photo', photoFile);
      await fetch(`/api/users/${userId}/photo`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`}, body:fd });
    }

    showToast(id ? 'PG student updated!' : 'PG student account created!', 'success');
    closeModal('rdaModal');
    loadRda();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function deleteRdaStudent(id, name) {
  if (!confirm(`Delete account for "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/users/${id}`, { method:'DELETE' });
    showToast('PG student deleted', 'success');
    loadRda();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function toggleRdaPayment(id, currentPaid, name) {
  const markPaid = !currentPaid;
  if (!confirm(`Are you sure you want to ${markPaid ? `mark "${name}" as PAID` : `mark "${name}" as UNPAID`}?`)) return;
  try {
    await apiFetch(`/api/users/${id}/payment`, { method:'PUT', body:JSON.stringify({ is_paid: markPaid }) });
    showToast(markPaid ? `✅ ${name} marked as paid!` : `⏳ ${name} marked as unpaid.`, markPaid ? 'success' : 'info');
    loadRda();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

// ── RDA BULK SELECT & DELETE ──────────────────────────────────

function updateRdaBulkToolbar() {
  const count = selectedRda.size;
  document.getElementById('rdaBulkCount').textContent = count;
  document.getElementById('rdaBulkToolbar').classList.toggle('show', count > 0);
}

function toggleRdaSelect(id, cb) {
  if (cb.checked) selectedRda.add(id); else selectedRda.delete(id);
  const row = document.getElementById(`rda-row-${id}`);
  if (row) row.classList.toggle('row-selected', cb.checked);
  const visibleIds = Array.from(document.querySelectorAll('[id^="rda-cb-"]')).map(el => parseInt(el.id.replace('rda-cb-', '')));
  const allChecked = visibleIds.length > 0 && visibleIds.every(vid => selectedRda.has(vid));
  const masterCb = document.getElementById('rdaSelectAllCb');
  if (masterCb) masterCb.checked = allChecked;
  updateRdaBulkToolbar();
}

function toggleRdaSelectAll(masterCb, ids) {
  ids.forEach(id => {
    if (masterCb.checked) selectedRda.add(id); else selectedRda.delete(id);
    const cb = document.getElementById(`rda-cb-${id}`);
    if (cb) cb.checked = masterCb.checked;
    const row = document.getElementById(`rda-row-${id}`);
    if (row) row.classList.toggle('row-selected', masterCb.checked);
  });
  updateRdaBulkToolbar();
}

function clearRdaSelection() {
  selectedRda.clear();
  renderRdaTable();
  updateRdaBulkToolbar();
}

function confirmRdaBulkDelete() {
  if (!isSuperAdmin()) return showToast('Only Super Admin can delete PG students', 'error');
  if (selectedRda.size === 0) return;
  const n = selectedRda.size;
  document.getElementById('rdaBulkDeleteCount').textContent = `${n} PG student${n !== 1 ? 's' : ''}`;
  openModal('rdaBulkDeleteModal');
}

async function executeRdaBulkDelete() {
  const ids = Array.from(selectedRda);
  if (!ids.length) return;
  const btn = document.getElementById('confirmRdaBulkDeleteBtn');
  btn.disabled = true; btn.textContent = 'Deleting…';
  try {
    const data = await apiFetch('/api/users/bulk-delete', { method:'POST', body:JSON.stringify({ ids }) });
    closeModal('rdaBulkDeleteModal');
    selectedRda.clear();
    updateRdaBulkToolbar();
    showToast(`🗑️ ${data.deleted} PG student${data.deleted !== 1 ? 's' : ''} deleted.`, 'success');
    loadRda();
  } catch(e) { showToast('Error: '+e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Yes, Delete All'; }
}

// ── STUDENTS ───────────────────────────────────────────────────────
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
          <th>Student</th><th>College ID</th><th>Email</th><th>Dept / Batch</th><th>Valid Till</th><th>Payment</th><th>Role</th>
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
            <td style="font-size:.82rem">
              ${s.membership_valid_till
                ? `<span style="color:var(--navy);font-weight:600;">${new Date(s.membership_valid_till).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>`
                : `<span style="color:var(--text-muted);font-size:.78rem;">Auto</span>`
              }
            </td>
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
                  <button class="dropdown-item" onclick="openSetValidity(${s.id},'${s.name.replace(/'/g,"\\'")}')">📅 Set Valid Till</button>
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
    ['sName','sCollegeId','sEmail','sPassword','sBatch','sDept','sPhone','sValidTill'].forEach(f => {
      if (document.getElementById(f)) document.getElementById(f).value = '';
    });
    document.querySelectorAll('.club-cb').forEach(cb => cb.checked = false);
    document.getElementById('sPassword').required = true;
    document.getElementById('photoPreview').style.display = 'none';
    populateClubDropdowns([]); // load fresh with nothing checked
  } else {
    const s = students.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sName').value      = s.name;
    document.getElementById('sCollegeId').value = s.college_id;
    document.getElementById('sEmail').value     = s.email;
    document.getElementById('sBatch').value     = s.batch || '';
    document.getElementById('sDept').value      = s.department || '';
    document.getElementById('sPhone').value     = s.phone || '';
    // Populate valid till date
    if (s.membership_valid_till) {
      document.getElementById('sValidTill').value = s.membership_valid_till.slice(0, 10);
    } else {
      document.getElementById('sValidTill').value = '';
    }
    const selectedClubs = s.clubs ? s.clubs.split(',').map(c => c.trim()) : [];
    populateClubDropdowns(selectedClubs); // load clubs and pre-check saved ones
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

  const clubs = Array.from(document.querySelectorAll('.club-cb:checked')).map(cb => cb.value).join(', ');
  const validTill = document.getElementById('sValidTill').value || null;

  const body = { name, college_id: cid, email, batch: document.getElementById('sBatch').value, department: document.getElementById('sDept').value, phone: document.getElementById('sPhone').value, clubs, membership_valid_till: validTill };
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

let setValidityUserId = null;
function openSetValidity(id, name) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can set validity dates', 'error');
  setValidityUserId = id;
  document.getElementById('validityStudentName').textContent = `Setting validity for: ${name}`;
  // Pre-fill current value from students array
  const s = students.find(x => x.id === id);
  document.getElementById('validityDate').value = s?.membership_valid_till ? s.membership_valid_till.slice(0, 10) : '';
  openModal('setValidityModal');
}

async function doSetValidity() {
  const dateVal = document.getElementById('validityDate').value;
  try {
    await apiFetch(`/api/users/${setValidityUserId}/validity`, {
      method: 'PUT',
      body: JSON.stringify({ membership_valid_till: dateVal || null })
    });
    showToast('✅ Membership validity updated!', 'success');
    closeModal('setValidityModal');
    loadStudents();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function clearValidity() {
  try {
    await apiFetch(`/api/users/${setValidityUserId}/validity`, {
      method: 'PUT',
      body: JSON.stringify({ membership_valid_till: null })
    });
    showToast('Validity cleared — will auto-calculate from batch year.', 'info');
    closeModal('setValidityModal');
    loadStudents();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
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
        <thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Venue</th><th>Member Fee</th><th>Non-Member Fee</th><th>Visible To</th><th>Actions</th></tr></thead>
        <tbody>
          ${events.map(e => `<tr>
            <td style="font-weight:500;max-width:260px">${e.title}</td>
            <td style="white-space:nowrap">${e.event_date||'—'}</td>
            <td style="white-space:nowrap">${e.event_time||'—'}</td>
            <td style="font-size:.83rem;max-width:200px">${e.venue||'—'}</td>
            <td style="white-space:nowrap">
              <span class="badge badge-paid">₹${e.fee_member || 0}</span>
              ${(() => {
                let cf = [];
                try { if (e.club_fees) cf = JSON.parse(e.club_fees); } catch(err) {}
                if (!Array.isArray(cf) || !cf.length) return '';
                return '<div style="margin-top:.25rem;display:flex;flex-direction:column;gap:.15rem;">' +
                  cf.map(c => `<span style="font-size:.7rem;background:#EDE9FE;color:#5B21B6;padding:.1rem .4rem;border-radius:8px;font-weight:600;">🎭 ${c.club}: ₹${c.fee}</span>`).join('') +
                  '</div>';
              })()}
            </td>
            <td style="white-space:nowrap">
              <span class="badge badge-unpaid">₹${e.fee || 0}</span>
            </td>
            <td>
              ${(() => {
                const parts = (e.visibility || 'student').toLowerCase().split(',').map(s => s.trim());
                return parts.map(p => {
                  if (p === 'all') return '<span class="badge badge-paid" style="margin-right:2px;">🙋 All</span>';
                  if (p === 'rda') return '<span class="badge badge-admin" style="margin-right:2px;">📚 RDA</span>';
                  return '<span class="badge badge-subadmin" style="margin-right:2px;">👥 Students</span>';
                }).join(' ');
              })()}
            </td>
            <td>
              <div style="display:flex;gap:.4rem">
                <button class="btn btn-secondary btn-sm" onclick="viewAttendees(${e.id}, '${e.title.replace(/'/g,"\\'")}')" title="View Attendees">👥</button>
                <button class="btn btn-secondary btn-sm" onclick="editEvent(${e.id})">✏️</button>
                <button class="btn btn-danger btn-sm"    onclick="deleteEvent(${e.id},'${e.title.replace(/'/g,"\\'")}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// -- Attendees Logic --
let currentEventAttendees = [];
let currentEventIdForAttendees = null;

async function viewAttendees(eventId, eventTitle) {
  currentEventIdForAttendees = eventId;
  document.getElementById('attendeesModalTitle').textContent = `Attendees: ${eventTitle}`;
  openModal('attendeesModal');
  document.getElementById('attendeesTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
  
  try {
    currentEventAttendees = await apiFetch(`/api/registrations/event/${eventId}`);
    renderAttendeesTable();
  } catch(e) {
    document.getElementById('attendeesTableBody').innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Error loading attendees: ${e.message}</td></tr>`;
  }
}

function renderAttendeesTable() {
  const tbody = document.getElementById('attendeesTableBody');
  if (!currentEventAttendees.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No registrations for this event yet.</td></tr>';
    return;
  }

  tbody.innerHTML = currentEventAttendees.map(r => {
    const isAdmitted = r.is_admitted === 1;
    const admissionBadge = isAdmitted 
      ? `<span class="badge badge-paid">✅ Admitted</span>` 
      : `<span class="badge badge-unpaid">⏳ Not Admitted</span>`;
    
    return `<tr>
      <td style="font-weight:500;">${r.user_name}</td>
      <td style="font-size:0.85rem; color:var(--text-muted);">
        <div>✉️ ${r.user_email}</div>
        ${r.user_phone ? `<div>📞 ${r.user_phone}</div>` : ''}
      </td>
      <td>
        <div><span class="badge ${r.role === 'guest' ? 'badge-subadmin' : 'badge-student'}">${r.role}</span></div>
        <div style="font-size:0.8rem; margin-top:4px;">${r.college_id || 'N/A'}</div>
      </td>
      <td>
        ${r.is_paid ? '<span class="badge badge-paid">💳 Member</span>' : '<span class="badge badge-unpaid">🏷️ Guest/Non-Member</span>'}
      </td>
      <td>${admissionBadge}</td>
      <td>
        <button class="btn btn-sm ${isAdmitted ? 'btn-secondary' : 'btn-primary'}" 
                onclick="toggleAdmission(${r.registration_id}, '${r.user_name.replace(/'/g, "\\'")}')" 
                ${isAdmitted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ${isAdmitted ? 'Manual Entry Done' : 'Admit Manually'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function toggleAdmission(regId, name) {
  if (!confirm(`Are you sure you want to manually admit ${name}? This action cannot be undone.`)) {
    return; // Cancelled by user
  }

  try {
    const res = await apiFetch(`/api/registrations/${regId}/toggle-admit`, { method: 'PUT' });
    showToast('Student admitted successfully', 'success');
    
    // Update local state and re-render to avoid full refetch
    const attendee = currentEventAttendees.find(a => a.registration_id === regId);
    if (attendee) {
      attendee.is_admitted = 1; // Force to 1 instead of relying on toggle since undo is disabled
      renderAttendeesTable();
    }
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function toggleVisibilityCheckbox(type) {}

function openEventModal(id = null) {
  document.getElementById('eventModalTitle').textContent = id ? 'Edit Event' : 'Add Event';
  document.getElementById('eventId').value = id || '';
  if (!id) {
    ['evTitle','evDate','evTime','evVenue','evDesc','evFee','evFeeMember'].forEach(f => { if(document.getElementById(f)) document.getElementById(f).value=''; });
    document.getElementById('evFee').value = '0';
    document.getElementById('evFeeMember').value = '0';
    document.getElementById('evVisibilityStudent').checked = true;
    document.getElementById('evVisibilityAll').checked = false;
    document.getElementById('evVisibilityRda').checked = false;
    if (document.getElementById('eventClubFeesContainer')) document.getElementById('eventClubFeesContainer').innerHTML = '';
  }
  else {
    const ev = events.find(x=>x.id===id);
    if (!ev) return;
    document.getElementById('evTitle').value     = ev.title;
    document.getElementById('evDate').value       = ev.event_date;
    document.getElementById('evTime').value       = ev.event_time;
    document.getElementById('evVenue').value      = ev.venue;
    document.getElementById('evDesc').value       = ev.description;
    document.getElementById('evFee').value        = ev.fee || 0;
    document.getElementById('evFeeMember').value  = ev.fee_member || 0;
    const visStr = (ev.visibility || 'student').toLowerCase();
    const visParts = visStr.split(',').map(s => s.trim());
    document.getElementById('evVisibilityStudent').checked = visParts.includes('student') || (!visParts.includes('all') && !visParts.includes('rda') && !visParts.includes('student'));
    document.getElementById('evVisibilityAll').checked = visParts.includes('all');
    document.getElementById('evVisibilityRda').checked = visParts.includes('rda');
    const container = document.getElementById('eventClubFeesContainer');
    if (container) {
      container.innerHTML = '';
      let cf = [];
      try { if (ev.club_fees) cf = JSON.parse(ev.club_fees); } catch(err) {}
      if (Array.isArray(cf)) cf.forEach(c => addEventClubFeeRow(c));
    }
  }
  openModal('eventModal');
}
function editEvent(id) { openEventModal(id); }

let _eventClubFeeIdx = 0;
function addEventClubFeeRow(item = {}) {
  const container = document.getElementById('eventClubFeesContainer');
  if (!container) return;
  const idx = _eventClubFeeIdx++;
  const opts = clubs.map(c => `<option value="${c.name}" ${item.club === c.name ? 'selected' : ''}>${c.icon || '🎭'} ${c.name}</option>`).join('');
  const row = document.createElement('div');
  row.id = `eventClubFeeRow-${idx}`;
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:.4rem;align-items:center;background:#fff;border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;';
  row.innerHTML = `
    <select class="form-control ecf-club" style="font-size:.82rem;padding:.3rem .5rem;">
      <option value="">— Select Club —</option>
      ${opts}
    </select>
    <div style="display:flex;align-items:center;gap:.25rem;">
      <span style="font-size:.72rem;color:var(--text-muted);white-space:nowrap;">₹ Fee</span>
      <input type="number" class="form-control ecf-fee" value="${item.fee ?? 0}" min="0" style="width:80px;font-size:.82rem;padding:.3rem .4rem;"/>
    </div>
    <button type="button" onclick="removeEventClubFeeRow('eventClubFeeRow-${idx}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#ef4444;padding:.1rem .3rem;" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removeEventClubFeeRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
}

function getEventClubFees() {
  return Array.from(document.querySelectorAll('#eventClubFeesContainer > div')).map(row => ({
    club: row.querySelector('.ecf-club')?.value || '',
    fee:  parseInt(row.querySelector('.ecf-fee')?.value) || 0,
  })).filter(c => c.club);
}

async function saveEvent() {
  const id    = document.getElementById('eventId').value;
  const title = document.getElementById('evTitle').value.trim();
  if (!title) return showToast('Title is required', 'error');
  const visList = [];
  if (document.getElementById('evVisibilityStudent').checked) visList.push('student');
  if (document.getElementById('evVisibilityAll').checked) visList.push('all');
  if (document.getElementById('evVisibilityRda').checked) visList.push('rda');
  const visibility = visList.length > 0 ? visList.join(',') : 'student';
  const club_fees = getEventClubFees();
  const body = {
    title, description: document.getElementById('evDesc').value,
    venue: document.getElementById('evVenue').value,
    event_date: document.getElementById('evDate').value,
    event_time: document.getElementById('evTime').value,
    fee:        parseInt(document.getElementById('evFee').value)       || 0,
    fee_member: parseInt(document.getElementById('evFeeMember').value) || 0,
    club_fees,
    visibility
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
    document.getElementById('docCategory').value = 'Int';
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
let currentImportRole = 'student';

function openImportModal(role = 'student') {
  currentImportRole = role;
  if (!isSuperAdmin()) return showToast('Only Super Admin can import students', 'error');
  importFile = null;
  document.getElementById('importFileInput').value = '';
  document.getElementById('importFileName').textContent = '';
  document.getElementById('importResult').classList.remove('show');
  document.getElementById('importSubmitBtn').disabled = true;
  // Update modal title based on role
  const titleEl = document.getElementById('importModalTitle');
  if (titleEl) {
    if (role === 'pg_student') titleEl.textContent = '📤 Bulk Import RDA / PG Students';
    else if (role === 'guest') titleEl.textContent = '📤 Bulk Import Guests';
    else titleEl.textContent = '📤 Bulk Import Students';
  }
  // Reset toggle to OFF by default
  const toggle = document.getElementById('emailToggle');
  if (toggle) { toggle.checked = false; updateEmailToggleUI(); }
  openModal('importModal');
}

function updateEmailToggleUI() {
  const isOn   = document.getElementById('emailToggle').checked;
  const label  = document.getElementById('emailToggleStateLabel');
  const desc   = document.getElementById('emailToggleDesc');
  label.textContent = isOn ? 'ON' : 'OFF';
  label.className   = 'toggle-state-label ' + (isOn ? 'on' : 'off');
  desc.textContent  = isOn
    ? 'ON — welcome email with login credentials will be sent to new students'
    : 'OFF — existing students will be updated, no emails sent';
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
    const resp = await fetch(`/api/users/import-template?role=${encodeURIComponent(currentImportRole)}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!resp.ok) throw new Error('Failed to download template');
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = currentImportRole === 'pg_student' ? 'amsam_rda_pg_template.xlsx' : 'amsam_students_template.xlsx';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(err) { showToast('Error: ' + err.message, 'error'); }
}

async function submitImport() {
  if (!importFile) return showToast('Please select a file first', 'error');
  const btn       = document.getElementById('importSubmitBtn');
  const sendEmail = document.getElementById('emailToggle')?.checked ?? false;
  btn.disabled    = true;
  btn.textContent = 'Importing…';

  const fd = new FormData();
  fd.append('sendEmail', sendEmail ? 'true' : 'false');
  fd.append('file', importFile);

  try {
    const resp = await fetch(`/api/users/bulk-import?sendEmail=${sendEmail ? 'true' : 'false'}&role=${currentImportRole}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Import failed');

    // Show stats
    document.getElementById('impStatImported').textContent = data.imported;
    document.getElementById('impStatUpdated').textContent  = data.updated || 0;
    document.getElementById('impStatSkipped').textContent  = data.skipped.length;
    document.getElementById('impStatTotal').textContent    = data.total;

    // Build skip + email error list
    const skipList = document.getElementById('importSkipList');
    let listHTML = '';
    if (data.skipped.length) {
      listHTML += data.skipped.map(s =>
        `<div class="import-skip-item">Row ${s.row}: <strong>${s.data.name || s.data.email || 'Unknown'}</strong> — ${s.reason}</div>`
      ).join('');
    }
    if (data.emailErrors && data.emailErrors.length) {
      listHTML += data.emailErrors.map(e =>
        `<div class="import-skip-item" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B;">📧 Email FAILED for <strong>${e.email}</strong>: ${e.reason}</div>`
      ).join('');
    }
    skipList.innerHTML = listHTML;

    document.getElementById('importResult').classList.add('show');

    // Build toast
    let toastMsg = '';
    if (data.imported > 0)  toastMsg += `✅ ${data.imported} new ${currentImportRole === 'pg_student' ? 'PG student' : currentImportRole === 'guest' ? 'guest' : 'student'}${data.imported !== 1 ? 's' : ''} added. `;
    if (data.updated  > 0)  toastMsg += `🔄 ${data.updated} updated. `;
    if (data.emailsSent > 0) toastMsg += `📧 ${data.emailsSent} email${data.emailsSent !== 1 ? 's' : ''} sent.`;
    if (!toastMsg) toastMsg = 'ℹ️ No new records added.';
    showToast(toastMsg.trim(), 'success');

    // Show a separate error toast if any emails failed
    if (data.emailErrors && data.emailErrors.length > 0) {
      showToast(`⚠️ ${data.emailErrors.length} email(s) failed to send — check the list below.`, 'error');
    }

    if (data.imported > 0 || data.updated > 0) {
      if (currentImportRole === 'guest') loadGuests();
      else if (currentImportRole === 'pg_student') loadRda();
      else loadStudents();
    }
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
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

// ── CHANGE ADMIN PASSWORD ────────────────────────────────────────
async function doChangeAdminPassword() {
  const currentPw  = document.getElementById('cpCurrentPw').value.trim();
  const newPw      = document.getElementById('cpNewPw').value.trim();
  const confirmPw  = document.getElementById('cpConfirmPw').value.trim();
  const errEl      = document.getElementById('cpError');

  errEl.style.display = 'none';

  if (!currentPw || !newPw || !confirmPw) {
    errEl.textContent = 'All fields are required.';
    errEl.style.display = 'block';
    return;
  }
  if (newPw.length < 6) {
    errEl.textContent = 'New password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (newPw !== confirmPw) {
    errEl.textContent = 'New passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.querySelector('#changePwModal .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Updating…';

  try {
    await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
    });
    closeModal('changePwModal');
    // Clear fields
    document.getElementById('cpCurrentPw').value = '';
    document.getElementById('cpNewPw').value = '';
    document.getElementById('cpConfirmPw').value = '';
    showToast('✅ Password updated successfully!', 'success');
  } catch(e) {
    errEl.textContent = e.message || 'Failed to update password.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

// ── WORKSHOPS ────────────────────────────────────────────────────────────
let workshops = [];

async function loadWorkshops() {
  document.getElementById('workshopsTable').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    workshops = await apiFetch('/api/workshops');
    renderWorkshopsTable();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function seatChip(label, cls, used, total) {
  if (total === 0) return '';
  const full = used >= total;
  return `<span class="seat-chip ${cls}${full?' full':''}">${label}: ${used}/${total}${full?' Full':''}</span>`;
}

function renderWorkshopsTable() {
  const el = document.getElementById('workshopsTable');
  if (!workshops.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔬</div><h3>No Workshops yet</h3><p>Create your first workshop to start managing seat registrations.</p></div>';
    return;
  }
  el.innerHTML = `<div class="ws-grid animate-in">
    ${workshops.map(w => {
      const memberFull    = w.seats_member     > 0 && w.member_registered     >= w.seats_member;
      const nonMemberFull = w.seats_non_member > 0 && w.non_member_registered >= w.seats_non_member;
      const clubFull      = w.seats_club       > 0 && w.club_registered       >= w.seats_club;
      const allFull = memberFull && nonMemberFull && clubFull && (w.seats_member > 0 || w.seats_non_member > 0 || w.seats_club > 0);

      return `<div class="ws-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
          <div class="ws-title">${w.title}</div>
          ${allFull ? '<span class="badge" style="background:#FEE2E2;color:#991B1B;font-size:.7rem;">FULL</span>' : '<span class="badge" style="background:#D1FAE5;color:#065F46;font-size:.7rem;">OPEN</span>'}
        </div>
        <div class="ws-meta">
          ${(() => {
            if (w.workshop_date && w.workshop_to_date && w.workshop_date !== w.workshop_to_date) {
              const d1 = new Date(w.workshop_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
              const d2 = new Date(w.workshop_to_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
              return `📅 ${d1} - ${d2}`;
            } else if (w.workshop_date) {
              return `📅 ${new Date(w.workshop_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`;
            }
            return '';
          })()}
          ${w.workshop_time ? `⏰ ${w.workshop_time}` : ''}
          ${w.venue ? `📍 ${w.venue}` : ''}
        </div>
        <div style="margin-bottom: .5rem;">
          ${(() => {
            const parts = (w.visibility || 'student').toLowerCase().split(',').map(s => s.trim());
            return parts.map(p => {
              if (p === 'all') return '<span class="badge badge-paid" style="margin-right:3px;font-size:.65rem;padding:.15rem .4rem;">🙋 All</span>';
              if (p === 'rda') return '<span class="badge badge-admin" style="margin-right:3px;font-size:.65rem;padding:.15rem .4rem;">📚 RDA</span>';
              return '<span class="badge badge-subadmin" style="margin-right:3px;font-size:.65rem;padding:.15rem .4rem;">👥 Students</span>';
            }).join(' ');
          })()}
        </div>
        ${w.description ? `<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.5;">${w.description}</div>` : ''}
        <div class="seat-bar-wrap">
          ${seatChip('💳 Members',    'member',     w.member_registered,     w.seats_member)}
          ${seatChip('🏷️ Non-Members','non-member', w.non_member_registered, w.seats_non_member)}
          ${(() => {
            let cs = [];
            try { if (w.club_slots) cs = JSON.parse(w.club_slots); } catch(e) {}
            if (!cs.length && w.seats_club > 0) cs = [{ club: w.club_name || 'Club', seats: w.seats_club }];
            return cs.map(s => seatChip(`🎭 ${s.club}`, 'club', w.club_registered || 0, s.seats)).join('');
          })()}
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.25rem;font-size:.77rem;color:var(--text-secondary);">
          ${w.fee_member     > 0 ? `<span>💳 ₹${w.fee_member}</span>`     : '<span style="color:#065F46;">💳 Free</span>'}
          ${w.fee_non_member > 0 ? `<span>🏷️ ₹${w.fee_non_member}</span>` : '<span style="color:#065F46;">🏷️ Free</span>'}
          ${w.seats_club > 0 ? (w.fee_club > 0 ? `<span>🎭 ₹${w.fee_club}</span>` : '<span style="color:#065F46;">🎭 Free</span>') : ''}
        </div>
        <div class="ws-actions">
          <button class="btn btn-sm btn-secondary" onclick="viewWsRegistrations(${w.id},'${w.title.replace(/'/g,"\\'")}')">👥 Registrations</button>
          ${isSuperAdmin() ? `
          <button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none;padding:.3rem .8rem;border-radius:6px;cursor:pointer;font-size:.8rem;" onclick="editWorkshop(${w.id})">✏️ Edit</button>
          <button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:.3rem .8rem;border-radius:6px;cursor:pointer;font-size:.8rem;" onclick="deleteWorkshop(${w.id},'${w.title.replace(/'/g,"\\'")}')">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function openWorkshopModal(id = null) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can manage workshops','error');
  document.getElementById('workshopModalTitle').textContent = id ? 'Edit Workshop' : 'Add Workshop';
  document.getElementById('saveWorkshopBtn').textContent    = id ? 'Save Changes' : 'Create Workshop';
  document.getElementById('workshopId').value = id || '';
  if (!id) {
    ['wsTitle','wsDate','wsToDate','wsTime','wsVenue','wsDesc'].forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = ''; });
    document.getElementById('wsSeatsMember').value    = '0';
    document.getElementById('wsSeatsNonMember').value = '0';
    document.getElementById('wsFeeMember').value      = '0';
    document.getElementById('wsFeeNonMember').value   = '0';
    document.getElementById('clubSlotsContainer').innerHTML = '';
    document.getElementById('wsVisibilityStudent').checked = true;
    document.getElementById('wsVisibilityAll').checked = false;
    document.getElementById('wsVisibilityRda').checked = false;
  } else {
    const w = workshops.find(x => x.id === id);
    if (!w) return;
    document.getElementById('wsTitle').value           = w.title;
    document.getElementById('wsDate').value            = w.workshop_date || '';
    document.getElementById('wsToDate').value          = w.workshop_to_date || '';
    document.getElementById('wsTime').value            = w.workshop_time || '';
    document.getElementById('wsVenue').value           = w.venue || '';
    document.getElementById('wsDesc').value            = w.description || '';
    document.getElementById('wsSeatsMember').value     = w.seats_member     || 0;
    document.getElementById('wsSeatsNonMember').value  = w.seats_non_member  || 0;
    document.getElementById('wsFeeMember').value       = w.fee_member        || 0;
    document.getElementById('wsFeeNonMember').value    = w.fee_non_member    || 0;
    
    const visStr = (w.visibility || 'student').toLowerCase();
    const visParts = visStr.split(',').map(s => s.trim());
    document.getElementById('wsVisibilityStudent').checked = visParts.includes('student') || (!visParts.includes('all') && !visParts.includes('rda') && !visParts.includes('student'));
    document.getElementById('wsVisibilityAll').checked = visParts.includes('all');
    document.getElementById('wsVisibilityRda').checked = visParts.includes('rda');

    // Populate multi-club rows
    const container = document.getElementById('clubSlotsContainer');
    container.innerHTML = '';
    let savedSlots = [];
    try { if (w.club_slots) savedSlots = JSON.parse(w.club_slots); } catch(e) {}
    // Fall back to legacy single-club
    if (!savedSlots.length && (w.seats_club > 0 || w.club_name)) {
      savedSlots = [{ club: w.club_name || '', seats: w.seats_club || 0, fee: w.fee_club || 0 }];
    }
    savedSlots.forEach(slot => addClubSlotRow(slot));
  }
  openModal('workshopModal');
}

// Unique counter for club slot rows
let _clubSlotIdx = 0;

function addClubSlotRow(slot = {}) {
  const container = document.getElementById('clubSlotsContainer');
  const idx = _clubSlotIdx++;
  // Build club options from the global clubs array
  const opts = clubs.map(c => `<option value="${c.name}" ${slot.club === c.name ? 'selected' : ''}>${c.icon || '🎭'} ${c.name}</option>`).join('');
  const row = document.createElement('div');
  row.id = `clubSlotRow-${idx}`;
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto auto;gap:.4rem;align-items:center;background:#fff;border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;';
  row.innerHTML = `
    <select class="form-control cs-club" style="font-size:.82rem;padding:.3rem .5rem;">
      <option value="">— Select Club —</option>
      ${opts}
    </select>
    <div style="display:flex;align-items:center;gap:.25rem;">
      <span style="font-size:.72rem;color:var(--text-muted);white-space:nowrap;">Seats</span>
      <input type="number" class="form-control cs-seats" value="${slot.seats ?? 0}" min="0" style="width:65px;font-size:.82rem;padding:.3rem .4rem;"/>
    </div>
    <div style="display:flex;align-items:center;gap:.25rem;">
      <span style="font-size:.72rem;color:var(--text-muted);white-space:nowrap;">₹ Fee</span>
      <input type="number" class="form-control cs-fee" value="${slot.fee ?? 0}" min="0" style="width:70px;font-size:.82rem;padding:.3rem .4rem;"/>
    </div>
    <button type="button" onclick="removeClubSlotRow('clubSlotRow-${idx}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#ef4444;padding:.1rem .3rem;" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removeClubSlotRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
}

function getClubSlots() {
  return Array.from(document.querySelectorAll('#clubSlotsContainer > div')).map(row => ({
    club:  row.querySelector('.cs-club')?.value  || '',
    seats: parseInt(row.querySelector('.cs-seats')?.value) || 0,
    fee:   parseInt(row.querySelector('.cs-fee')?.value)   || 0,
  })).filter(s => s.club);
}

function editWorkshop(id) { openWorkshopModal(id); }

async function saveWorkshop() {
  const id    = document.getElementById('workshopId').value;
  const title = document.getElementById('wsTitle').value.trim();
  if (!title) return showToast('Title is required','error');
  
  const visList = [];
  if (document.getElementById('wsVisibilityStudent').checked) visList.push('student');
  if (document.getElementById('wsVisibilityAll').checked) visList.push('all');
  if (document.getElementById('wsVisibilityRda').checked) visList.push('rda');
  const visibility = visList.length > 0 ? visList.join(',') : 'student';

  const club_slots = getClubSlots();
  const body = {
    title,
    description:      document.getElementById('wsDesc').value,
    venue:            document.getElementById('wsVenue').value,
    workshop_date:    document.getElementById('wsDate').value,
    workshop_to_date: document.getElementById('wsToDate').value,
    workshop_time:    document.getElementById('wsTime').value,
    seats_member:     parseInt(document.getElementById('wsSeatsMember').value)    || 0,
    seats_non_member: parseInt(document.getElementById('wsSeatsNonMember').value) || 0,
    fee_member:       parseInt(document.getElementById('wsFeeMember').value)      || 0,
    fee_non_member:   parseInt(document.getElementById('wsFeeNonMember').value)   || 0,
    club_slots,
    visibility
  };
  try {
    await apiFetch(id ? `/api/workshops/${id}` : '/api/workshops', { method: id ? 'PUT':'POST', body: JSON.stringify(body) });
    showToast(id ? 'Workshop updated!' : 'Workshop created!', 'success');
    closeModal('workshopModal');
    loadWorkshops();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteWorkshop(id, title) {
  if (!confirm(`Delete workshop "${title}"?`)) return;
  try {
    await apiFetch(`/api/workshops/${id}`, { method:'DELETE' });
    showToast('Workshop deleted','success');
    loadWorkshops();
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function viewWsRegistrations(id, title) {
  document.getElementById('wsRegsTitle').textContent = `Registrations — ${title}`;
  document.getElementById('wsRegsBody').innerHTML    = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  openModal('wsRegsModal');
  try {
    const regs = await apiFetch(`/api/workshops/${id}/registrations`);
    if (!regs.length) {
      document.getElementById('wsRegsBody').innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No registrations yet.</p>';
      return;
    }
    const seatLabel = { member:'💳 Member', non_member:'🏷️ Non-Member', club:'🎭 Club' };
    const seatColor = { member:'#D1FAE5', non_member:'#FEF3C7', club:'#EDE9FE' };
    const seatText  = { member:'#065F46', non_member:'#92400E', club:'#5B21B6' };
    document.getElementById('wsRegsBody').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>College ID</th><th>Email</th><th>Phone</th>
            <th>Seat Type</th><th>Clubs</th><th>Registered At</th>
          </tr></thead>
          <tbody>
            ${regs.map(r => `<tr>
              <td style="font-weight:500">${r.name}</td>
              <td style="font-size:.83rem">${r.college_id||'—'}</td>
              <td style="font-size:.83rem">${r.email}</td>
              <td style="font-size:.83rem">${r.phone||'—'}</td>
              <td><span style="background:${seatColor[r.seat_type]};color:${seatText[r.seat_type]};padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:600;">${seatLabel[r.seat_type]||r.seat_type}</span></td>
              <td style="font-size:.83rem">${r.clubs||'—'}</td>
              <td style="font-size:.8rem;white-space:nowrap">${new Date(r.registered_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    document.getElementById('wsRegsBody').innerHTML = `<p style="color:var(--error);">Failed: ${e.message}</p>`;
  }
}

// ── CLUBS ──────────────────────────────────────────────────────
let clubs = [];

// Predefined emoji palette for club icons
const CLUB_ICONS = [
  '🎭','🏆','🎵','🎨','📸','📝','✨','🚀',
  '🏀','🎾','⚽','🏓','🏘️','🎸','🎬','🏥',
  '📚','💚','🥋','🌎','🔬','🏋️','🤝','💼',
  '🏃','🊝️','🦋','🌿','🌈','🎤','🪘','🔭'
];

function renderIconPicker(containerId, hiddenInputId, currentIcon) {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;
  hiddenInput.value = currentIcon || '🎭';
  container.innerHTML = CLUB_ICONS.map(emoji => `
    <button type="button" onclick="selectClubIcon(this, '${emoji}', '${hiddenInputId}')"
      style="
        font-size:1.35rem; padding:.3rem .4rem; border-radius:8px; cursor:pointer;
        border: 2px solid ${ emoji === (currentIcon || '🎭') ? 'var(--teal)' : 'transparent' };
        background: ${ emoji === (currentIcon || '🎭') ? 'rgba(30,164,143,.12)' : 'transparent' };
        transition: border .15s, background .15s;
      "
      title="${emoji}"
    >${emoji}</button>
  `).join('');
}

function selectClubIcon(btn, emoji, hiddenInputId) {
  // Deselect all siblings
  Array.from(btn.parentElement.children).forEach(b => {
    b.style.border = '2px solid transparent';
    b.style.background = 'transparent';
  });
  // Highlight selected
  btn.style.border = '2px solid var(--teal)';
  btn.style.background = 'rgba(30,164,143,.12)';
  document.getElementById(hiddenInputId).value = emoji;
}

async function loadClubs() {
  document.getElementById('clubsGrid').innerHTML = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    clubs = await apiFetch('/api/clubs');
    renderClubsGrid();
  } catch(e) { showToast('Error loading clubs: ' + e.message, 'error'); }
}

function renderClubsGrid() {
  const grid = document.getElementById('clubsGrid');
  if (!clubs.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎭</div><h3>No clubs yet</h3><p>Add your first club using the button above.</p></div>';
    return;
  }
  const superAdmin = isSuperAdmin();
  grid.innerHTML = clubs.map(c => `
    <div class="ws-card" style="flex-direction:row;align-items:center;justify-content:space-between;gap:.75rem;transition:box-shadow .15s;">
      <div style="display:flex;align-items:center;gap:.75rem;flex:1;cursor:pointer;" onclick="viewClubMembers(${c.id})" title="Click to view members">
        <span style="font-size:1.5rem;line-height:1;">${c.icon || '🎭'}</span>
        <div>
          <span style="font-weight:600;color:var(--navy);font-size:.95rem;">${c.name}</span>
          <div style="font-size:.75rem;color:var(--teal-dark);margin-top:.1rem;">👥 View members</div>
        </div>
      </div>
      ${superAdmin ? `
      <div style="display:flex;gap:.4rem;">
        <button onclick="openEditClubModal(${c.id})"
          style="background:#e0f2fe;color:#0369a1;border:none;border-radius:8px;padding:.3rem .7rem;font-size:.8rem;cursor:pointer;font-weight:600;transition:background .15s;"
          onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
          ✏️ Edit
        </button>
        <button onclick="deleteClub(${c.id},'${c.name.replace(/'/g, "\\'")}')" 
          style="background:#fee2e2;color:#991b1b;border:none;border-radius:8px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;font-weight:600;transition:background .15s;"
          onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">
          🗑️ Delete
        </button>
      </div>` : ''}
    </div>`).join('');
}

function openAddClubModal() {
  if (!isSuperAdmin()) return showToast('Only Super Admin can manage clubs', 'error');
  document.getElementById('newClubName').value = '';
  document.getElementById('newClubIcon').value = '🎭';
  renderIconPicker('newClubIconPicker', 'newClubIcon', '🎭');
  openModal('addClubModal');
  setTimeout(() => document.getElementById('newClubName').focus(), 100);
}

async function saveNewClub() {
  const name = document.getElementById('newClubName').value.trim();
  const icon = document.getElementById('newClubIcon').value || '🎭';
  if (!name) return showToast('Please enter a club name', 'error');
  try {
    await apiFetch('/api/clubs', { method: 'POST', body: JSON.stringify({ name, icon }) });
    showToast(`${icon} Club "${name}" created!`, 'success');
    closeModal('addClubModal');
    await loadClubs();
    populateClubDropdowns();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

function openEditClubModal(id) {
  if (!isSuperAdmin()) return showToast('Only Super Admin can manage clubs', 'error');
  const club = clubs.find(c => c.id === id);
  if (!club) return;
  document.getElementById('editClubId').value = id;
  document.getElementById('editClubName').value = club.name;
  document.getElementById('editClubIcon').value = club.icon || '🎭';
  renderIconPicker('editClubIconPicker', 'editClubIcon', club.icon || '🎭');
  openModal('editClubModal');
  setTimeout(() => document.getElementById('editClubName').focus(), 100);
}

async function saveEditClub() {
  const id   = document.getElementById('editClubId').value;
  const name = document.getElementById('editClubName').value.trim();
  const icon = document.getElementById('editClubIcon').value || '🎭';
  if (!name) return showToast('Please enter a club name', 'error');
  try {
    await apiFetch(`/api/clubs/${id}`, { method: 'PUT', body: JSON.stringify({ name, icon }) });
    showToast(`${icon} Club updated to "${name}"!`, 'success');
    closeModal('editClubModal');
    await loadClubs();
    populateClubDropdowns();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteClub(id, name) {
  if (!confirm(`Delete club "${name}"? Students currently assigned to this club will keep the value but the option won't appear in forms anymore.`)) return;
  try {
    await apiFetch(`/api/clubs/${id}`, { method: 'DELETE' });
    showToast(`Club "${name}" deleted`, 'success');
    await loadClubs();
    populateClubDropdowns();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── CLUB MEMBERS ────────────────────────────────────────────
let _clubMembersAll = []; // full list from API, used by filters

async function viewClubMembers(clubId) {
  const club = clubs.find(c => c.id === clubId);
  if (!club) return;

  // Set modal header
  document.getElementById('clubMembersIcon').textContent  = club.icon || '🎭';
  document.getElementById('clubMembersTitle').textContent = club.name;
  document.getElementById('clubMembersBadge').textContent = '';
  document.getElementById('clubMembersCount').textContent = '';
  document.getElementById('clubMembersTable').innerHTML   = '<div class="page-loader"><div class="spinner"></div><span>Loading…</span></div>';

  // Reset filters
  document.getElementById('clubMembersSearch').value     = '';
  document.getElementById('clubMembersPayFilter').value  = 'all';
  document.getElementById('clubMembersRoleFilter').value = 'all';

  openModal('clubMembersModal');

  try {
    const data = await apiFetch(`/api/clubs/${clubId}/members`);
    _clubMembersAll = data.members || [];
    document.getElementById('clubMembersBadge').textContent =
      `${_clubMembersAll.length} member${_clubMembersAll.length !== 1 ? 's' : ''} total`;
    renderClubMembersTable(_clubMembersAll);
  } catch(e) {
    document.getElementById('clubMembersTable').innerHTML =
      `<p style="color:var(--error);padding:1rem;">Failed to load members: ${e.message}</p>`;
  }
}

function filterClubMembers() {
  const search  = document.getElementById('clubMembersSearch').value.toLowerCase().trim();
  const payF    = document.getElementById('clubMembersPayFilter').value;
  const roleF   = document.getElementById('clubMembersRoleFilter').value;

  const filtered = _clubMembersAll.filter(m => {
    // Text search
    if (search) {
      const haystack = `${m.name} ${m.college_id || ''} ${m.email} ${m.batch || ''} ${m.department || ''} ${m.phone || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    // Payment filter
    if (payF === 'paid'   && !m.is_paid) return false;
    if (payF === 'unpaid' &&  m.is_paid) return false;
    // Role filter
    if (roleF !== 'all' && m.role !== roleF) return false;
    return true;
  });

  renderClubMembersTable(filtered);
}

function resetClubMembersFilters() {
  document.getElementById('clubMembersSearch').value     = '';
  document.getElementById('clubMembersPayFilter').value  = 'all';
  document.getElementById('clubMembersRoleFilter').value = 'all';
  renderClubMembersTable(_clubMembersAll);
}

function renderClubMembersTable(members) {
  const countEl = document.getElementById('clubMembersCount');
  const tableEl = document.getElementById('clubMembersTable');

  countEl.textContent = `Showing ${members.length} of ${_clubMembersAll.length} member${_clubMembersAll.length !== 1 ? 's' : ''}`;

  if (!members.length) {
    tableEl.innerHTML = `
      <div class="empty-state" style="padding:2rem;">
        <div class="empty-icon">🔍</div>
        <h3>No members found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  const roleLabel = { student: '🎓 Student', pg_student: '📚 RDA / PG', guest: '🙋 Guest', sub_admin: '🛡️ Sub-Admin', super_admin: '⭐ Super Admin' };

  tableEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>College ID</th>
            <th>Email</th>
            <th>Batch</th>
            <th>Department</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Membership Fee</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((m, i) => `
          <tr>
            <td style="color:var(--text-muted);font-size:.82rem;">${i + 1}</td>
            <td style="font-weight:600;color:var(--navy);">${m.name}</td>
            <td style="font-size:.83rem;">${m.college_id || '—'}</td>
            <td style="font-size:.83rem;">${m.email}</td>
            <td style="font-size:.83rem;">${m.batch || '—'}</td>
            <td style="font-size:.83rem;">${m.department || '—'}</td>
            <td style="font-size:.83rem;">${m.phone || '—'}</td>
            <td><span style="font-size:.78rem;">${roleLabel[m.role] || m.role}</span></td>
            <td>
              ${m.is_paid
                ? `<span style="background:#D1FAE5;color:#065F46;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:600;">💳 Paid</span>`
                : `<span style="background:#FEE2E2;color:#991B1B;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:600;">❌ Unpaid</span>`
              }
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Fetch clubs from API and populate all dynamic club UI elements
async function populateClubDropdowns(selectedClubValues = []) {
  try {
    const list = await apiFetch('/api/clubs');
    clubs = list;

    // 1. Student modal checkboxes
    const clubsGroup = document.getElementById('sClubsGroup');
    if (clubsGroup) {
      if (!list.length) {
        clubsGroup.innerHTML = '<span style="font-size:.82rem;color:var(--text-muted);">No clubs configured. Add clubs in the Clubs tab.</span>';
      } else {
        clubsGroup.innerHTML = list.map(c => `
          <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;cursor:pointer;color:var(--navy);">
            <input type="checkbox" value="${c.name}" class="club-cb select-cb" ${selectedClubValues.includes(c.name) ? 'checked' : ''}> ${c.icon || '🎭'} ${c.name}
          </label>`).join('');
      }
    }

    // 2. Workshop modal club dropdown
    const wsClubSelect = document.getElementById('wsClubName');
    if (wsClubSelect) {
      const currentVal = wsClubSelect.value;
      wsClubSelect.innerHTML = '<option value="">— Select a Club —</option>' +
        list.map(c => `<option value="${c.name}" ${currentVal === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
    }
  } catch(e) {
    console.warn('Could not load clubs for dropdowns:', e.message);
  }
}

// Load clubs on page start so dropdowns are ready before modals are opened
populateClubDropdowns();
