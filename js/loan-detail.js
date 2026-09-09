requireLogin();
renderNav('loans.html');

function money(n) {
  return 'Rs. ' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function badge(state) {
  return `<span class="badge ${state}">${state}</span>`;
}

const loanId = new URLSearchParams(window.location.search).get('id');
if (!loanId) window.location.href = 'loans.html';

async function load() {
  const res = await apiCall('getLoan', { loanId });
  if (!res || !res.ok) {
    document.querySelector('.container').innerHTML = `<div class="card error">Loan not found.</div>`;
    return;
  }

  document.getElementById('loanTitle').textContent = 'Loan ' + res.loan.LoanID;
  document.getElementById('statusBadge').innerHTML = badge(res.status.state);
  document.getElementById('borrowerName').textContent = res.borrower ? res.borrower.Name : '(unknown)';
  document.getElementById('principal').textContent = money(res.loan.Principal);
  document.getElementById('rate').textContent = res.loan.InterestRate + '% / month';
  document.getElementById('balanceDue').textContent = money(res.status.totalDue);
  document.getElementById('dates').textContent =
    'Loan date: ' + fmtDate(res.loan.LoanDate) +
    (res.loan.DueDate ? '  •  Due date: ' + fmtDate(res.loan.DueDate) : '');

  const tbody = document.getElementById('paymentRows');
  if (!res.payments.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">No payments recorded yet.</td></tr>';
  } else {
    tbody.innerHTML = res.payments.slice().reverse().map(p => `
      <tr>
        <td>${fmtDate(p.PaymentDate)}</td>
        <td>${money(p.Amount)}</td>
        <td>${p.Method || ''}</td>
        <td>${p.Note || ''}</td>
      </tr>
    `).join('');
  }

  document.getElementById('closeLoanBtn').addEventListener('click', async () => {
    if (!confirm('Mark this loan as closed?')) return;
    await apiCall('closeLoan', { loanId });
    load();
  });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString();
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const res = await apiCall('addPayment', {
    loanId,
    amount: document.getElementById('amount').value,
    paymentDate: document.getElementById('paymentDate').value,
    method: document.getElementById('method').value,
    note: document.getElementById('note').value
  });
  if (res && res.ok) {
    document.getElementById('paymentForm').reset();
    load();
  } else {
    errEl.textContent = (res && res.error) || 'Failed to add payment';
  }
});

load();
