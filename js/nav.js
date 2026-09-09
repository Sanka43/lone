function renderNav(active) {
  const user = localStorage.getItem('lone_username') || '';
  const links = [
    ['dashboard.html', 'Dashboard'],
    ['borrowers.html', 'Borrowers'],
    ['loans.html', 'Loans']
  ];
  const linkHtml = links.map(([href, label]) =>
    `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`
  ).join('');

  document.getElementById('nav').innerHTML = `
    <div class="topbar">
      <div class="brand">Lone Management</div>
      <nav>
        ${linkHtml}
        <span class="muted" style="margin-left:18px;">${user}</span>
        <a href="#" id="logoutLink">Log out</a>
      </nav>
    </div>
  `;
  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = 'index.html';
  });
}
