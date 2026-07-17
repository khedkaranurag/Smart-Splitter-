// SplitSmart — group.js
// Group chat page: expense feed, WebSocket, add bill form

if (!requireAuth()) { /* redirected */ }

const currentUser = Auth.user();
const groupId     = parseInt(getUrlParam('id'));
if (!groupId) window.location.href = 'dashboard.html';

// Navbar
document.getElementById('nav-name').textContent = currentUser.name;
document.getElementById('nav-avatar').textContent = getInitials(currentUser.name);
document.getElementById('nav-avatar').style.background = currentUser.avatarColor;

let groupData   = null;
let groupMembers = [];
let currentSplitType = 'EQUAL';

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    await loadGroupInfo();
    await loadFeed();
    await loadBalances();
    setupWebSocket();
  } catch (err) {
    showToast('Error loading group: ' + err.message, 'error');
  }
}

async function loadGroupInfo() {
  const res = await GroupsAPI.get(groupId);
  groupData    = res.data;
  groupMembers = groupData.members || [];

  // Set names everywhere
  document.getElementById('nav-group-name').textContent  = groupData.name;
  document.getElementById('sidebar-group-name').textContent = groupData.name;
  document.getElementById('feed-group-name').textContent  = `#${groupData.name}`;
  document.getElementById('nav-badge').innerHTML = groupTypeBadge(groupData.type);
  document.getElementById('sidebar-invite-code').textContent = `Invite code: ${groupData.inviteCode || 'N/A'}`;
  document.title = `${groupData.name} — SplitSmart`;

  renderPaidBySelect();
  renderSplitMembers();
}

async function loadFeed() {
  try {
    const res = await ExpensesAPI.list(groupId);
    renderFeed(res.data || []);
  } catch (err) {
    document.getElementById('feed-scroll').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

async function loadBalances() {
  try {
    const res = await GroupsAPI.balances(groupId);
    renderBalances(res.data || []);
  } catch (err) { /* silent */ }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderFeed(expenses) {
  const feed = document.getElementById('feed-scroll');
  if (expenses.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <h3>No expenses yet</h3>
        <p>Add your first bill using the form on the right.</p>
      </div>`;
    return;
  }
  feed.innerHTML = expenses.map(renderExpenseItem).join('');
  feed.scrollTop = feed.scrollHeight;
}

function renderExpenseItem(expense) {
  const splits = expense.splits || [];
  const splitChips = splits.map(s =>
    `<div class="split-chip">
      <div class="avatar avatar-sm" style="background:${s.avatarColor};width:16px;height:16px;font-size:8px;">${getInitials(s.userName)}</div>
      ${escapeHtml(s.userName)} · ${formatAmount(s.amountOwed)}
    </div>`
  ).join('');

  const isMe = expense.paidById === currentUser.id;
  return `
    <div class="expense-item">
      <div class="avatar" style="background:${expense.paidByAvatar}">${getInitials(expense.paidByName)}</div>
      <div class="expense-body">
        <div class="expense-header-row">
          <div>
            <div class="expense-title">${escapeHtml(expense.description)}</div>
            <div class="expense-meta">
              Paid by <strong>${isMe ? 'You' : escapeHtml(expense.paidByName)}</strong> · 
              <span class="badge badge-purple" style="font-size:10px;">${expense.splitType}</span> ·
              ${timeAgo(expense.createdAt)}
            </div>
          </div>
          <div class="expense-amount">${formatAmount(expense.amount)}</div>
        </div>
        <div class="expense-splits">${splitChips}</div>
      </div>
    </div>`;
}

function renderBalances(balances) {
  const list = document.getElementById('members-list');
  if (!balances.length) { list.innerHTML = '<p class="text-sm text-muted">No balances yet</p>'; return; }

  list.innerHTML = balances.map(b => {
    const net = parseFloat(b.netBalance);
    let balanceClass = 'balance-zero', balanceText = 'Settled up';
    if (net > 0.01)  { balanceClass = 'balance-positive'; balanceText = `+${formatAmount(net)}`; }
    if (net < -0.01) { balanceClass = 'balance-negative'; balanceText = formatAmount(net); }
    return `
      <div class="sidebar-member">
        <div class="avatar avatar-sm" style="background:${b.avatarColor}">${getInitials(b.userName)}</div>
        <div class="sidebar-member-info">
          <div class="sidebar-member-name">${escapeHtml(b.userName)} ${b.userId === currentUser.id ? '<span style="font-size:10px;color:var(--text-muted)">(you)</span>' : ''}</div>
          <div class="sidebar-member-balance ${balanceClass}">${balanceText}</div>
        </div>
      </div>`;
  }).join('');
}

function renderPaidBySelect() {
  const select = document.getElementById('bill-paid-by');
  select.innerHTML = groupMembers.map(m =>
    `<option value="${m.id}" ${m.id === currentUser.id ? 'selected' : ''}>${m.name}${m.id === currentUser.id ? ' (you)' : ''}</option>`
  ).join('');
}

function renderSplitMembers() {
  const container = document.getElementById('split-members');
  container.innerHTML = groupMembers.map(m =>
    `<div class="member-chip selected" id="chip-${m.id}" data-id="${m.id}" onclick="toggleChip(this)">
      <div class="avatar avatar-sm" style="background:${m.avatarColor};width:18px;height:18px;font-size:8px;">${getInitials(m.name)}</div>
      ${escapeHtml(m.name)}
    </div>`
  ).join('');
}

// ─── Split Type ────────────────────────────────────────────────────────────────
function setSplitType(type, btn) {
  currentSplitType = type;
  document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const customArea = document.getElementById('custom-amounts');
  if (type === 'EQUAL') {
    customArea.style.display = 'none';
  } else {
    customArea.style.display = 'block';
    renderCustomInputs();
  }
}

function renderCustomInputs() {
  const selected = getSelectedMemberIds();
  const amount   = parseFloat(document.getElementById('bill-amount').value) || 0;
  const label    = currentSplitType === 'PERCENTAGE' ? '%' : '₹';
  const defaultVal = currentSplitType === 'PERCENTAGE'
    ? (selected.length ? (100 / selected.length).toFixed(1) : 0)
    : (selected.length ? (amount / selected.length).toFixed(2) : 0);

  const container = document.getElementById('custom-inputs');
  container.innerHTML = selected.map(id => {
    const member = groupMembers.find(m => m.id == id);
    if (!member) return '';
    return `
      <div class="flex items-center gap-sm" style="margin-bottom:8px;">
        <div class="avatar avatar-sm" style="background:${member.avatarColor};flex-shrink:0;">${getInitials(member.name)}</div>
        <span class="text-sm" style="flex:1;">${escapeHtml(member.name)}</span>
        <input class="form-input" style="width:90px;text-align:right;" type="number" step="0.01" min="0"
               id="custom-${id}" value="${defaultVal}" placeholder="${label}" />
        <span class="text-muted text-sm">${label}</span>
      </div>`;
  }).join('');
}

function toggleChip(chip) {
  chip.classList.toggle('selected');
  if (currentSplitType !== 'EQUAL') renderCustomInputs();
}

function getSelectedMemberIds() {
  return Array.from(document.querySelectorAll('.member-chip.selected'))
    .map(c => parseInt(c.dataset.id));
}

// ─── Add Bill ─────────────────────────────────────────────────────────────────
async function handleAddBill(e) {
  e.preventDefault();
  const btn   = document.getElementById('bill-btn');
  const error = document.getElementById('bill-error');
  error.style.display = 'none';

  const description = document.getElementById('bill-desc').value.trim();
  const amount      = parseFloat(document.getElementById('bill-amount').value);
  const paidById    = parseInt(document.getElementById('bill-paid-by').value);
  const selectedIds = getSelectedMemberIds();

  if (!selectedIds.length) {
    error.textContent = 'Select at least one member to split with.';
    error.style.display = 'block';
    return;
  }

  const body = { groupId, description, amount, paidById, splitType: currentSplitType };

  if (currentSplitType === 'EQUAL') {
    body.memberIds = selectedIds;
  } else if (currentSplitType === 'CUSTOM') {
    const customSplits = {};
    selectedIds.forEach(id => {
      customSplits[id] = parseFloat(document.getElementById(`custom-${id}`).value) || 0;
    });
    body.customSplits = customSplits;
  } else if (currentSplitType === 'PERCENTAGE') {
    const percentageSplits = {};
    selectedIds.forEach(id => {
      percentageSplits[id] = parseFloat(document.getElementById(`custom-${id}`).value) || 0;
    });
    const total = Object.values(percentageSplits).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.5) {
      error.textContent = `Percentages must add up to 100% (current: ${total.toFixed(1)}%)`;
      error.style.display = 'block';
      return;
    }
    body.percentageSplits = percentageSplits;
  }

  setLoading(btn, true);
  try {
    await ExpensesAPI.add(body);
    showToast(`₹${amount.toFixed(2)} expense added!`, 'success');
    document.getElementById('bill-form').reset();
    setSplitType('EQUAL', document.querySelector('[data-type="EQUAL"]'));
    renderSplitMembers();
    await loadFeed();
    await loadBalances();
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    setLoading(btn, false);
  }
}

// ─── WebSocket ─────────────────────────────────────────────────────────────────
function setupWebSocket() {
  WS.connect(() => {
    document.getElementById('ws-status').textContent = '🟢 Live';

    WS.subscribe(`/topic/group/${groupId}`, (expense) => {
      appendExpenseToFeed(expense);
      showToast(`New expense: ${expense.description}`, 'info');
    });

    WS.subscribe(`/topic/balance/${groupId}`, (balances) => {
      renderBalances(balances);
    });
  });

  // Update status on disconnect (polling not needed, just initial connect status)
  setTimeout(() => {
    if (!WS.client?.connected) {
      document.getElementById('ws-status').textContent = '🔴 Offline';
    }
  }, 3000);
}

function appendExpenseToFeed(expense) {
  const feed = document.getElementById('feed-scroll');
  const emptyState = feed.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  feed.insertAdjacentHTML('beforeend', renderExpenseItem(expense));
  feed.scrollTop = feed.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();

// ─── WhatsApp Share ───────────────────────────────────────────────────────────
function shareViaWhatsApp() {
  if (!groupData) {
    showToast('Group info not loaded yet, please wait.', 'error');
    return;
  }

  const groupName  = groupData.name;
  const inviteCode = groupData.inviteCode || 'N/A';
  const appUrl     = `http://localhost:3000/login.html`;

  const message =
    `🎉 *You're invited to join "${groupName}" on SplitSmart!*\n\n` +
    `Hey! ${currentUser.name} has added you to the group *${groupName}* to easily track and split shared expenses.\n\n` +
    `📌 *Invite Code:* \`${inviteCode}\`\n` +
    `🔗 *Open the app:* ${appUrl}\n\n` +
    `Simply sign up / log in and enter the invite code to join the group. Let's split smart! 💸`;

  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(waUrl, '_blank');
}
