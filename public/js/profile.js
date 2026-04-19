if (!requireAuth()) { /* redirected */ }

const u = getUser();
document.getElementById('navName').textContent = u?.name || '';
renderNavAvatar(u || {});

async function loadProfile() {
  try {
    const profile = await apiFetch('/api/auth/me');

    // Render left profile card
    const photoHTML = profile.photo_path
      ? `<img src="${profile.photo_path}" alt="${profile.name}" class="profile-photo"/>`
      : `<div class="profile-initials">${profile.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>`;

    document.getElementById('profileCard').innerHTML = `
      <div class="profile-card-top">
        <div class="profile-photo-wrap">${photoHTML}</div>
        <div class="profile-name">${profile.name}</div>
        <div class="profile-clgid">${profile.college_id}</div>
      </div>
      <div class="profile-card-body">
        <div class="profile-info-row">
          <span class="info-icon">✉️</span>
          <div><div class="info-label">Email</div><div class="info-value">${profile.email}</div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">🎓</span>
          <div><div class="info-label">College ID</div><div class="info-value">${profile.college_id}</div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">🏥</span>
          <div><div class="info-label">Department</div><div class="info-value">${profile.department || '—'}</div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">📅</span>
          <div><div class="info-label">Batch</div><div class="info-value">${profile.batch || '—'}</div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">📞</span>
          <div><div class="info-label">Phone</div><div class="info-value">${profile.phone || '—'}</div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">👤</span>
          <div><div class="info-label">Role</div><div class="info-value"><span class="badge badge-student">Student Member</span></div></div>
        </div>
        <div class="profile-info-row">
          <span class="info-icon">🗓️</span>
          <div><div class="info-label">Member Since</div><div class="info-value">${new Date(profile.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</div></div>
        </div>
      </div>`;

    // Populate membership card
    document.getElementById('mcName').textContent    = profile.name;
    document.getElementById('mcCollegeId').innerHTML = `🎓 ${profile.college_id}`;
    document.getElementById('mcDept').innerHTML      = `🏥 ${profile.department || 'MBBS'}`;
    document.getElementById('mcBatch').innerHTML     = `📅 Batch ${profile.batch || '—'}`;
    document.getElementById('mcEmail').innerHTML     = `✉️ ${profile.email}`;
    document.getElementById('mcSince').textContent   = `Member since ${new Date(profile.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'short'})}`;

    // Load QR code
    const qrData = await apiFetch(`/api/verify/${profile.id}/qr`);
    document.getElementById('mcQR').innerHTML = `<img src="${qrData.qr}" alt="QR Code" style="width:100px;height:100px;"/>`;

    // Update nav avatar with fresh photo
    renderNavAvatar(profile);

    // Scroll to change password if hash present
    if (location.hash === '#changePassword') {
      document.getElementById('changePassword').scrollIntoView({ behavior:'smooth' });
    }

  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'error');
  }
}

// Download membership card as image using canvas
async function downloadCard() {
  const card = document.getElementById('membershipCard');
  try {
    // Dynamically load html2canvas if not present
    if (!window.html2canvas) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    document.getElementById('dlBtn').innerHTML = '⏳ Generating…';
    const canvas = await html2canvas(card, { scale:2, backgroundColor:null, logging:false });
    const link = document.createElement('a');
    link.download = `AMSAM_Card_${getUser()?.name?.replace(/\s+/g,'_') || 'member'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    document.getElementById('dlBtn').innerHTML = '⬇️ Download';
    showToast('Membership card downloaded!', 'success');
  } catch(e) {
    showToast('Download failed: ' + e.message, 'error');
    document.getElementById('dlBtn').innerHTML = '⬇️ Download';
  }
}

// Change password
document.getElementById('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('pwStatus');
  status.className = 'pw-status';
  const btn = document.getElementById('pwBtn');
  const np  = document.getElementById('newPwd').value;
  const cp  = document.getElementById('confirmPwd').value;
  if (np !== cp) {
    status.textContent = '❌ New passwords do not match.';
    status.classList.add('error');
    return;
  }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Updating…';
  try {
    await apiFetch('/api/auth/change-password', {
      method:'POST',
      body: JSON.stringify({ currentPassword: document.getElementById('currentPwd').value, newPassword: np })
    });
    status.textContent = '✅ Password changed successfully!';
    status.classList.add('success');
    e.target.reset();
    showToast('Password updated!', 'success');
  } catch(err) {
    status.textContent = '❌ ' + err.message;
    status.classList.add('error');
  } finally {
    btn.disabled = false; btn.innerHTML = 'Update Password';
  }
});

loadProfile();
