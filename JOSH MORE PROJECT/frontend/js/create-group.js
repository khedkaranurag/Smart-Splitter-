// SplitSmart — create-group.js

if (!requireAuth()) { /* redirected */ }

const currentUser = Auth.user();
document.getElementById('nav-name').textContent = currentUser.name;
document.getElementById('nav-avatar').textContent = getInitials(currentUser.name);
document.getElementById('nav-avatar').style.background = currentUser.avatarColor;

let selectedType  = 'ROOMMATES';
let emailRowCount = 1;

const typeIcons = { ROOMMATES: '🏠', TRIP: '✈️', FRIENDS: '👥', CUSTOM: '➕' };

function selectType(type, card) {
  selectedType = type;
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  document.getElementById('type-icon-preview').textContent = typeIcons[type];

  // Suggest a name if the field is empty
  const nameField = document.getElementById('group-name');
  if (!nameField.value) {
    const suggestions = {
      ROOMMATES: 'Flat mates', TRIP: 'Goa Trip 2025',
      FRIENDS:   'Weekend crew', CUSTOM: 'Our group'
    };
    nameField.placeholder = suggestions[type];
  }
}

function addEmailRow() {
  const container = document.getElementById('email-rows');
  const idx = emailRowCount++;
  const row = document.createElement('div');
  row.className = 'invite-row';
  row.id = `email-row-${idx}`;
  row.style.marginTop = '8px';
  row.innerHTML = `
    <input class="form-input" type="email" placeholder="friend@example.com" id="email-${idx}" />
    <button type="button" class="btn btn-ghost btn-sm" onclick="removeEmailRow(${idx})">✕</button>`;
  container.appendChild(row);
  document.getElementById(`email-${idx}`).focus();
}

function removeEmailRow(idx) {
  const row = document.getElementById(`email-row-${idx}`);
  if (row) row.remove();
}

function getEmails() {
  const inputs = document.querySelectorAll('#email-rows input[type="email"]');
  return Array.from(inputs)
    .map(i => i.value.trim())
    .filter(v => v.length > 0);
}

async function handleCreate(e) {
  e.preventDefault();
  const btn   = document.getElementById('create-btn');
  const error = document.getElementById('create-error');
  error.style.display = 'none';

  const name   = document.getElementById('group-name').value.trim();
  const emails = getEmails();

  if (!name) {
    error.textContent = 'Please enter a group name.';
    error.style.display = 'block';
    return;
  }

  setLoading(btn, true);
  try {
    const res = await GroupsAPI.create({
      name,
      type: selectedType,
      memberEmails: emails
    });

    const group = res.data;
    showToast(`Group "${name}" created!`, 'success');
    setTimeout(() => window.location.href = `group.html?id=${group.id}`, 700);
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
    setLoading(btn, false);
  }
}
