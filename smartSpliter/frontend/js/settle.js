// SplitSmart — settle.js
// Algorithm visualization using D3.js force-directed graph.

if (!requireAuth()) { /* redirected */ }

const currentUser = Auth.user();
const groupId     = parseInt(getUrlParam('id'));
if (!groupId) window.location.href = 'dashboard.html';

document.getElementById('nav-name').textContent = currentUser.name;
document.getElementById('nav-avatar').textContent = getInitials(currentUser.name);
document.getElementById('nav-avatar').style.background = currentUser.avatarColor;
document.getElementById('back-btn').onclick = () => window.location.href = `group.html?id=${groupId}`;

let balances       = [];
let transactions   = [];
let groupName      = '';
let optimized      = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const groupRes = await GroupsAPI.get(groupId);
    groupName = groupRes.data.name;
    document.getElementById('group-name-display').textContent = groupName;
    document.title = `Settle — ${groupName} — SplitSmart`;

    const balanceRes = await GroupsAPI.balances(groupId);
    balances = balanceRes.data || [];

    document.getElementById('settle-stats').style.display = 'grid';
    document.getElementById('settle-actions').style.display = 'flex';
    document.getElementById('loading-state').style.display = 'none';

    const memberCount  = balances.length;
    const naiveCount   = memberCount > 1 ? Math.ceil((memberCount * (memberCount - 1)) / 2) : 0;

    document.getElementById('stat-members').textContent = memberCount;
    document.getElementById('stat-before').textContent  = naiveCount;
    document.getElementById('stat-after').textContent   = '?';
    document.getElementById('settle-subtitle').innerHTML = `Minimum transactions needed to settle <strong>${groupName}</strong>`;

    // Draw the "before" graph (all debts as a web)
    drawBeforeGraph(balances, groupRes.data.members || []);

  } catch (err) {
    showToast('Error loading settlement data: ' + err.message, 'error');
  }
}

// ─── Before Graph (naive — full mesh of debtors to creditors) ─────────────────
function drawBeforeGraph(balances, members) {
  const svg = document.getElementById('settle-graph');
  svg.style.display = 'block';
  document.getElementById('graph-label').textContent = 'BEFORE OPTIMIZATION — ALL DEBTS';

  const W = svg.clientWidth || 800;
  const H = 360;
  d3.select('#settle-graph').selectAll('*').remove();

  const d3svg = d3.select('#settle-graph')
    .attr('width', W)
    .attr('height', H);

  // Nodes = members with balances
  const nodes = balances.map(b => ({
    id:    b.userId,
    name:  b.userName,
    color: b.avatarColor,
    net:   parseFloat(b.netBalance)
  }));

  // Links = creditors ↔ debtors (full mesh for "before" view)
  const creditors = nodes.filter(n => n.net >  0.01);
  const debtors   = nodes.filter(n => n.net < -0.01);
  const links = [];
  debtors.forEach(d => {
    creditors.forEach(c => {
      links.push({ source: d.id, target: c.id, value: Math.min(Math.abs(d.net), Math.abs(c.net)) });
    });
  });

  renderD3Graph(d3svg, nodes, links, W, H, false);
}

// ─── Run Optimization ─────────────────────────────────────────────────────────
async function runOptimization() {
  const btn = document.getElementById('optimize-btn');
  setLoading(btn, true);

  try {
    const res = await SettleAPI.compute(groupId);
    transactions = res.data || [];
    optimized = true;

    if (transactions.length === 0) {
      // Everyone is settled
      document.getElementById('all-settled').style.display = 'flex';
      document.getElementById('settle-actions').style.display = 'none';
      document.getElementById('graph-area').style.display = 'none';
      document.getElementById('settle-stats').style.display = 'none';
      return;
    }

    // Update stats
    document.getElementById('stat-after').textContent = transactions.length;

    // Animate graph transition
    await animateGraphTransition(transactions);

    // Show transaction list
    renderTransactions(transactions);
    document.getElementById('transactions-area').style.display = 'block';
    document.getElementById('tx-count-badge').textContent = `${transactions.length} transfers`;

    // Show confirm button, hide optimize button
    btn.style.display = 'none';
    document.getElementById('confirm-btn').style.display = 'flex';

    showToast(`Optimized! Only ${transactions.length} transfer${transactions.length > 1 ? 's' : ''} needed 🎉`, 'success');

  } catch (err) {
    showToast('Optimization failed: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ─── Graph Animation: Before → After ─────────────────────────────────────────
async function animateGraphTransition(transactions) {
  return new Promise(resolve => {
    document.getElementById('graph-label').textContent = 'ANIMATING OPTIMIZATION...';

    const svg  = document.getElementById('settle-graph');
    const W    = svg.clientWidth || 800;
    const H    = 360;
    const d3svg = d3.select('#settle-graph');

    // Fade out old graph
    d3svg.transition().duration(500).style('opacity', 0).on('end', () => {
      d3svg.selectAll('*').remove();

      // Build nodes from transactions
      const nodeMap = {};
      transactions.forEach(tx => {
        if (!nodeMap[tx.fromUserId]) nodeMap[tx.fromUserId] = { id: tx.fromUserId, name: tx.fromUserName, color: tx.fromUserAvatar, isDebtor: true };
        if (!nodeMap[tx.toUserId])   nodeMap[tx.toUserId]   = { id: tx.toUserId,   name: tx.toUserName,   color: tx.toUserAvatar,   isDebtor: false };
      });
      const nodes = Object.values(nodeMap);
      const links = transactions.map(tx => ({
        source: tx.fromUserId,
        target: tx.toUserId,
        value:  parseFloat(tx.amount),
        label:  formatAmount(tx.amount)
      }));

      // Draw optimized graph
      renderD3Graph(d3svg, nodes, links, W, H, true);
      document.getElementById('graph-label').textContent = 'AFTER OPTIMIZATION — MINIMUM TRANSACTIONS';

      // Fade in
      d3svg.style('opacity', 0).transition().duration(600).style('opacity', 1).on('end', resolve);
    });
  });
}

// ─── D3 Force Graph ───────────────────────────────────────────────────────────
function renderD3Graph(d3svg, nodes, links, W, H, showLabels) {
  const defs = d3svg.append('defs');

  // Arrow marker
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 32)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .append('path')
    .attr('d', 'M 0,-4 L 10,0 L 0,4')
    .attr('fill', '#7c3aed')
    .style('opacity', 0.7);

  // Force simulation
  const simulation = d3.forceSimulation(nodes.map(n => ({ ...n })))
    .force('link', d3.forceLink(
      links.map(l => ({ ...l }))
    ).id(d => d.id).distance(130))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(50));

  const linkSel = d3svg.append('g')
    .selectAll('line')
    .data(simulation.force('link').links())
    .join('line')
    .attr('stroke', showLabels ? '#10b981' : '#7c3aed')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.5)
    .attr('marker-end', 'url(#arrowhead)');

  // Edge weight labels (shown in after view)
  const edgeLabelSel = showLabels
    ? d3svg.append('g')
        .selectAll('text')
        .data(simulation.force('link').links())
        .join('text')
        .attr('font-size', 11)
        .attr('font-weight', '700')
        .attr('fill', '#6ee7b7')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .text(d => d.label || '')
    : null;

  const nodeSel = d3svg.append('g')
    .selectAll('g')
    .data(simulation.nodes())
    .join('g')
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
    );

  // Node circle
  nodeSel.append('circle')
    .attr('r', 28)
    .attr('fill', d => d.color || '#7c3aed')
    .attr('stroke', showLabels
      ? d => d.isDebtor ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.6)'
      : 'rgba(255,255,255,0.15)')
    .attr('stroke-width', 2.5);

  // Initials text
  nodeSel.append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('font-weight', '700')
    .attr('fill', 'white')
    .attr('font-family', 'Inter, sans-serif')
    .text(d => getInitials(d.name));

  // Name label below circle
  nodeSel.append('text')
    .attr('dy', '3em')
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', 'rgba(255,255,255,0.7)')
    .attr('font-family', 'Inter, sans-serif')
    .text(d => d.name.split(' ')[0]);

  simulation.on('tick', () => {
    const simLinks = simulation.force('link').links();
    const simNodes = simulation.nodes();

    linkSel
      .data(simLinks)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    if (edgeLabelSel) {
      edgeLabelSel
        .data(simLinks)
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 10);
    }

    nodeSel
      .data(simNodes)
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

// ─── Transaction List ─────────────────────────────────────────────────────────
function renderTransactions(txs) {
  const list = document.getElementById('transactions-list');
  list.innerHTML = txs.map((tx, i) => `
    <div class="transaction-card animate-in" style="animation-delay:${i * 0.08}s">
      <div class="avatar" style="background:${tx.fromUserAvatar}">${getInitials(tx.fromUserName)}</div>
      <div>
        <div class="font-600">${escapeHtml(tx.fromUserName)}</div>
        <div class="text-xs text-muted">sends to</div>
      </div>
      <div class="transaction-arrow">→</div>
      <div>
        <div class="font-600">${escapeHtml(tx.toUserName)}</div>
        <div class="text-xs text-muted">receives</div>
      </div>
      <div class="avatar" style="background:${tx.toUserAvatar}">${getInitials(tx.toUserName)}</div>
      <div class="transaction-amount">${formatAmount(tx.amount)}</div>
    </div>`
  ).join('');
}

// ─── Confirm Settlement ───────────────────────────────────────────────────────
async function confirmSettlement() {
  const btn = document.getElementById('confirm-btn');
  if (!confirm('Confirm all settlements and archive this group?')) return;
  setLoading(btn, true);
  try {
    await SettleAPI.confirm(groupId);
    showToast('Group settled and archived! 🎉', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    setLoading(btn, false);
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
