if (!requireAuth()) { /* redirected */ }

const user = getUser();
document.getElementById('navName').textContent = user?.name || '';
renderNavAvatar(user || {});

let allEvents = [], allDocuments = [], myRegistrations = [];

// Switch tabs
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const tabName = tab === 'events' ? 'Events' : tab === 'registration' ? 'Registration' : 'Documents';
  document.getElementById(`tab${tabName}`).classList.add('active');
  document.getElementById(`panel${tabName}`).classList.add('active');
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

// Render Documents
function renderDocuments() {
  const q = (document.getElementById('docSearch')?.value || '').toLowerCase();
  const category = document.getElementById('docCategoryFilter')?.value || 'All';
  const filtered = allDocuments.filter(d =>
    (category === 'All' || d.category === category) &&
    (d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
  );
  const list = document.getElementById('documentsList');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><h3>No documents found</h3><p>Try a different search term or category.</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(d => `
    <div class="mom-card animate-in">
      <div class="mom-card-header">
        <div class="mom-card-title">📄 ${d.title}</div>
        <div class="mom-date-badge" style="background:var(--teal-pale);color:var(--teal-dark);">${d.category}</div>
      </div>
      <div class="mom-card-body">
        ${d.description ? `<div class="mom-section-text" style="margin-bottom:1rem;">${d.description}</div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <a href="${d.file_path}" target="_blank" class="btn btn-primary btn-sm" download>⬇️ Download File</a>
          ${d.created_by_name ? `<span class="text-muted" style="font-size:.75rem">Uploaded by: ${d.created_by_name} · ${new Date(d.created_at).toLocaleDateString('en-IN')}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Render Registrations
function renderRegistrations() {
  const q = (document.getElementById('regSearch')?.value || '').toLowerCase();
  const filtered = allEvents.filter(e =>
    e.title.toLowerCase().includes(q) ||
    (e.venue || '').toLowerCase().includes(q)
  );
  const grid = document.getElementById('regGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎫</div><h3>No events found</h3><p>Try a different search term.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(ev => {
    const reg = myRegistrations.find(r => r.event_id === ev.id);
    const d = new Date(ev.event_date + 'T00:00:00');
    const day   = isNaN(d) ? '--' : d.getDate();
    const month = isNaN(d) ? '' : d.toLocaleString('default',{month:'short'}).toUpperCase();
    
    let actionHTML = '';
    if (reg) {
      actionHTML = `
        <div style="margin-top:1rem; background:rgba(0,150,136,0.1); padding:1rem; border-radius:8px; text-align:center;">
          <h4 style="margin-top:0; color:var(--teal); font-size:0.9rem;">You are registered</h4>
          <button class="btn btn-secondary btn-sm" onclick="viewRegistrationQR('${reg.qr_code}', '${ev.title.replace(/'/g,"\\'")}')">View QR Code</button>
        </div>
      `;
    } else {
      actionHTML = `
        <div style="margin-top:1rem; border-top:1px solid var(--border-light); padding-top:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span style="font-size:0.85rem; color:var(--text-secondary)">Registration Fee:</span>
            <span style="font-weight:bold;">₹${ev.fee || 0}</span>
          </div>
          <button class="btn btn-primary w-full" onclick="registerForEvent(${ev.id}, ${ev.fee || 0})">Register Now</button>
        </div>
      `;
    }

    return `<div class="event-card animate-in">
      <div class="event-card-top">
        <div class="event-day-box"><div class="event-day">${day}</div><div class="event-month">${month}</div></div>
        <div>
          <div class="event-card-title">${ev.title}</div>
          <div class="event-card-venue">📍 ${ev.venue || 'Venue TBD'}</div>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-meta" style="margin-top:0; padding-top:0; border-top:none;">
          <span class="event-meta-item">📅 ${ev.event_date || 'Date TBD'}</span>
          <span class="event-meta-item">🕐 ${ev.event_time || 'Time TBD'}</span>
        </div>
        ${actionHTML}
      </div>
    </div>`;
  }).join('');
}

async function registerForEvent(eventId, fee) {
  if (!confirm(`Are you sure you want to register for this event? Fee: ₹${fee}`)) return;
  try {
    const orderData = await apiFetch(`/api/registrations/${eventId}/create-order`, { method: 'POST' });
    
    // If it's a free event, it registers instantly without payment gateway
    if (orderData.is_free) {
      showToast('Successfully registered!', 'success');
      loadDashboard();
      return;
    }

    if (!window.Razorpay) {
      throw new Error("Razorpay SDK not loaded");
    }

    // Initialize Razorpay
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "AMSAM",
      description: "Event Registration",
      order_id: orderData.orderId,
      handler: async function (response) {
        try {
          await apiFetch(`/api/registrations/${eventId}/verify-payment`, {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          showToast('Payment successful! You are now registered.', 'success');
          loadDashboard();
        } catch (err) {
          showToast('Payment verification failed: ' + err.message, 'error');
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || ''
      },
      theme: {
        color: "#009688"
      }
    };
    
    const rzp1 = new Razorpay(options);
    rzp1.on('payment.failed', function (response){
      showToast('Payment failed! ' + response.error.description, 'error');
    });
    rzp1.open();
  } catch (err) {
    showToast('Registration failed: ' + err.message, 'error');
  }
}

function viewRegistrationQR(qrCode, eventTitle) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;
  
  // Create modal dynamically
  const modalHTML = `
    <div class="modal-overlay open" id="qrModal" onclick="if(event.target===this) this.remove()">
      <div class="modal" style="text-align:center;">
        <div class="modal-header">
          <h3 class="modal-title">${eventTitle}</h3>
          <button class="modal-close" onclick="document.getElementById('qrModal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-muted mb-2">Show this QR code at the event for admission</p>
          <img src="${qrUrl}" alt="Event QR Code" style="width:200px; height:200px; margin:0 auto; display:block; border:1px solid #eee; border-radius:8px; padding:10px; background:#fff;" />
        </div>
        <div class="modal-footer" style="justify-content:center;">
          <button class="btn btn-primary" onclick="document.getElementById('qrModal').remove()">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function loadDashboard() {
  try {
    [allEvents, allDocuments, myRegistrations] = await Promise.all([
      apiFetch('/api/events'), 
      apiFetch('/api/documents'),
      apiFetch('/api/registrations/my-registrations')
    ]);
    renderEvents();
    renderDocuments();
    renderRegistrations();
    // If URL has ?tab=documents, switch tab
    if (new URLSearchParams(location.search).get('tab') === 'documents') switchTab('documents');
  } catch (err) {
    showToast('Failed to load: ' + err.message, 'error');
  }
}

loadDashboard();
