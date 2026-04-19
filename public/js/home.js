if (!requireAuth()) { /* redirected */ }

const user = getUser();
document.getElementById('heroName').textContent  = user?.name?.split(' ')[0] || 'Student';
document.getElementById('navName').textContent   = user?.name || '';
renderNavAvatar(user || {});

async function loadHome() {
  try {
    const [events, moms] = await Promise.all([
      apiFetch('/api/events'),
      apiFetch('/api/mom')
    ]);

    // Stats
    document.getElementById('statEvents').textContent  = events.length;
    document.getElementById('statMOM').textContent     = moms.length;

    // Upcoming events (next 3)
    const now = new Date().toISOString().split('T')[0];
    const upcoming = events
      .filter(e => e.event_date >= now)
      .sort((a,b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 3);

    const container = document.getElementById('upcomingEvents');
    if (!upcoming.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><h3>No upcoming events</h3><p>Check back soon!</p></div>`;
      return;
    }
    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem;">
      ${upcoming.map(ev => {
        const d = new Date(ev.event_date + 'T00:00:00');
        const day   = d.getDate();
        const month = d.toLocaleString('default',{month:'short'}).toUpperCase();
        return `<a href="/dashboard.html" class="event-preview">
          <div class="event-date-box"><div class="event-date-day">${day}</div><div class="event-date-month">${month}</div></div>
          <div class="event-info">
            <h4>${ev.title}</h4>
            <p>📍 ${ev.venue || 'TBD'} &nbsp;|&nbsp; 🕐 ${ev.event_time || 'TBD'}</p>
          </div>
        </a>`;
      }).join('')}
    </div>`;
  } catch (err) {
    showToast('Failed to load data: ' + err.message, 'error');
  }
}

loadHome();
