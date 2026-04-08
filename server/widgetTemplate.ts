/**
 * widgetTemplate.ts — Generates the self-contained booking widget JavaScript.
 *
 * Served at GET /widget/:businessId.js
 * Embed with: <script src="https://.../widget/BUSINESS_ID.js" async></script>
 */

export function buildWidgetJs(businessId: string, baseUrl: string): string {
  return `
(function() {
  'use strict';

  var BUSINESS_ID = ${JSON.stringify(businessId)};
  var BASE_URL    = ${JSON.stringify(baseUrl)};
  var API_BASE    = BASE_URL + '/api/booking/' + BUSINESS_ID;

  /* ── State ─────────────────────────────────────────────────── */
  var config = null;
  var state = {
    step: 1,
    service: null,
    date: null,
    time: null,
    slots: [],
    slotsLoading: false,
    submitting: false,
    bookingId: null,
    calYear: 0,
    calMonth: 0
  };

  /* ── Fetch config ────────────────────────────────────────────── */
  function init() {
    fetch(API_BASE + '/config')
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        if (!cfg || cfg.error) return;
        config = cfg;
        injectStyles(cfg.accentColor);
        createButton(cfg);
      })
      .catch(function() {});
  }

  /* ── Styles ──────────────────────────────────────────────────── */
  function injectStyles(accent) {
    var css = [
      '#qpw-btn{position:fixed;bottom:24px;right:24px;z-index:2147483647;',
        'background:' + accent + ';color:#fff;border:none;border-radius:50px;',
        'padding:14px 22px;font-size:15px;font-weight:600;cursor:pointer;',
        'box-shadow:0 4px 20px rgba(0,0,0,.25);font-family:system-ui,sans-serif;',
        'transition:transform .15s,box-shadow .15s;}',
      '#qpw-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.3);}',
      '#qpw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;',
        'display:flex;align-items:center;justify-content:center;padding:16px;}',
      '#qpw-modal{background:#fff;border-radius:16px;width:100%;max-width:520px;',
        'max-height:90vh;overflow-y:auto;font-family:system-ui,sans-serif;',
        'box-shadow:0 24px 60px rgba(0,0,0,.3);}',
      '#qpw-header{padding:20px 24px 16px;border-bottom:1px solid #f0f0f0;',
        'display:flex;align-items:center;justify-content:space-between;}',
      '#qpw-header h2{margin:0;font-size:18px;color:#111;}',
      '#qpw-close{background:none;border:none;font-size:22px;cursor:pointer;',
        'color:#999;line-height:1;padding:4px;}',
      '#qpw-steps{display:flex;gap:0;padding:0 24px;margin:16px 0 8px;}',
      '.qpw-step-dot{flex:1;height:4px;border-radius:2px;background:#eee;margin:0 2px;}',
      '.qpw-step-dot.active{background:' + accent + ';}',
      '#qpw-body{padding:20px 24px 24px;}',
      '.qpw-label{font-size:12px;font-weight:600;color:#888;text-transform:uppercase;',
        'letter-spacing:.06em;margin-bottom:10px;}',
      '.qpw-service-card{border:2px solid #eee;border-radius:10px;padding:14px 16px;',
        'cursor:pointer;margin-bottom:10px;transition:border-color .15s;}',
      '.qpw-service-card:hover,.qpw-service-card.selected{border-color:' + accent + ';}',
      '.qpw-service-name{font-weight:600;font-size:15px;color:#111;}',
      '.qpw-service-meta{font-size:13px;color:#888;margin-top:2px;}',
      '.qpw-cal{width:100%;border-collapse:collapse;}',
      '.qpw-cal th{font-size:12px;color:#888;font-weight:600;padding:6px 0;text-align:center;}',
      '.qpw-cal td{text-align:center;padding:4px;}',
      '.qpw-cal-day{width:36px;height:36px;border-radius:50%;border:none;background:none;',
        'font-size:14px;cursor:pointer;transition:background .12s;}',
      '.qpw-cal-day:hover:not(:disabled){background:#f0f0f0;}',
      '.qpw-cal-day.selected{background:' + accent + ';color:#fff;}',
      '.qpw-cal-day:disabled{color:#ccc;cursor:default;}',
      '.qpw-cal-nav{display:flex;align-items:center;justify-content:space-between;',
        'margin-bottom:12px;}',
      '.qpw-cal-nav button{background:none;border:1px solid #ddd;border-radius:6px;',
        'padding:5px 11px;cursor:pointer;font-size:16px;}',
      '.qpw-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}',
      '.qpw-time-btn{border:2px solid #eee;border-radius:8px;padding:10px;',
        'font-size:14px;font-weight:500;cursor:pointer;background:#fff;',
        'transition:border-color .12s,background .12s;}',
      '.qpw-time-btn:hover,.qpw-time-btn.selected{border-color:' + accent + ';',
        'background:' + accent + '1a;}',
      '.qpw-input{width:100%;box-sizing:border-box;border:1px solid #ddd;',
        'border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:12px;',
        'font-family:inherit;outline:none;}',
      '.qpw-input:focus{border-color:' + accent + ';}',
      '.qpw-btn-primary{width:100%;background:' + accent + ';color:#fff;border:none;',
        'border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;',
        'margin-top:8px;font-family:inherit;}',
      '.qpw-btn-primary:disabled{opacity:.6;cursor:default;}',
      '.qpw-back{background:none;border:none;color:#888;font-size:14px;cursor:pointer;',
        'padding:0;margin-bottom:16px;font-family:inherit;}',
      '.qpw-success{text-align:center;padding:24px 0;}',
      '.qpw-success-icon{font-size:48px;margin-bottom:12px;}',
      '.qpw-success h3{font-size:20px;color:#111;margin:0 0 8px;}',
      '.qpw-success p{color:#666;font-size:14px;margin:0;}'
    ].join('');
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── Float button ────────────────────────────────────────────── */
  function createButton(cfg) {
    var btn = document.createElement('button');
    btn.id = 'qpw-btn';
    btn.textContent = 'Book Now';
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  /* ── Modal ──────────────────────────────────────────────────── */
  function openModal() {
    state.step = 1; state.service = null; state.date = null;
    state.time = null; state.bookingId = null;
    var now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();

    var overlay = document.createElement('div');
    overlay.id = 'qpw-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    var modal = document.createElement('div');
    modal.id = 'qpw-modal';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    render(modal);
  }

  function closeModal() {
    var ov = document.getElementById('qpw-overlay');
    if (ov) ov.remove();
  }

  /* ── Render dispatcher ──────────────────────────────────────── */
  function render(modal) {
    modal = modal || document.querySelector('#qpw-modal');
    if (!modal) return;

    var html = renderHeader() + renderSteps();
    if (state.bookingId) {
      html += '<div id="qpw-body">' + renderSuccess() + '</div>';
    } else if (state.step === 1) {
      html += '<div id="qpw-body">' + renderServices() + '</div>';
    } else if (state.step === 2) {
      html += '<div id="qpw-body">' + renderCalendar() + '</div>';
    } else if (state.step === 3) {
      html += '<div id="qpw-body">' + renderTimes() + '</div>';
    } else if (state.step === 4) {
      html += '<div id="qpw-body">' + renderDetails() + '</div>';
    }

    modal.innerHTML = html;
    attachHandlers(modal);
  }

  /* ── Header ──────────────────────────────────────────────────── */
  function renderHeader() {
    return '<div id="qpw-header">' +
      '<h2>' + esc(config.businessName) + '</h2>' +
      '<button id="qpw-close" aria-label="Close">&times;</button>' +
      '</div>';
  }

  function renderSteps() {
    if (state.bookingId) return '';
    var dots = '';
    for (var i = 1; i <= 4; i++) {
      dots += '<div class="qpw-step-dot' + (i <= state.step ? ' active' : '') + '"></div>';
    }
    return '<div id="qpw-steps">' + dots + '</div>';
  }

  /* ── Step 1: Services ───────────────────────────────────────── */
  function renderServices() {
    var services = config.services || [];
    if (!services.length) {
      return '<p style="color:#888;font-size:14px;">No services configured yet.</p>';
    }
    var html = '<div class="qpw-label">Select a service</div>';
    services.forEach(function(svc) {
      var price = svc.priceCents ? ('$' + (svc.priceCents / 100).toFixed(0)) : 'Contact for price';
      var dur = svc.durationHours ? (svc.durationHours + ' hr' + (svc.durationHours !== 1 ? 's' : '')) : '';
      html += '<div class="qpw-service-card' + (state.service && state.service.id === svc.id ? ' selected' : '') +
        '" data-svc-id="' + esc(svc.id) + '">' +
        '<div class="qpw-service-name">' + esc(svc.name) + '</div>' +
        '<div class="qpw-service-meta">' + (dur ? dur + ' · ' : '') + price + '</div>' +
        '</div>';
    });
    return html;
  }

  /* ── Step 2: Calendar ───────────────────────────────────────── */
  function renderCalendar() {
    var year = state.calYear, month = state.calMonth;
    var monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
    var days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date(); today.setHours(0,0,0,0);
    var advanceMs = (config.advanceNoticeHours || 24) * 3600000;
    var minDate = new Date(Date.now() + advanceMs); minDate.setHours(0,0,0,0);
    var availDays = config.availableDays || [1,2,3,4,5];

    var html = '<button class="qpw-back" id="qpw-back">&#8592; Back</button>' +
      '<div class="qpw-label">Select a date</div>' +
      '<div class="qpw-cal-nav">' +
        '<button id="qpw-prev-month">&lsaquo;</button>' +
        '<strong>' + monthNames[month] + ' ' + year + '</strong>' +
        '<button id="qpw-next-month">&rsaquo;</button>' +
      '</div>' +
      '<table class="qpw-cal"><thead><tr>';

    days.forEach(function(d) { html += '<th>' + d + '</th>'; });
    html += '</tr></thead><tbody><tr>';

    for (var i = 0; i < firstDay; i++) html += '<td></td>';
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      if ((firstDay + d2 - 1) % 7 === 0 && d2 > 1) html += '</tr><tr>';
      var cellDate = new Date(year, month, d2);
      var dow = cellDate.getDay();
      var disabled = cellDate < minDate || availDays.indexOf(dow) === -1;
      var dateStr = year + '-' + pad2(month + 1) + '-' + pad2(d2);
      var selected = state.date === dateStr;
      html += '<td><button class="qpw-cal-day' + (selected ? ' selected' : '') + '"' +
        (disabled ? ' disabled' : '') + ' data-date="' + dateStr + '">' + d2 + '</button></td>';
    }
    html += '</tr></tbody></table>';
    return html;
  }

  /* ── Step 3: Time slots ─────────────────────────────────────── */
  function renderTimes() {
    var html = '<button class="qpw-back" id="qpw-back">&#8592; Back</button>' +
      '<div class="qpw-label">Select a time for ' + esc(state.date) + '</div>';
    if (state.slotsLoading) {
      html += '<p style="color:#888;font-size:14px;">Loading available times&hellip;</p>';
      return html;
    }
    if (!state.slots.length) {
      html += '<p style="color:#888;font-size:14px;">No available times for this date.</p>';
      return html;
    }
    html += '<div class="qpw-time-grid">';
    state.slots.forEach(function(sl) {
      html += '<button class="qpw-time-btn' + (state.time === sl.value ? ' selected' : '') +
        '" data-time="' + esc(sl.value) + '">' + esc(sl.label) + '</button>';
    });
    html += '</div>';
    return html;
  }

  /* ── Step 4: Details form ───────────────────────────────────── */
  function renderDetails() {
    return '<button class="qpw-back" id="qpw-back">&#8592; Back</button>' +
      '<div class="qpw-label">Your details</div>' +
      '<input class="qpw-input" id="qpw-name" type="text" placeholder="Full name *" />' +
      '<input class="qpw-input" id="qpw-email" type="email" placeholder="Email address *" />' +
      '<input class="qpw-input" id="qpw-phone" type="tel" placeholder="Phone number" />' +
      '<input class="qpw-input" id="qpw-address" type="text" placeholder="Service address" />' +
      '<textarea class="qpw-input" id="qpw-notes" rows="2" placeholder="Any notes?"></textarea>' +
      '<button class="qpw-btn-primary" id="qpw-submit"' +
        (state.submitting ? ' disabled' : '') + '>' +
        (state.submitting ? 'Sending&hellip;' : 'Request Booking') +
      '</button>';
  }

  /* ── Success ─────────────────────────────────────────────────── */
  function renderSuccess() {
    return '<div class="qpw-success">' +
      '<div class="qpw-success-icon">&#10003;</div>' +
      '<h3>Request Sent!</h3>' +
      '<p>We\'ll confirm your appointment within 24 hours.<br>Reference: <strong>' +
      esc(state.bookingId) + '</strong></p>' +
      '<button class="qpw-btn-primary" id="qpw-done" style="margin-top:20px;">Done</button>' +
      '</div>';
  }

  /* ── Event handlers ─────────────────────────────────────────── */
  function attachHandlers(modal) {
    var closeBtn = modal.querySelector('#qpw-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var doneBtn = modal.querySelector('#qpw-done');
    if (doneBtn) doneBtn.addEventListener('click', closeModal);

    var backBtn = modal.querySelector('#qpw-back');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        state.step = Math.max(1, state.step - 1);
        render();
      });
    }

    // Service cards
    modal.querySelectorAll('.qpw-service-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = card.getAttribute('data-svc-id');
        state.service = config.services.find(function(s) { return s.id === id; });
        state.step = 2;
        render();
      });
    });

    // Calendar nav
    var prevBtn = modal.querySelector('#qpw-prev-month');
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (state.calMonth === 0) { state.calMonth = 11; state.calYear--; }
        else { state.calMonth--; }
        render();
      });
    }
    var nextBtn = modal.querySelector('#qpw-next-month');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (state.calMonth === 11) { state.calMonth = 0; state.calYear++; }
        else { state.calMonth++; }
        render();
      });
    }

    // Calendar days
    modal.querySelectorAll('.qpw-cal-day:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.date = btn.getAttribute('data-date');
        state.time = null;
        state.step = 3;
        state.slots = [];
        state.slotsLoading = true;
        render();
        fetch(API_BASE + '/availability?date=' + state.date)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            state.slots = data.slots || [];
            state.slotsLoading = false;
            render();
          })
          .catch(function() {
            state.slots = [];
            state.slotsLoading = false;
            render();
          });
      });
    });

    // Time buttons
    modal.querySelectorAll('.qpw-time-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.time = btn.getAttribute('data-time');
        state.step = 4;
        render();
      });
    });

    // Submit
    var submitBtn = modal.querySelector('#qpw-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        var name = (modal.querySelector('#qpw-name').value || '').trim();
        var email = (modal.querySelector('#qpw-email').value || '').trim();
        var phone = (modal.querySelector('#qpw-phone').value || '').trim();
        var address = (modal.querySelector('#qpw-address').value || '').trim();
        var notes = (modal.querySelector('#qpw-notes').value || '').trim();
        if (!name || !email) {
          alert('Please enter your name and email.');
          return;
        }
        state.submitting = true;
        render();
        fetch(API_BASE + '/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            serviceId: state.service ? state.service.id : null,
            preferredDate: state.date,
            preferredTime: state.time,
            address: address,
            notes: notes
          })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          state.submitting = false;
          if (data.bookingId) {
            state.bookingId = data.bookingId;
            render();
          } else {
            alert(data.error || 'Something went wrong. Please try again.');
            render();
          }
        })
        .catch(function() {
          state.submitting = false;
          alert('Network error. Please try again.');
          render();
        });
      });
    }
  }

  /* ── Utilities ──────────────────────────────────────────────── */
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ── Boot ─────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
