requireLogin();
renderNav('loans.html');

function money(n) {
  return 'Rs. ' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function badge(state) {
  return `<span class="badge ${state}">${state}</span>`;
}

async function loadBorrowerOptions() {
  const res = await apiCall('getBorrowers');
  const select = document.getElementById('borrowerId');
  const borrowers = (res && res.data) || [];
  if (!borrowers.length) {
    select.innerHTML = '<option value="">No borrowers — add one first</option>';
    return;
  }
  select.innerHTML = borrowers.map(b => `<option value="${b.BorrowerID}">${b.Name}</option>`).join('');
}

async function loadLoans() {
  const res = await apiCall('getLoans');
  const tbody = document.getElementById('loanRows');
  const loans = (res && res.data) || [];
  if (!loans.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No loans yet.</td></tr>';
    return;
  }
  tbody.innerHTML = loans.slice().reverse().map(l => `
    <tr>
      <td><a href="loan.html?id=${l.loanId}">${l.loanId}</a></td>
      <td>${l.borrowerName}</td>
      <td>${money(l.principal)}</td>
      <td>${money(l.totalDue)}</td>
      <td>${badge(l.state)}</td>
    </tr>
  `).join('');
}

document.getElementById('loanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const payload = {
    borrowerId: document.getElementById('borrowerId').value,
    principal: document.getElementById('principal').value,
    interestRate: document.getElementById('interestRate').value,
    loanDate: document.getElementById('loanDate').value,
    dueDate: document.getElementById('dueDate').value,
    notes: document.getElementById('notes').value
  };
  if (!payload.borrowerId) {
    errEl.textContent = 'Add a borrower first.';
    return;
  }
  const res = await apiCall('addLoan', payload);
  if (res && res.ok) {
    document.getElementById('loanForm').reset();
    loadLoans();
  } else {
    errEl.textContent = (res && res.error) || 'Failed to create loan';
  }
});

loadBorrowerOptions();
loadLoans();
