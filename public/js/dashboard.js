if (!requireAuth()) { /* redirected */ }

let user = getUser();
if (user && user.role === 'guest') {
  window.location.href = '/guest-dashboard.html';
}

document.getElementById('navName').textContent = user?.name || '';
renderNavAvatar(user || {});

// Show Admin Panel button for sub-admins and super-admins
if (isAdmin()) {
  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) adminBtn.style.display = 'inline';
}

let allEvents = [], allDocuments = [], myRegistrations = [], allWorkshops = [], myWorkshopRegs = [];

// Switch tabs
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const capMap = { events:'Events', registration:'Registration', documents:'Documents', workshops:'Workshops' };
  const name = capMap[tab] || (tab.charAt(0).toUpperCase()+tab.slice(1));
  document.getElementById(`tab${name}`)?.classList.add('active');
  document.getElementById(`panel${name}`)?.classList.add('active');
  if (tab === 'workshops') renderWorkshops();
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
      const isMember = user && user.is_paid == 1;
      const memberFee    = (ev.fee_member !== undefined && ev.fee_member !== null) ? ev.fee_member : 0;
      const nonMemberFee = ev.fee || 0;
      
      let applicableFee = nonMemberFee;
      let feeReason = '';
      let clubFeeRows = '';
      
      let cFees = [];
      try { if (ev.club_fees) cFees = typeof ev.club_fees === 'string' ? JSON.parse(ev.club_fees) : ev.club_fees; } catch(err) {}
      
      const userClubs = user && user.clubs ? user.clubs.split(',').map(c => c.trim().toLowerCase()) : [];
      let matchedClubFee = null;
      let matchedClubName = '';
      
      if (Array.isArray(cFees) && cFees.length > 0) {
        clubFeeRows = cFees.map(cf => `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;">
            <span style="font-size:.78rem;color:#5B21B6;font-weight:600;">🎭 ${cf.club} Club Fee:</span>
            <span style="font-weight:700;color:#5B21B6;">${cf.fee === 0 ? 'FREE' : '\u20b9' + cf.fee}</span>
          </div>`).join('');
        
        const match = cFees.find(cf => cf.club && userClubs.includes(cf.club.trim().toLowerCase()));
        if (match) {
          matchedClubFee = match.fee !== undefined && match.fee !== null ? parseInt(match.fee) : 0;
          matchedClubName = match.club;
        }
      }

      if (isMember) {
        applicableFee = memberFee;
        feeReason = ' (Paid Member)';
      } else if (matchedClubFee !== null) {
        applicableFee = matchedClubFee;
        feeReason = ` (${matchedClubName} Club Member)`;
      }

      const feeRowMember = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;">
          <span style="font-size:.78rem;color:var(--teal);font-weight:600;">💳 Member Fee:</span>
          <span style="font-weight:700;color:var(--teal);">${memberFee === 0 ? 'FREE' : '\u20b9' + memberFee}</span>
        </div>`;
      const feeRowNonMember = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
          <span style="font-size:.78rem;color:var(--teal);font-weight:600;">🏷️ Non-Member Fee:</span>
          <span style="font-weight:700;color:var(--teal);">${nonMemberFee === 0 ? 'FREE' : '\u20b9' + nonMemberFee}</span>
        </div>`;
      const yourFeeRow = `
        <div style="background:rgba(0,150,136,.08);border-radius:6px;padding:.5rem .75rem;margin-bottom:.5rem;text-align:center;font-size:.8rem;font-weight:600;color:var(--teal-dark)">
          ✅ Your price: ${applicableFee === 0 ? 'FREE' : '\u20b9' + applicableFee}${feeReason}
        </div>`;

      actionHTML = `
        <div style="margin-top:1rem; border-top:1px solid var(--border-light); padding-top:1rem;">
          ${feeRowMember}${clubFeeRows}${feeRowNonMember}${yourFeeRow}
          <button class="btn btn-primary w-full" onclick="registerForEvent(${ev.id}, ${applicableFee})">Register Now</button>
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
    const freshUser = await apiFetch('/api/auth/me');
    if (freshUser) { user = { ...user, ...freshUser }; saveUser(user); }

    [allEvents, allDocuments, myRegistrations, allWorkshops, myWorkshopRegs] = await Promise.all([
      apiFetch('/api/events'),
      apiFetch('/api/documents'),
      apiFetch('/api/registrations/my-registrations'),
      apiFetch('/api/workshops'),
      apiFetch('/api/workshops/my/registrations')
    ]);
    renderEvents();
    renderDocuments();
    renderRegistrations();
    renderWorkshops();
    if (new URLSearchParams(location.search).get('tab') === 'documents') switchTab('documents');
    if (new URLSearchParams(location.search).get('tab') === 'mom') switchTab('documents');
  } catch (err) {
    showToast('Failed to load: ' + err.message, 'error');
  }
}

function renderWorkshops() {
  const grid = document.getElementById('wsGrid');
  if (!grid) return;
  if (!allWorkshops.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔬</div><h3>No workshops available</h3><p>Workshops will appear here when the admin creates them.</p></div>`;
    return;
  }

  const isMember = user && user.is_paid == 1;
  const userClubs = user && user.clubs ? user.clubs.split(',').map(c => c.trim().toLowerCase()) : [];

  grid.innerHTML = allWorkshops.map(w => {
    const myReg = myWorkshopRegs.find(r => r.workshop_id === w.id);
    const workshopClub = w.club_name ? w.club_name.trim().toLowerCase() : '';
    const isClubMember = workshopClub && userClubs.includes(workshopClub);

    const memberFull    = w.seats_member     > 0 && w.member_registered     >= w.seats_member;
    const nonMemberFull = w.seats_non_member > 0 && w.non_member_registered >= w.seats_non_member;
    const clubFull      = w.seats_club       > 0 && w.club_registered       >= w.seats_club;

    // Determine if the user can register
    let canRegister = true, seatMsg = '';
    // Also compute the resolved seat & fee for button label
    let resolvedSeat = { seatType: 'non_member', fee: w.fee_non_member || 0 };
    if (isMember) {
      resolvedSeat = { seatType: 'member', fee: w.fee_member || 0 };
      if (memberFull && w.seats_member > 0) { canRegister = false; seatMsg = 'Member seats are full'; }
    } else if (isClubMember) {
      resolvedSeat = { seatType: 'club', fee: w.fee_club || 0 };
      if (clubFull && w.seats_club > 0) { canRegister = false; seatMsg = 'Club seats are full'; }
    } else {
      if (nonMemberFull && w.seats_non_member > 0) { canRegister = false; seatMsg = 'Non-member seats are full'; }
    }

    function chip(label, cls, used, total) {
      if (total === 0) return '';
      const full = used >= total;
      return `<span class="ws-seat-chip ws-seat-${cls}${full?' ws-seat-full':''}">` +
        `${label}: ${used}/${total}${full?' (Full)':''}</span>`;
    }

    let actionHTML;
    if (myReg) {
      actionHTML = `<div style="background:var(--teal-pale);padding:.75rem;border-radius:8px;text-align:center;">
        <div style="font-size:.88rem;font-weight:600;color:var(--teal-dark);">✅ Registered</div>
      </div>`;
    } else if (!canRegister) {
      actionHTML = `<div style="background:#FEE2E2;padding:.75rem;border-radius:8px;text-align:center;font-size:.85rem;color:#991B1B;font-weight:600;">🚫 ${seatMsg}</div>`;
    } else {
      actionHTML = `<button class="btn btn-primary w-full" onclick="registerForWorkshop(${w.id}, ${resolvedSeat.fee})">${resolvedSeat.fee > 0 ? `Register & Pay ₹${resolvedSeat.fee}` : 'Register Now (Free)'}</button>`;
    }

    return `<div class="ws-dash-card animate-in">
      <div class="ws-dash-top">
        <div class="ws-dash-title">🔬 ${w.title}</div>
        <div class="ws-dash-meta">
          ${(() => {
            if (w.workshop_date && w.workshop_to_date && w.workshop_date !== w.workshop_to_date) {
              const d1 = new Date(w.workshop_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
              const d2 = new Date(w.workshop_to_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
              return `📅 ${d1} - ${d2}`;
            } else if (w.workshop_date) {
              return `📅 ${new Date(w.workshop_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`;
            }
            return '';
          })()}
          ${w.workshop_time ? ` &nbsp;⏰ ${w.workshop_time}` : ''}
          ${w.venue ? ` &nbsp;📍 ${w.venue}` : ''}
        </div>
      </div>
      <div class="ws-dash-body">
        ${w.description ? `<p style="font-size:.87rem;color:var(--text-secondary);line-height:1.6;margin:0;margin-bottom:.5rem;">${w.description}</p>` : ''}
        ${actionHTML}
      </div>
    </div>`;
  }).join('');
}

async function registerForWorkshop(wsId, fee) {
  const feeDisplay = fee > 0 ? `₹${fee}` : 'Free';
  if (!confirm(`Register for this workshop?\nFee: ${feeDisplay}`)) return;
  try {
    const orderData = await apiFetch(`/api/workshops/${wsId}/create-order`, { method: 'POST' });

    // Free workshop — registered directly
    if (orderData.is_free) {
      showToast('✅ Registered for workshop!', 'success');
      loadDashboard();
      return;
    }

    if (!window.Razorpay) throw new Error('Razorpay SDK not loaded');

    const options = {
      key:         orderData.keyId,
      amount:      orderData.amount,
      currency:    orderData.currency,
      name:        'AMSAM',
      description: 'Workshop Registration',
      order_id:    orderData.orderId,
      handler: async function(response) {
        try {
          await apiFetch(`/api/workshops/${wsId}/verify-payment`, {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              seat_type:          orderData.seatType
            })
          });
          showToast('✅ Payment successful! You are registered.', 'success');
          loadDashboard();
        } catch(err) {
          showToast('Payment verification failed: ' + err.message, 'error');
        }
      },
      prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
      theme:   { color: '#6D28D9' }
    };
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', r => showToast('Payment failed: ' + r.error.description, 'error'));
    rzp.open();
  } catch(e) {
    showToast('Registration failed: ' + e.message, 'error');
  }
}

loadDashboard();
