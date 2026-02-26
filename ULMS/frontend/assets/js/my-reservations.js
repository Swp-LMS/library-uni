import { apiGet, apiPatch } from './api.js';

export function initReservations() {
  const token = localStorage.getItem('token');
  if (!token) {
    location.href = 'login.html?next=my-reservations.html';
    return;
  }

  const tbody = document.getElementById('tbody');
  const btnRefresh = document.getElementById('btn-refresh');
  const countResv = document.getElementById('countResv');
  const statusSel = document.getElementById('filterResvStatus');
  const qInput = document.getElementById('q');
  const btnSearch = document.getElementById('btnSearch');

  // Escape ký tự HTML
  const esc = (s = '') =>
    String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[m],
    );

  // Định dạng thời gian
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '-';

  const pick = (obj, keys) => keys.find((k) => obj?.[k] != null && obj[k] !== '');

  // Lấy ngày đặt (tuỳ backend)
  const getReservedAt = (r) =>
    r?.[pick(r, ['reserveDate', 'reservedAt', 'reserve_date', 'createdAt', 'created_at'])] || null;

  // Lấy tiêu đề sách
  const getTitle = (r) =>
    r?.book?.title || r?.bookTitle || r?.title || (r?.book_id ? `Book #${r.book_id}` : '');

  // Gọi API huỷ
  async function cancelReservation(id) {
    await apiPatch(`/reservations/${id}/cancel`);
  }

  // Gọi API xác nhận pickup (nếu có)
  async function pickupReservation(id) {
    await apiPatch(`/reservations/${id}/pickup`);
  }

  // Render danh sách
  async function load() {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-4">Loading…</td></tr>`;
    try {
      const resp = await apiGet(`/reservations/me`);
      const list = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
          ? resp
          : (resp?.items ?? resp?.results ?? []);

      if (!Array.isArray(list) || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-4">No reservations.</td></tr>`;
        countResv.textContent = '';
        return;
      }

      // 🔽 Filter theo status + keyword ngay trên FE
      let filtered = list.slice();

      const statusFilter = (statusSel?.value || 'all').toLowerCase();
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter((r) => String(r?.status || '').toLowerCase() === statusFilter);
      }

      const keyword = (qInput?.value || '').trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter((r) => getTitle(r).toLowerCase().includes(keyword));
      }

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-4">No reservations match your filter.</td></tr>`;
        countResv.textContent = `0 of ${list.length} reservations`;
        return;
      }

      tbody.innerHTML = filtered
        .map((r) => {
          const id = r.id ?? '-';
          const title = esc(getTitle(r));
          const reservedAt = fmtDateTime(getReservedAt(r));
          const statusRaw = String(r?.status || '');
          const status = statusRaw.toLowerCase();

          // 🎨 Badge màu theo trạng thái
          let badgeHTML = '';
          switch (status) {
            case 'pending':
              badgeHTML = `<span class="badge rounded-pill text-bg-warning text-dark">Pending</span>`;
              break;
            case 'approved':
              badgeHTML = `<span class="badge rounded-pill text-bg-info">Approved</span>`;
              break;
            case 'ready':
              badgeHTML = `<span class="badge rounded-pill text-bg-success">Ready</span>`;
              break;
            case 'completed':
              badgeHTML = `<span class="badge rounded-pill text-bg-success">Completed</span>`;
              break;
            case 'expired':
              badgeHTML = `<span class="badge rounded-pill text-bg-danger">Expired</span>`;
              break;
            case 'cancelled':
              badgeHTML = `<span class="badge rounded-pill text-bg-secondary">Cancelled</span>`;
              break;
            default:
              badgeHTML = `<span class="badge rounded-pill text-bg-secondary">${esc(
                statusRaw || '-',
              )}</span>`;
          }

          // Action button
          const actionHTML =
            status === 'pending'
              ? `<button class="btn btn-sm btn-outline-danger" data-cancel="${id}">
                   <i class="bi bi-x-circle"></i> Cancel
                 </button>`
              : status === 'ready'
                ? `<button class="btn btn-sm btn-success" data-pickup="${id}">
                     <i class="bi bi-check-circle"></i> Pickup
                   </button>`
                : `<span class="text-muted small">-</span>`;

          return `
            <tr data-row="${id}">
              <td class="text-muted">${id}</td>
              <td><strong>${title}</strong></td>
              <td>${reservedAt}</td>
              <td>${badgeHTML}</td>
              <td class="text-end">${actionHTML}</td>
            </tr>`;
        })
        .join('');

      countResv.textContent = `Showing ${filtered.length} of ${list.length} reservations`;

      // Sự kiện Cancel
      tbody.querySelectorAll('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-cancel');
          if (!id) return;
          if (!confirm('Cancel this reservation?')) return;
          try {
            btn.disabled = true;
            await cancelReservation(id);
            await load();
          } catch (e) {
            alert('Cancel failed: ' + (e?.message || e));
          } finally {
            btn.disabled = false;
          }
        });
      });

      // Sự kiện Pickup
      tbody.querySelectorAll('[data-pickup]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-pickup');
          if (!id) return;
          try {
            btn.disabled = true;
            await pickupReservation(id);
            await load();
          } catch (e) {
            alert('Pickup failed: ' + (e?.message || e));
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-4">Load failed: ${e?.message || e}</td></tr>`;
      countResv.textContent = '';
    }
  }

  // 🔁 Event: status + search + refresh
  statusSel?.addEventListener('change', load);

  btnSearch?.addEventListener('click', () => {
    load();
  });

  qInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  });

  btnRefresh?.addEventListener('click', () => {
    if (qInput) qInput.value = '';
    if (statusSel) statusSel.value = 'all';
    load();
  });

  load();
}
