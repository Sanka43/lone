requireLogin();
renderNav('borrowers.html');

const form = document.getElementById('borrowerForm');
const cancelBtn = document.getElementById('cancelEdit');
const errEl = document.getElementById('err');

function resetForm() {
  form.reset();
  document.getElementById('borrowerId').value = '';
  document.getElementById('formTitle').textContent = 'Add Borrower';
  cancelBtn.style.display = 'none';
}

cancelBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';
  const id = document.getElementById('borrowerId').value;
  const payload = {
    name: document.getElementById('name').value.trim(),
    nic: document.getElementById('nic').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim()
  };

  const res = id
    ? await apiCall('updateBorrower', Object.assign({ borrowerId: id }, payload))
    : await apiCall('addBorrower', payload);

  if (res && res.ok) {
    resetForm();
    loadBorrowers();
  } else {
    errEl.textContent = (res && res.error) || 'Failed to save borrower';
  }
});

function editBorrower(b) {
  document.getElementById('borrowerId').value = b.BorrowerID;
  document.getElementById('name').value = b.Name;
  document.getElementById('nic').value = b.NIC;
  document.getElementById('phone').value = b.Phone;
  document.getElementById('address').value = b.Address;
  document.getElementById('formTitle').textContent = 'Edit Borrower';
  cancelBtn.style.display = 'inline-block';
  window.scrollTo(0, 0);
}

let allBorrowers = [];

async function loadBorrowers() {
  const res = await apiCall('getBorrowers');
  const tbody = document.getElementById('borrowerRows');
  allBorrowers = (res && res.data) || [];
  if (!allBorrowers.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No borrowers yet.</td></tr>';
    return;
  }
  tbody.innerHTML = allBorrowers.map((b, i) => `
    <tr>
      <td>${b.Name}</td>
      <td>${b.NIC || ''}</td>
      <td>${b.Phone || ''}</td>
      <td>${b.Address || ''}</td>
      <td class="row-actions"><a href="#" data-i="${i}" class="editLink">Edit</a></td>
    </tr>
  `).join('');
  document.querySelectorAll('.editLink').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      editBorrower(allBorrowers[a.dataset.i]);
    });
  });
}

loadBorrowers();
