const handles = [
  'ms.ria13', 'rpx.andy', 'sanda_gabriela16', '_qqbianca', 'butiseacax',
  'n_alisia17', 'zzd.martin', 'ony.craciunescu', 'rpx_dennis', 'arian_artan23',
  'missdmarina', 'macarie_gabriel', 'luca.drila', 'nicolaetoth', 'iulian_lupu1235'
];

const inks = ['#c3e798', '#b7cfdf', '#d2bfe4', '#e6c8af', '#b4d4c6'];
export const members = handles.map((handle, index) => {
  const parts = handle.split(/[._]+/).filter(Boolean);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : handle.slice(0, 2);
  return {
    id: index + 1,
    number: String(index + 1).padStart(2, '0'),
    handle,
    monogram: initials.toUpperCase(),
    color: inks[index % inks.length],
    url: 'https://www.instagram.com/' + handle + '/'
  };
});

export function teamLabel(ro, en) {
  return document.documentElement.lang === 'en' ? en : ro;
}

let selected = members[0];
let openMember = null;
let panel, launcher, closeButton, number, monogram, title, link, opener, fallback, content, stage;
let presentation, closing = false;

export function registerBadgePresentation(controller) {
  presentation = controller;
}

function element(tag, className, parent) {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
}

function updateLabels() {
  launcher.textContent = teamLabel('Vezi profilul · @', 'View profile · @') + selected.handle;
  if (openMember) {
    number.textContent = teamLabel('Membru FTC', 'FTC member') + ' / ' + openMember.number;
    const instagramLabel = teamLabel('Deschide pe Instagram', 'View on Instagram');
    link.textContent = instagramLabel;
    link.setAttribute('aria-label', instagramLabel + ' · @' + openMember.handle
      + teamLabel(' (filă nouă)', ' (new tab)'));
  }
  closeButton.textContent = teamLabel('Închide', 'Close') + ' ×';
  closeButton.setAttribute('aria-label', teamLabel('Închide profilul', 'Close profile'));
  for (const button of fallback.querySelectorAll('button')) {
    const member = members[Number(button.dataset.index)];
    button.setAttribute('aria-label', teamLabel('Deschide profilul @', 'Open profile of @') + member.handle);
  }
}

export function selectMember(member) {
  selected = member;
  if (launcher) updateLabels();
}

export function openMemberProfile(member, trigger) {
  if (panel.open) return;
  selectMember(member);
  openMember = member;
  opener = trigger ?? launcher;
  title.textContent = '@' + member.handle;
  monogram.textContent = member.monogram;
  panel.style.setProperty('--member-color', member.color);
  link.href = member.url;
  updateLabels();
  const live = presentation?.prepare(member) === true;
  panel.classList.toggle('live-badge', live);
  panel.dataset.readable = String(!live);
  (live ? panel : content).append(link);
  panel.showModal();
  if (live) presentation.open(member, { stage, panel, link });
  closeButton.focus({preventScroll:true});
}

function closeProfile(immediate = false) {
  if (!panel.open || (closing && !immediate)) return;
  closing = true;
  const finish = () => {
    if (panel.open) panel.close();
  };
  if (panel.classList.contains('live-badge')) {
    presentation.close(finish, immediate);
  } else {
    finish();
  }
}

export function initTeamProfiles() {
  if (panel) return;
  fallback = document.querySelector('#badge-fallback');
  launcher = element('button', 'member-launch', document.querySelector('.badge-actions'));
  launcher.type = 'button';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.addEventListener('click', () => openMemberProfile(selected, launcher));

  panel = element('dialog', 'member-profile', document.body);
  panel.setAttribute('aria-labelledby', 'member-profile-title');
  stage = element('div', 'member-stage', panel);
  stage.setAttribute('aria-hidden','true');
  content = element('div', 'member-profile-inner', panel);
  closeButton = element('button', 'member-close', panel);
  closeButton.type = 'button';
  closeButton.addEventListener('click', () => closeProfile());
  const identity = element('div', 'member-identity', content);
  identity.setAttribute('aria-hidden', 'true');
  monogram = element('span', 'member-monogram', identity);
  number = element('p', 'member-number', content);
  title = element('h2', 'member-handle', content);
  title.id = 'member-profile-title';
  link = element('a', 'member-instagram', content);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  panel.addEventListener('click', event => {
    if (event.target === panel && !panel.classList.contains('live-badge')) closeProfile();
  });
  panel.addEventListener('cancel', event => { event.preventDefault(); closeProfile(); });
  document.addEventListener('site:page', () => { if(panel.open) closeProfile(true); });
  panel.addEventListener('close', () => {
    openMember = null;
    closing = false;
    panel.classList.remove('live-badge');
    if (opener?.isConnected && opener.getClientRects().length) opener.focus({preventScroll:true});
  });
  document.addEventListener('site:language', updateLabels);
  updateLabels();
}

export function showTeamFallback() {
  initTeamProfiles();
  document.querySelector('#badge-canvas').hidden = true;
  document.querySelector('.badge-controls').hidden = true;
  document.querySelector('.badge-actions').hidden = true;
  document.querySelector('.roster-strip').hidden = true;
  fallback.hidden = false;
  fallback.replaceChildren();
  for (const [index, member] of members.entries()) {
    const button = element('button', 'member-flat', fallback);
    button.type = 'button';
    button.dataset.index = String(index);
    button.style.setProperty('--member-color', member.color);
    button.setAttribute('aria-haspopup', 'dialog');
    const symbol = element('span', 'member-flat-symbol', button);
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = member.monogram;
    element('span', 'member-flat-name', button).textContent = '@' + member.handle;
    button.addEventListener('click', () => openMemberProfile(member, button));
  }
  updateLabels();
}
