// assets/js/admin-memberships.js
import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

// ====== Guard chỉ cho admin ======
function guardAdmin() {
  const t = localStorage.getItem('token');
  const u = JSON.parse(localStorage.getItem('user') || 'null');
  if (!t || !u || u.role !== 'admin') {
    location.href = 'login.html';
  }
}

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ====== Toast helper ======
function toast(title, body) {
  let area = document.getElementById('toastArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toastArea';
    area.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(area);
  }

  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2500">
      <div class="d-flex">
        <div class="toast-body"><strong>${esc(title)}:</strong> ${esc(body)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`,
  );

  const el = document.getElementById(id);
  bootstrap.Toast.getOrCreateInstance(el).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ====== MAIN ======
async function initAdminMemberships() {
  guardAdmin();

  const tableBody = document.getElementById('planTableBody');
  const btnAdd = document.getElementById('btnAddPlan');

  if (!tableBody) return;

  let plans = [];

  // ===== Tạo modal Add/Edit nếu chưa có =====
  let modalEl = document.getElementById('planModal');
  if (!modalEl) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `
      <div class="modal fade" id="planModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="planModalTitle">Add Plan</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="planForm" class="modal-body">
              <input type="hidden" id="planId" />
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input id="planName" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea id="planDescription" rows="3" class="form-control"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Price (VND)</label>
                <input id="planPrice" type="number" min="0" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Max Books</label>
                <input id="planMaxBooks" type="number" min="0" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Duration days (days)</label>
                <input id="planDurationDays" type="number" min="1" class="form-control" required />
              </div>
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="planIsActive" checked />
                <label class="form-check-label" for="planIsActive">
                  Active
                </label>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `,
    );
    modalEl = document.getElementById('planModal');
  }

  const modal = new bootstrap.Modal(modalEl);
  const form = modalEl.querySelector('#planForm');
  const modalTitle = modalEl.querySelector('#planModalTitle');
  const planId = modalEl.querySelector('#planId');
  const planName = modalEl.querySelector('#planName');
  const planDescription = modalEl.querySelector('#planDescription');
  const planPrice = modalEl.querySelector('#planPrice');
  const planMaxBooks = modalEl.querySelector('#planMaxBooks');
  const planDurationDays = modalEl.querySelector('#planDurationDays');
  const planIsActive = modalEl.querySelector('#planIsActive');

  // ===== LOAD LIST =====
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small text-center">Loading…</td></tr>`;
    try {
      const res = await apiGet('/memberships/admin');
      const items = Array.isArray(res) ? res : res.data || [];

      plans = items;

      if (!plans.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small text-center">No plans found</td></tr>`;
        return;
      }

      tableBody.innerHTML = plans
        .map(
          (p) => `
        <tr>
          <td>${p.id}</td>
          <td>
            <div class="fw-semibold">${esc(p.name)}</div>
            ${
              p.isActive
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle">Active</span>'
                : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Inactive</span>'
            }
          </td>
          <td>${p.price != null ? p.price.toLocaleString('vi-VN') : '-'}</td>
          <td>${p.durationDays ?? '-'}</td>
          <td>${p.maxBooks ?? '-'}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center gap-2">
              <button class="btn btn-sm btn-light border" data-edit="${p.id}" title="Edit">
                <i class="bi bi-pencil text-primary"></i>
              </button>
              <button class="btn btn-sm btn-light border" data-del="${p.id}" title="Delete">
                <i class="bi bi-trash text-danger"></i>
              </button>
            </div>
          </td>
        </tr>
      `,
        )
        .join('');

      // Edit
      tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-edit'));
          const p = plans.find((x) => x.id === id);
          if (!p) return;

          modalTitle.textContent = 'Edit Plan';
          planId.value = p.id;
          planName.value = p.name || '';
          planDescription.value = p.description || '';
          planPrice.value = p.price ?? '';
          planMaxBooks.value = p.maxBooks ?? '';
          planDurationDays.value = p.durationDays ?? '';
          planIsActive.checked = !!p.isActive;

          modal.show();
        });
      });

      // Delete
      tableBody.querySelectorAll('[data-del]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del');
          if (!confirm('Delete this plan?')) return;
          try {
            await apiDelete(`/memberships/admin/${id}`);
            toast('Success', 'Plan deleted');
            load();
          } catch (err) {
            toast('Error', err.message || 'Delete failed');
          }
        });
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-danger small text-center">Load failed: ${esc(
        err.message,
      )}</td></tr>`;
    }
  }

  // ===== ADD NEW =====
  btnAdd?.addEventListener('click', () => {
    modalTitle.textContent = 'Add Plan';
    form.reset();
    planId.value = '';
    planIsActive.checked = true;
    modal.show();
  });

  // ===== SUBMIT FORM =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: planName.value.trim(),
      description: planDescription.value.trim() || undefined,
      price: planPrice.value !== '' ? Number(planPrice.value) : 0,
      maxBooks: planMaxBooks.value !== '' ? Number(planMaxBooks.value) : 0,
      durationDays: planDurationDays.value !== '' ? Number(planDurationDays.value) : null,
      isActive: !!planIsActive.checked,
    };

    if (!payload.name) {
      return toast('Warning', 'Name is required');
    }
    if (!payload.durationDays || payload.durationDays <= 0) {
      return toast('Warning', 'Duration days must be > 0');
    }
    if (payload.price < 0 || payload.maxBooks < 0) {
      return toast('Warning', 'Price/Max books must be ≥ 0');
    }

    try {
      const id = planId.value;
      if (id) {
        await apiPut(`/memberships/admin/${id}`, payload);
        toast('Success', 'Plan updated');
      } else {
        await apiPost('/memberships/admin', payload);
        toast('Success', 'Plan created');
      }
      modal.hide();
      load();
    } catch (err) {
      toast('Error', err.message || 'Save failed');
    }
  });

  // Start
  load();
}

// auto init
initAdminMemberships();
