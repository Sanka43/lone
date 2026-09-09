requireLogin();
renderNav('dashboard.html');

function money(n) {
  return 'Rs. ' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badge(state) {
  return `<span class="badge ${state}">${state}</span>`;
}

(async function load() {
  const stats = await apiCall('getDashboard');
  if (stats && stats.ok) {
    document.getElementById('totalLoans').textContent = stats.totalLoans;
    document.getElementById('activeLoans').textContent = stats.activeLoans;
    document.getElementById('overdueLoans').textContent = stats.overdueLoans;
    document.getElementById('totalOutstanding').textContent = money(stats.totalOutstanding);
  }

  const loansRes = await apiCall('getLoans');
  const tbody = document.getElementById('recentLoans');
  if (loansRes && loansRes.data && loansRes.data.length) {
    const recent = loansRes.data.slice(-5).reverse();
    tbody.innerHTML = recent.map(l => `
      <tr>
        <td><a href="loan.html?id=${l.loanId}">${l.loanId}</a></td>
        <td>${l.borrowerName}</td>
        <td>${money(l.totalDue)}</td>
        <td>${badge(l.state)}</td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">No loans yet.</td></tr>';
  }
})();
