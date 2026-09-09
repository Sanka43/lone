# Lone Management System

A small loan/lending management system.

- **Frontend**: static HTML/CSS/JS, hosted on GitHub Pages.
- **Database**: a Google Sheet.
- **Backend**: a Google Apps Script Web App bound to that Sheet — it's the only
  API the frontend talks to, and it's what makes read/write to the Sheet possible
  from a static site.

```
Browser (GitHub Pages) --fetch(JSON)--> Apps Script Web App --> Google Sheet
```

## 1. Create the Google Sheet + backend

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet. Name it e.g. "Lone Management DB".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the default `Code.gs` content and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
4. In the Apps Script editor, select the function `initSheets` from the dropdown next to the Run button, and click **Run**. Approve the permissions prompt (it needs access to the spreadsheet). This creates the `Users`, `Sessions`, `Borrowers`, `Loans`, `Payments` tabs and one default login:
   - Username: `admin`
   - Password: `admin123`

   **Change this password immediately** — see step 6.

5. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click Deploy, authorize again if asked, then copy the **Web app URL** (ends in `/exec`).

6. To change the admin password: run this once in the Apps Script editor (Execute → run a temporary function), or just edit the `Users` sheet directly — the `PasswordHash` column must be a SHA-256 hex hash. Easiest way: in the Apps Script editor's execution log, run:
   ```js
   function setPassword() { Logger.log(hash_('your-new-password')); }
   ```
   then paste the logged hash into the `PasswordHash` cell for `admin` in the `Users` sheet.

## 2. Configure the frontend

Open [`js/config.js`](js/config.js) and paste the Web App URL from step 5:

```js
const API_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

## 3. Host on GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Pages → Source: Deploy from branch → main / (root)**.
Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Features

- Login (single admin user)
- Dashboard: total loans, active loans, overdue count, total outstanding
- Borrowers: add/edit
- Loans: create loan (principal, monthly interest rate, dates), list all loans with live balance
- Loan detail: record payments, view payment history, mark loan closed
- **Reducing-balance interest**: interest accrues monthly on the outstanding principal; each payment
  clears accrued interest first, then reduces principal — so the next month's interest is calculated
  on the smaller balance. Calculated server-side in `computeLoanStatus_` in `Code.gs`.

## Notes / limitations

- The Apps Script Web App URL is public. Every write action requires a valid session token
  (checked against the `Sessions` sheet), but the login endpoint itself is rate-limit-free —
  fine for a small internal tool, not meant for a large public-facing product.
- Sessions expire after 12 hours (`SESSION_HOURS` in `Code.gs`).
- If you edit `Code.gs`, redeploy: **Deploy → Manage deployments → edit (pencil) → New version → Deploy**.
  The `/exec` URL stays the same.
