// assets/js/my-membership.js
// Membership page: load plans from BE + allow user to choose plans
console.log('CURRENT USER', JSON.parse(localStorage.getItem('user') || 'null'));

import { apiGet, apiPost } from './api.js';

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) return;

  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2500">
      <div class="d-flex">
        <div class="toast-body">
          <div class="fw-semibold">${esc(title)}</div>
          <div class="small">${esc(body)}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `,
  );

  const el = document.getElementById(id);
  // eslint-disable-next-line no-undef
  const t = new bootstrap.Toast(el);
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ====== Helpers for text ======

// 60000 -> "60.000đ / month"
function formatPriceVnd(price) {
  if (!price) return 'Free';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ / month';
}

// 182 -> "6 months", 365 -> "1 year", else "xx days"
function formatDurationLabel(days) {
  if (!days) return '—';
  if (days % 365 === 0) return `${days / 365} year(s)`;
  if (days % 30 === 0 && days >= 30) return `${days / 30} month(s)`;
  return `${days} day(s)`;
}

// Enrich plans for UI
function enrichPlans(rawPlans) {
  if (!Array.isArray(rawPlans)) return [];

  const maxPrice = rawPlans.reduce((max, p) => (p.price > max ? p.price : max), 0);

  return rawPlans.map((p) => {
    const durationLabel = formatDurationLabel(p.durationDays);

    let bestFor = 'Good for your reading needs.';
    if (p.maxBooks <= 3) bestFor = 'Perfect for new or occasional readers.';
    else if (p.maxBooks <= 5) bestFor = 'Great for regular weekly readers.';
    else bestFor = 'Ideal for heavy readers or families.';

    const basePrice = p.price || 0;
    const currentPrice = p.discountedPrice != null ? p.discountedPrice : basePrice;
    const isPromo = !!p.isPromo && currentPrice < basePrice;

    const features = [
      `Borrow up to ${p.maxBooks} book(s) in ${durationLabel}.`,
      'Applies to most regular titles.',
      'You can upgrade or change plan later.',
    ];

    // Special note for Basic (id = 1)
    if (p.id === 1) {
      features.push(
        'If this is your first time on Basic, you get 20% off when upgrading to higher plans while it is active.',
      );
    }

    return {
      ...p,
      bestFor,
      features,
      highlight: basePrice === maxPrice && maxPrice > 0,
      priceLabel: formatPriceVnd(currentPrice),
      originalPriceLabel: isPromo ? formatPriceVnd(basePrice) : null,
      isPromo,
      durationLabel,
      requiresPayment: currentPrice > 0,
    };
  });
}

// ====== Current plan UI ======

let membershipPollTimer = null;

function clearMembershipPoll() {
  if (membershipPollTimer) {
    clearInterval(membershipPollTimer);
    membershipPollTimer = null;
  }
}

function setGuestCurrentPlan() {
  const nameEl = document.getElementById('currentPlanName');
  const badgeEl = document.getElementById('currentPlanBadge');
  const descEl = document.getElementById('currentPlanDesc');
  const maxBooksEl = document.getElementById('currentPlanMaxBooks');
  const loanDaysEl = document.getElementById('currentPlanLoanDays');

  if (!nameEl || !badgeEl || !descEl || !maxBooksEl || !loanDaysEl) return;

  nameEl.textContent = 'Guest';
  badgeEl.textContent = 'Not signed in';
  descEl.textContent = 'Sign in to choose a membership plan and increase your borrowing limit.';
  maxBooksEl.textContent = '—';
  loanDaysEl.textContent = '—';
}

function setCurrentPlan(plan) {
  const nameEl = document.getElementById('currentPlanName');
  const badgeEl = document.getElementById('currentPlanBadge');
  const descEl = document.getElementById('currentPlanDesc');
  const maxBooksEl = document.getElementById('currentPlanMaxBooks');
  const loanDaysEl = document.getElementById('currentPlanLoanDays');

  if (!nameEl || !badgeEl || !descEl || !maxBooksEl || !loanDaysEl) return;

  if (!plan) {
    nameEl.textContent = 'No active plan';
    badgeEl.textContent = 'No plan';
    descEl.textContent =
      'You are using the default borrowing limit. Choose a plan to increase your limit.';
    maxBooksEl.textContent = '—';
    loanDaysEl.textContent = '—';
    return;
  }

  nameEl.textContent = plan.name;
  badgeEl.textContent = 'Active';
  descEl.textContent = plan.description || 'Your current membership plan.';
  maxBooksEl.textContent = String(plan.maxBooks);
  loanDaysEl.textContent = formatDurationLabel(plan.durationDays);

  // Check if this matches the plan we were waiting for → show success toast
  try {
    const pendingPlanId = localStorage.getItem('pendingMembershipPlanId');
    if (pendingPlanId && String(plan.id) === pendingPlanId) {
      toast('Payment successful', `Your membership has been upgraded to ${plan.name}.`);
      localStorage.removeItem('pendingMembershipPlanId');
      clearMembershipPoll();

      // Hide modal if still open
      const modalEl = document.getElementById('membershipPayModal');
      if (modalEl) {
        // eslint-disable-next-line no-undef
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.hide();
      }
    }
  } catch (e) {
    console.warn('Cannot access localStorage for pendingMembershipPlanId', e);
  }
}

async function loadCurrentPlan() {
  const token = localStorage.getItem('token');
  if (!token) {
    setGuestCurrentPlan();
    return;
  }

  try {
    const res = await apiGet('/memberships/me');
    if (!res || res.success === false) {
      setGuestCurrentPlan();
      return;
    }
    setCurrentPlan(res.data);
  } catch (err) {
    console.error('loadCurrentPlan error', err);
    setGuestCurrentPlan();
  }
}

// ====== Polling after payment ======

function startMembershipPoll(expectedPlanId) {
  try {
    localStorage.setItem('pendingMembershipPlanId', String(expectedPlanId));
  } catch (e) {
    console.warn('Cannot save pendingMembershipPlanId', e);
  }

  clearMembershipPoll();

  // mỗi 5s gọi /memberships/me để xem plan đã đổi chưa
  membershipPollTimer = setInterval(async () => {
    try {
      const res = await apiGet('/memberships/me');
      if (res && res.success && res.data && res.data.id === expectedPlanId) {
        setCurrentPlan(res.data);
        // setCurrentPlan sẽ tự hide modal + toast + clear poll
      }
    } catch (err) {
      console.error('membership poll error', err);
    }
  }, 5000);
}

// ====== Choose plan helpers ======

async function chooseFreePlan(planId) {
  try {
    const res = await apiPost('/memberships/choose', { planId });
    if (res && res.success) {
      toast('Plan updated', `You are now on plan ${res.data.name}.`);
      setCurrentPlan(res.data);
    } else {
      toast('Cannot update plan', res?.message || 'Something went wrong.');
    }
  } catch (err) {
    console.error('choosePlan error', err);
    toast('Cannot update plan', 'Please try again later.');
  }
}

async function createMembershipBankTransfer(planId) {
  try {
    const res = await apiPost(`/payments/membership/${planId}/bank-transfer`, {});
    const data = res?.data || res || {};

    // 🆕 lưu plan đang chờ thanh toán
    try {
      localStorage.setItem('pendingMembershipPlanId', String(planId));
    } catch (e) {
      console.warn('Cannot set pendingMembershipPlanId', e);
    }

    const modalEl = document.getElementById('membershipPayModal');
    const qrImg = document.getElementById('membershipPayQr');
    const bankEl = document.getElementById('membershipPayBank');
    const accountEl = document.getElementById('membershipPayAccount');
    const amountEl = document.getElementById('membershipPayAmount');
    const contentEl = document.getElementById('membershipPayContent');

    if (!modalEl || !qrImg || !bankEl || !accountEl || !amountEl || !contentEl) {
      console.error('Membership payment modal elements not found');
      toast('Cannot open payment dialog', 'Please contact admin.');
      return;
    }

    if (data.payUrl) {
      qrImg.src = data.payUrl;
      qrImg.classList.remove('d-none');
    } else {
      qrImg.src = '';
      qrImg.classList.add('d-none');
    }

    bankEl.textContent = data.bank || 'TPBank';
    accountEl.textContent = data.account || '';

    const amount = Number(data.amount || 0);
    amountEl.textContent =
      amount > 0
        ? amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }).replace('VND', '₫')
        : '—';

    contentEl.textContent = data.orderId || '';

    // eslint-disable-next-line no-undef
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    toast(
      'Payment request created',
      'Please scan the QR code and transfer with the exact content.',
    );

    // Bắt đầu poll để khi webhook update xong thì auto cập nhật gói & ẩn modal
    startMembershipPoll(planId);
  } catch (err) {
    console.error('createMembershipBankTransfer error', err);
    toast('Cannot create payment request', 'Please try again later.');
  }
}

// ====== Plans list UI ======

function renderPlans(plans) {
  const container = document.getElementById('plansContainer');
  if (!container) return;
  if (!plans || plans.length === 0) {
    container.innerHTML =
      '<div class="text-muted small">No membership plans are configured yet.</div>';
    return;
  }

  const html = plans
    .map((p) => {
      const featureList = p.features
        .map(
          (f) => `
        <li class="d-flex align-items-start mb-1">
          <i class="bi bi-check2-circle me-2 mt-1"></i>
          <span>${esc(f)}</span>
        </li>
      `,
        )
        .join('');

      return `
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100 ${
            p.highlight ? 'border-primary' : ''
          }" style="border-radius: 20px;">
            <div class="card-body d-flex flex-column align-items-center text-center p-4">

              ${
                p.highlight
                  ? '<span class="badge bg-primary-subtle text-primary mb-2">Most Popular</span>'
                  : ''
              }

              <h4 class="fw-bold mb-1">${esc(p.name)}</h4>
              <p class="text-muted small mb-1">${esc(p.description || '')}</p>
              <p class="text-primary small mb-3">${esc(p.bestFor)}</p>

              <div class="my-2">
                ${
                  p.isPromo && p.originalPriceLabel
                    ? `
                      <div class="small text-muted text-decoration-line-through mb-1">
                        ${esc(p.originalPriceLabel)}
                      </div>
                      <div class="fs-4 fw-semibold mb-1">
                        ${esc(p.priceLabel)}
                      </div>
                      <div class="badge bg-danger-subtle text-danger small">
                        Save ${p.discountPercent || 0}%
                      </div>
                      ${
                        p.promoExpiresAt
                          ? `<div class="small text-danger mt-1">
                               Promo until: ${esc(
                                 new Date(p.promoExpiresAt).toLocaleDateString('en-GB'),
                               )}
                             </div>`
                          : ''
                      }
                    `
                    : `
                      <div class="fs-4 fw-semibold mb-1">
                        ${esc(p.priceLabel)}
                      </div>
                    `
                }
                <div class="small text-muted">
                  ${p.maxBooks} book(s) / ${p.durationLabel}
                </div>
              </div>

              <hr class="my-3 w-100 opacity-10" />

              <ul class="list-unstyled small text-muted text-start w-100 mb-3">
                ${featureList}
              </ul>

              <button
                class="btn text-white mt-auto w-100 fw-semibold py-2 btn-choose-plan"
                data-plan-id="${p.id}"
                data-requires-pay="${p.requiresPayment ? '1' : '0'}"
                style="
                  background: linear-gradient(to right, #0066a2, #00b1d9);
                  border-radius: 12px;
                  font-size: 15px;
                "
              >
                Choose this plan
              </button>

            </div>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = html;

  container.querySelectorAll('.btn-choose-plan').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast('Sign in required', 'Please sign in before choosing a plan.');
        setTimeout(() => {
          location.href = 'login.html?next=my-membership.html';
        }, 1200);
        return;
      }

      const btnEl = e.currentTarget;
      const planId = Number(btnEl.getAttribute('data-plan-id'));
      const requiresPay = btnEl.getAttribute('data-requires-pay') === '1';
      if (!planId) return;

      if (!requiresPay) {
        await chooseFreePlan(planId);
      } else {
        await createMembershipBankTransfer(planId);
      }
    });
  });
}

async function loadPlans() {
  try {
    const token = localStorage.getItem('token');
    const endpoint = token ? '/memberships/user-plans' : '/memberships';

    const res = await apiGet(endpoint);
    if (!res || res.success === false) {
      renderPlans([]);
      return;
    }

    const enriched = enrichPlans(res.data || []);
    renderPlans(enriched);
  } catch (err) {
    console.error('loadPlans error', err);
    renderPlans([]);
  }
}

// ====== Entry point ======

export async function initMembership() {
  await loadCurrentPlan();
  await loadPlans();
}
