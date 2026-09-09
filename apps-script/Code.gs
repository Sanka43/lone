/**
 * Lone (Loan) Management System — backend API.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * The deployed /exec URL is what js/config.js points to.
 */

var SS = SpreadsheetApp.getActiveSpreadsheet();
var SESSION_SECONDS = 6 * 60 * 60; // 6 hours — CacheService's max TTL

var SHEETS = {
  USERS: 'Users',
  BORROWERS: 'Borrowers',
  LOANS: 'Loans',
  PAYMENTS: 'Payments'
};

/** Run this once manually from the Apps Script editor to set up the Sheet. */
function initSheets() {
  createSheetIfMissing_(SHEETS.USERS, ['Username', 'PasswordHash', 'CreatedAt']);
  createSheetIfMissing_(SHEETS.BORROWERS, ['BorrowerID', 'Name', 'NIC', 'Phone', 'Address', 'CreatedAt']);
  createSheetIfMissing_(SHEETS.LOANS, ['LoanID', 'BorrowerID', 'Principal', 'InterestRate', 'LoanDate', 'DueDate', 'Term', 'Notes', 'Closed']);
  createSheetIfMissing_(SHEETS.PAYMENTS, ['PaymentID', 'LoanID', 'Amount', 'PaymentDate', 'Method', 'Note']);

  var users = SS.getSheetByName(SHEETS.USERS);
  if (users.getLastRow() < 2) {
    users.appendRow(['admin', hash_('admin123'), new Date()]);
  }
}

function createSheetIfMissing_(name, headers) {
  var sh = SS.getSheetByName(name);
  if (!sh) {
    sh = SS.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ---------- HTTP entry points ----------

function doGet(e) {
  return handle_(e);
}

function doPost(e) {
  return handle_(e);
}

function handle_(e) {
  var params = {};
  try {
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }
  } catch (err) {
    return json_({ ok: false, error: 'Bad request body' });
  }

  var action = params.action;
  try {
    switch (action) {
      case 'login':
        return json_(login_(params.username, params.password));

      case 'getDashboard':
        requireAuth_(params.token);
        return json_(getDashboard_());

      case 'getBorrowers':
        requireAuth_(params.token);
        return json_({ ok: true, data: getBorrowers_() });
      case 'addBorrower':
        requireAuth_(params.token);
        return json_(addBorrower_(params));
      case 'updateBorrower':
        requireAuth_(params.token);
        return json_(updateBorrower_(params));

      case 'getLoans':
        requireAuth_(params.token);
        return json_({ ok: true, data: getLoans_() });
      case 'getLoan':
        requireAuth_(params.token);
        return json_(getLoanDetail_(params.loanId));
      case 'addLoan':
        requireAuth_(params.token);
        return json_(addLoan_(params));
      case 'closeLoan':
        requireAuth_(params.token);
        return json_(closeLoan_(params.loanId));

      case 'addPayment':
        requireAuth_(params.token);
        return json_(addPayment_(params));

      default:
        return json_({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Auth ----------

function hash_(text) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return digest.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function login_(username, password) {
  var sh = SS.getSheetByName(SHEETS.USERS);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === username && rows[i][1] === hash_(password)) {
      var token = Utilities.getUuid();
      CacheService.getScriptCache().put(token, username, SESSION_SECONDS);
      return { ok: true, token: token, username: username };
    }
  }
  return { ok: false, error: 'Invalid username or password' };
}

function requireAuth_(token) {
  if (!token) throw new Error('Not authenticated');
  var username = CacheService.getScriptCache().get(token);
  if (!username) throw new Error('Not authenticated');
  return username;
}

// ---------- Borrowers ----------

function sheetObjects_(sheetName) {
  var sh = SS.getSheetByName(sheetName);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    obj._row = i + 1;
    out.push(obj);
  }
  return out;
}

function nextId_(prefix) {
  return prefix + Utilities.getUuid().substring(0, 8).toUpperCase();
}

function getBorrowers_() {
  return sheetObjects_(SHEETS.BORROWERS);
}

function addBorrower_(p) {
  var sh = SS.getSheetByName(SHEETS.BORROWERS);
  var id = nextId_('B-');
  sh.appendRow([id, p.name, p.nic || '', p.phone || '', p.address || '', new Date()]);
  return { ok: true, borrowerId: id };
}

function updateBorrower_(p) {
  var sh = SS.getSheetByName(SHEETS.BORROWERS);
  var borrowers = sheetObjects_(SHEETS.BORROWERS);
  var row = null;
  for (var i = 0; i < borrowers.length; i++) {
    if (borrowers[i].BorrowerID === p.borrowerId) { row = borrowers[i]._row; break; }
  }
  if (!row) return { ok: false, error: 'Borrower not found' };
  sh.getRange(row, 2, 1, 4).setValues([[p.name, p.nic || '', p.phone || '', p.address || '']]);
  return { ok: true };
}

// ---------- Loans ----------

function getLoans_() {
  var loans = sheetObjects_(SHEETS.LOANS);
  var payments = sheetObjects_(SHEETS.PAYMENTS);
  var borrowers = sheetObjects_(SHEETS.BORROWERS);
  var borrowerMap = {};
  borrowers.forEach(function (b) { borrowerMap[b.BorrowerID] = b.Name; });

  return loans.map(function (loan) {
    var loanPayments = payments.filter(function (p) { return p.LoanID === loan.LoanID; });
    var status = computeLoanStatus_(loan, loanPayments);
    return {
      loanId: loan.LoanID,
      borrowerId: loan.BorrowerID,
      borrowerName: borrowerMap[loan.BorrowerID] || '(unknown)',
      principal: loan.Principal,
      interestRate: loan.InterestRate,
      loanDate: loan.LoanDate,
      dueDate: loan.DueDate,
      closed: loan.Closed === true || loan.Closed === 'TRUE',
      balance: status.balance,
      accruedInterest: status.accruedInterest,
      totalDue: status.totalDue,
      state: status.state
    };
  });
}

function getLoanDetail_(loanId) {
  var loans = sheetObjects_(SHEETS.LOANS);
  var loan = loans.filter(function (l) { return l.LoanID === loanId; })[0];
  if (!loan) return { ok: false, error: 'Loan not found' };
  var borrowers = sheetObjects_(SHEETS.BORROWERS);
  var borrower = borrowers.filter(function (b) { return b.BorrowerID === loan.BorrowerID; })[0];
  var payments = sheetObjects_(SHEETS.PAYMENTS)
    .filter(function (p) { return p.LoanID === loanId; })
    .sort(function (a, b) { return new Date(a.PaymentDate) - new Date(b.PaymentDate); });
  var status = computeLoanStatus_(loan, payments);
  return {
    ok: true,
    loan: loan,
    borrower: borrower,
    payments: payments,
    status: status
  };
}

function addLoan_(p) {
  var sh = SS.getSheetByName(SHEETS.LOANS);
  var id = nextId_('L-');
  sh.appendRow([
    id, p.borrowerId, Number(p.principal), Number(p.interestRate),
    p.loanDate, p.dueDate || '', p.term || '', p.notes || '', false
  ]);
  return { ok: true, loanId: id };
}

function closeLoan_(loanId) {
  var sh = SS.getSheetByName(SHEETS.LOANS);
  var loans = sheetObjects_(SHEETS.LOANS);
  var row = null;
  for (var i = 0; i < loans.length; i++) {
    if (loans[i].LoanID === loanId) { row = loans[i]._row; break; }
  }
  if (!row) return { ok: false, error: 'Loan not found' };
  sh.getRange(row, 9).setValue(true); // Closed column
  return { ok: true };
}

// ---------- Payments ----------

function addPayment_(p) {
  var sh = SS.getSheetByName(SHEETS.PAYMENTS);
  var id = nextId_('P-');
  sh.appendRow([id, p.loanId, Number(p.amount), p.paymentDate, p.method || '', p.note || '']);
  return { ok: true, paymentId: id };
}

/**
 * Reducing-balance interest ledger.
 * Interest accrues monthly (pro-rated by days/30) on the outstanding principal.
 * Each payment first clears accrued interest, the remainder reduces principal.
 */
function computeLoanStatus_(loan, payments) {
  var rate = Number(loan.InterestRate) / 100; // monthly rate, e.g. 0.05 for 5%
  var balance = Number(loan.Principal);
  var accrued = 0;
  var lastDate = new Date(loan.LoanDate);

  payments.forEach(function (pay) {
    var payDate = new Date(pay.PaymentDate);
    var months = (payDate - lastDate) / (1000 * 60 * 60 * 24 * 30);
    if (months > 0) accrued += balance * rate * months;

    var amt = Number(pay.Amount);
    if (amt >= accrued) {
      amt -= accrued;
      accrued = 0;
      balance -= amt;
      if (balance < 0) balance = 0;
    } else {
      accrued -= amt;
    }
    lastDate = payDate;
  });

  var today = new Date();
  var monthsToToday = (today - lastDate) / (1000 * 60 * 60 * 24 * 30);
  if (monthsToToday > 0 && balance > 0) accrued += balance * rate * monthsToToday;

  var totalDue = balance + accrued;
  var state = 'active';
  if (loan.Closed === true || loan.Closed === 'TRUE' || totalDue <= 0.5) {
    state = 'closed';
  } else if (loan.DueDate && new Date(loan.DueDate) < today) {
    state = 'overdue';
  }

  return {
    balance: round2_(balance),
    accruedInterest: round2_(accrued),
    totalDue: round2_(totalDue),
    state: state
  };
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function getDashboard_() {
  var loans = getLoans_();
  var active = loans.filter(function (l) { return l.state !== 'closed'; });
  var overdue = loans.filter(function (l) { return l.state === 'overdue'; });
  var outstanding = active.reduce(function (s, l) { return s + l.totalDue; }, 0);
  return {
    ok: true,
    totalLoans: loans.length,
    activeLoans: active.length,
    overdueLoans: overdue.length,
    totalOutstanding: round2_(outstanding),
    loans: loans // avoids a second getLoans round trip just to show "recent loans"
  };
}
