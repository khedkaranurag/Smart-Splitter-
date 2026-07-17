// SplitSmart — dashboard.js

if (!requireAuth()) { /* redirected */ }

const currentUser = Auth.user();

// Populate navbar
document.getElementById('nav-name').textContent = currentUser.name;
document.getElementById('nav-avatar').textContent = getInitials(currentUser.name);
document.getElementById('nav-avatar').style.background = currentUser.avatarColor;
document.getElementById('user-greeting').textContent = currentUser.name.split(' ')[0];

function handleLogout() {
  Auth.logout();
  window.location.href = 'login.html';
}

async function loadDashboard() {
  try {
    const res = await GroupsAPI.list();
    const groups = res.data;
    renderGroups(groups);
  } catch (err) {
    showToast('Failed to load groups: ' + err.message, 'error');
    document.getElementById('groups-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <h3>Could not connect to backend</h3>
        <p>Make sure Spring Boot is running on localhost:8080</p>
      </div>`;
  }
}

function renderGroups(groups) {
  const grid = document.getElementById('groups-grid');

  if (!groups || groups.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📋</div>
        <h3>No groups yet</h3>
        <p>Create your first group to start splitting expenses with friends.</p>
        <button class="btn btn-primary mt-md" onclick="window.location.href='create-group.html'">
          ➕ Create Group
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = groups.map(g => groupCard(g)).join('');

  // Fetch balances for each group asynchronously
  groups.forEach(g => fetchGroupSummary(g.id));
}

function groupCard(group) {
  return `
    <div class="card card-interactive group-card animate-in"
         id="group-card-${group.id}"
         onclick="window.location.href='group.html?id=${group.id}'">
      <div class="group-card-header">
        <div class="group-type-icon">${groupTypeIcon(group.type)}</div>
        <div style="flex:1; margin-left:12px; min-width:0;">
          <div class="group-card-name">${escapeHtml(group.name)}</div>
          <div class="group-card-meta">
            ${groupTypeBadge(group.type)} &nbsp;·&nbsp; Code: <b>${group.inviteCode || '—'}</b>
          </div>
        </div>
      </div>
      <div class="group-card-members" id="members-${group.id}">
        <div class="skeleton" style="width:80px;height:16px;border-radius:4px;"></div>
      </div>
      <div class="group-card-balance" id="balance-${group.id}">
        <div class="skeleton" style="width:120px;height:14px;border-radius:4px;"></div>
      </div>
    </div>`;
}

async function fetchGroupSummary(groupId) {
  try {
    const [groupRes, balanceRes] = await Promise.all([
      GroupsAPI.get(groupId),
      GroupsAPI.balances(groupId)
    ]);

    // Render member avatars
    const members = groupRes.data.members || [];
    const membersEl = document.getElementById(`members-${groupId}`);
    if (membersEl) {
      const visible = members.slice(0, 5);
      const extra = members.length - visible.length;
      membersEl.innerHTML =
        visible.map(m =>
          `<div class="avatar" style="width:28px;height:28px;font-size:11px;border:2px solid var(--bg-secondary);margin-left:-8px;background:${m.avatarColor}">${getInitials(m.name)}</div>`
        ).join('') +
        (extra > 0 ? `<div class="more-count" style="width:28px;height:28px;background:var(--glass-bg);border:2px solid var(--glass-border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--text-secondary);margin-left:-8px;">+${extra}</div>` : '') +
        `<span style="margin-left:8px;font-size:12px;color:var(--text-muted)">${members.length} member${members.length !== 1 ? 's' : ''}</span>`;
      if (members.length > 0) membersEl.firstElementChild.style.marginLeft = '0';
    }

    // Render balance summary
    const balances = balanceRes.data;
    const balanceEl = document.getElementById(`balance-${groupId}`);
    if (balanceEl && balances.length > 0) {
      const currentUserBalance = balances.find(b => b.userId === currentUser.id);
      if (currentUserBalance) {
        const net = parseFloat(currentUserBalance.netBalance);
        if (net > 0.01) {
          balanceEl.innerHTML = `<span class="balance-positive">You are owed ${formatAmount(net)}</span>`;
        } else if (net < -0.01) {
          balanceEl.innerHTML = `<span class="balance-negative">You owe ${formatAmount(Math.abs(net))}</span>`;
        } else {
          balanceEl.innerHTML = `<span class="balance-zero">✅ You're all settled up</span>`;
        }
      } else {
        balanceEl.innerHTML = `<span class="text-muted text-sm">${balances.length} member balances</span>`;
      }
    } else if (balanceEl) {
      balanceEl.innerHTML = `<span class="text-muted text-sm">No expenses yet</span>`;
    }
  } catch (e) {
    // Silently fail for individual group summaries
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

loadDashboard();
