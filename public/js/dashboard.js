if (!requireAuth()) { /* redirected */ }

const user = getUser();
document.getElementById('navName').textContent = user?.name || '';
renderNavAvatar(user || {});

let allEvents = [], allMOMs = [];

// Switch tabs
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab${tab === 'events' ? 'Events' : 'MOM'}`).classList.add('active');
  document.getElementById(`panel${tab === 'events' ? 'Events' : 'MOM'}`).classList.add('active');
}

// Render events
function renderEvents() {
  const q = (document.getElementById('eventSearch')?.value || '').toLowerCase();
  const filtered = allEvents.filter(e =>
    e.title.toLowerCase().includes(q) ||
    (e.venue || '').toLowerCase().includes(q) ||
    (e.description || '').toLowerCase().includes(q)
  );
  const grid = document.getElementById('eventsGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📅</div><h3>No events found</h3><p>Try a different search term.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(ev => {
    const d = new Date(ev.event_date + 'T00:00:00');
    const day   = isNaN(d) ? '--' : d.getDate();
    const month = isNaN(d) ? '' : d.toLocaleString('default',{month:'short'}).toUpperCase();
    return `<div class="event-card animate-in">
      <div class="event-card-top">
        <div class="event-day-box"><div class="event-day">${day}</div><div class="event-month">${month}</div></div>
        <div>
          <div class="event-card-title">${ev.title}</div>
          <div class="event-card-venue">📍 ${ev.venue || 'Venue TBD'}</div>
        </div>
      </div>
      <div class="event-card-body">
        <p class="event-card-desc">${ev.description || 'No description available.'}</p>
        <div class="event-meta">
          <span class="event-meta-item">📅 ${ev.event_date || 'Date TBD'}</span>
          <span class="event-meta-item">🕐 ${ev.event_time || 'Time TBD'}</span>
          ${ev.created_by_name ? `<span class="event-meta-item">👤 By ${ev.created_by_name}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// Render MOMs
function renderMOMs() {
  const q = (document.getElementById('momSearch')?.value || '').toLowerCase();
  const filtered = allMOMs.filter(m =>
    m.title.toLowerCase().includes(q) ||
    (m.agenda || '').toLowerCase().includes(q) ||
    (m.notes || '').toLowerCase().includes(q)
  );
  const list = document.getElementById('momList');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><h3>No MOM records found</h3><p>Try a different search term.</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(m => {
    let attendees = [];
    let actions = [];
    try { attendees = JSON.parse(m.attendees || '[]'); } catch {}
    try { actions = JSON.parse(m.action_items || '[]'); } catch {}
    return `<div class="mom-card animate-in">
      <div class="mom-card-header">
        <div class="mom-card-title">${m.title}</div>
        <div class="mom-date-badge">📅 ${m.meeting_date || 'Date TBD'}</div>
      </div>
      <div class="mom-card-body">
        ${m.agenda ? `<div class="mom-section">
          <div class="mom-section-label">Agenda</div>
          <div class="mom-section-text">${m.agenda}</div>
        </div>` : ''}
        ${attendees.length ? `<div class="mom-section">
          <div class="mom-section-label">Attendees (${attendees.length})</div>
          <div class="mom-attendees">${attendees.map(a => `<span class="attendee-chip">👤 ${a}</span>`).join('')}</div>
        </div>` : ''}
        ${m.notes ? `<div class="mom-section">
          <div class="mom-section-label">Meeting Notes</div>
          <div class="mom-section-text">${m.notes}</div>
        </div>` : ''}
        ${actions.length ? `<div class="mom-section">
          <div class="mom-section-label">Action Items</div>
          ${actions.map(a => `<div class="action-item"><span class="action-bullet">→</span><span>${a}</span></div>`).join('')}
        </div>` : ''}
        ${m.created_by_name ? `<div class="text-muted mt-1" style="font-size:.75rem">Recorded by: ${m.created_by_name}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function loadDashboard() {
  try {
    [allEvents, allMOMs] = await Promise.all([apiFetch('/api/events'), apiFetch('/api/mom')]);
    renderEvents();
    renderMOMs();
    // If URL has ?tab=mom, switch tab
    if (new URLSearchParams(location.search).get('tab') === 'mom') switchTab('mom');
  } catch (err) {
    showToast('Failed to load: ' + err.message, 'error');
  }
}

loadDashboard();
