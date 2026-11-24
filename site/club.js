const regionUrl = 'https://ftc-events.firstinspires.org/2026/region/RO';
const meetUrl = 'https://natieprineducatie.ro/meets/';
const programmeChannel = 'https://www.youtube.com/@NatieprinEducatie';
const nationalKickoff = 'https://www.youtube.com/watch?v=NAgFfjUrElk';

const seasonEvents = [
  { date: '2026-12-13', title: 'Meetmas is coming!', town: ['Pitești', 'Pitești'], code: 'ROB2M2' },
  { date: '2026-12-19', title: 'CODEHIVE', town: ['București', 'Bucharest'], code: 'ROB2M5' },
  { date: '2026-12-19', title: 'DynaMeet', town: ['Galați', 'Galați'], code: 'ROBRM1' }
];

const journal = [
  {
    category: ['Antrenamente', 'Practice'],
    title: ['Exercițiu de pilotaj în pătrat', 'A square driving drill'],
    body: ['Marchează pe podea patru colțuri și orientează robotul spre același perete pe tot traseul. Alternează mersul înainte cu deplasarea laterală. După un tur, măsoară distanța dintre poziția de start și cea de sosire. Repetă la o viteză mai mică și compară abaterile.', 'Mark four corners on the floor. Keep the robot facing the same wall while you drive the square, alternating forward motion and strafing. Measure how far the robot finishes from its starting point. Try again at a lower speed and compare the two distances.']
  },
  {
    category: ['Proiecte', 'Projects'],
    title: ['Cum se mișcă modelul 3D', 'How the 3D model moves'],
    body: ['Pornește mecanismele și urmărește șinele elevatorului. În vederea descompusă poți vedea unde se prinde elevatorul de șasiu și cât de aproape trec cablurile de piesele mobile.', 'Run the mechanisms and follow the lift rails. Switch to the exploded view to see how the lift meets the chassis and where the cables pass beside moving parts.'],
    link: ['Explorează modelul', 'Explore the model'], href: '#top'
  },
  {
    category: ['Outreach', 'Outreach'],
    title: ['Idee de atelier pentru o clasă', 'A classroom workshop idea'],
    body: ['Pe coli de hârtie, elevii desenează un traseu între două obstacole. În perechi, un elev dă instrucțiuni de mișcare, iar celălalt le urmează cu un robot de carton. La final, schimbă rolurile și încearcă să reducă numărul de instrucțiuni.', 'Ask students to draw a route between two obstacles on paper. In pairs, one student gives movement instructions and the other follows them using a cardboard robot. Swap roles and try to complete the route with fewer instructions.']
  },
  {
    category: ['Noutăți', 'News'],
    title: ['Lansarea sezonului BIOBUZZ', 'The BIOBUZZ season kickoff'],
    body: ['Nație Prin Educație a prezentat tema sezonului 2026–2027 la lansarea FTC România. Înregistrarea evenimentului este disponibilă pe canalul organizatorului.', 'Nație Prin Educație introduced the 2026–2027 game at the Romanian FTC season kickoff. Watch the event recording on the organiser’s channel.'],
    link: ['Vezi înregistrarea', 'Watch the kickoff'], href: nationalKickoff
  }
];

const copy = {
  seasonTitle: ['Sezonul FTC', 'FTC season'],
  calendar: ['Calendarul competițiilor din România', 'Competition calendar in Romania'],
  calendarIntro: ['Decembrie 2026', 'December 2026'],
  calendarLink: ['Calendarul FTC România', 'FTC Romania calendar'],
  results: ['Rezultate', 'Results'],
  resultsIntro: ['Meciuri și clasamente din România.', 'Matches and rankings in Romania.'],
  resultsLink: ['Rezultate oficiale FIRST', 'Official FIRST results'],
  journalTitle: ['Jurnal de echipă', 'Team journal'],
  partnersTitle: ['Sponsori și parteneri', 'Sponsors and partners'],
  partnersIntro: ['Poți propune o colaborare pentru piese, timp de atelier, mentorat sau deplasarea la competiții.', 'Interested in supplying parts, offering workshop time, mentoring students or supporting competition travel?'],
  formTitle: ['Propune o colaborare', 'Propose a partnership'],
  formHelp: ['Pregătește mesajul, apoi trimite-l unui membru pe Instagram.', 'Prepare a message, then send it to a team member on Instagram.'],
  organisation: ['Organizație sau nume', 'Organisation or name'],
  contact: ['E-mail de contact', 'Contact email'],
  offer: ['Ce colaborare propui?', 'What would you like to offer?'],
  prepare: ['Pregătește mesajul', 'Prepare message'],
  draft: ['Mesajul tău', 'Your message'],
  copy: ['Copiază mesajul', 'Copy message'],
  copied: ['Mesaj copiat.', 'Message copied.'],
  select: ['Textul este selectat și îl poți copia manual.', 'The message is selected for manual copying.'],
  choose: ['Alege un membru', 'Choose a member'],
  salutation: ['Bună, echipă FTC!', 'Hello FTC team!'],
  proposal: ['Vă scriu în legătură cu un parteneriat.', 'I am getting in touch about a partnership.'],
  reply: ['Îmi puteți răspunde la', 'You can reach me at'],
  contactTitle: ['Contact', 'Contact'],
  teamSocial: ['Membrii pe Instagram', 'Members on Instagram'],
  youtube: ['FTC România pe YouTube', 'FTC Romania on YouTube']
};

const root = document.getElementById('club-sections');
const languageIndex = () => document.documentElement.lang.startsWith('en') ? 1 : 0;
const tr = key => copy[key][languageIndex()];

// All link labels and targets originate in the local editorial content above.
function link(href, title, className = 'club-link') {
  const external = href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${className}" href="${href}"${external}>${title}</a>`;
}

function renderEvents() {
  const lang = languageIndex();
  const formatter = new Intl.DateTimeFormat(lang ? 'en-GB' : 'ro-RO', {day: 'numeric', month: 'short', timeZone: 'UTC'});
  return seasonEvents.map(event => {
    const date = formatter.format(new Date(event.date));
    return `<li><a href="https://ftc-events.firstinspires.org/2026/${event.code}" target="_blank" rel="noopener noreferrer">
      <time datetime="${event.date}">${date}</time><strong>${event.title}</strong>
      <span class="club-town">${event.town[lang]}</span></a></li>`;
  }).join('');
}

function renderJournal(openEntries) {
  const lang = languageIndex();
  return journal.map((entry, i) => `<details class="club-entry" ${openEntries.includes(i) ? 'open' : ''}>
    <summary><span class="club-category">${entry.category[lang]}</span><h3>${entry.title[lang]}</h3>
      <span class="club-open-mark" aria-hidden="true">+</span></summary>
    <div class="club-entry-text"><p>${entry.body[lang]}</p>${entry.href ? link(entry.href, entry.link[lang]) : ''}</div></details>`).join('');
}

function render() {
  const form = root.querySelector('form');
  const values = form ? new FormData(form) : null;
  const draftOpen = root.querySelector('.club-draft') && !root.querySelector('.club-draft').hidden;
  const openEntries = [...root.querySelectorAll('.club-entry')].flatMap((item, index) => item.open ? [index] : []);
  root.innerHTML = `<section id="sezon" class="club-section club-season" aria-labelledby="club-season-title">
    <div class="club-wrap"><h2 id="club-season-title">${tr('seasonTitle')}</h2>
    <div class="club-season-grid"><div><h3>${tr('calendar')}</h3><p>${tr('calendarIntro')}</p>
      <ul class="club-events">${renderEvents()}</ul>${link(meetUrl, tr('calendarLink'))}</div>
    <aside class="club-results"><h3>${tr('results')}</h3><p>${tr('resultsIntro')}</p>${link(regionUrl, tr('resultsLink'))}</aside></div></div></section>
    <section id="jurnal" class="club-section club-journal" aria-labelledby="club-journal-title">
    <div class="club-wrap"><h2 id="club-journal-title">${tr('journalTitle')}</h2>${renderJournal(openEntries)}</div></section>
    <section id="parteneri" class="club-section club-partners" aria-labelledby="club-partner-title"><div class="club-wrap club-partner-grid">
      <div><h2 id="club-partner-title">${tr('partnersTitle')}</h2><p>${tr('partnersIntro')}</p></div>
      <div class="club-compose"><h3>${tr('formTitle')}</h3><p>${tr('formHelp')}</p>
      <form id="club-proposal">
      <label>${tr('organisation')}<input name="organisation" autocomplete="organization" maxlength="120" required></label>
      <label>${tr('contact')}<input name="email" type="email" autocomplete="email" maxlength="180" required></label>
      <label>${tr('offer')}<textarea name="offer" rows="3" maxlength="2000" required></textarea></label>
      <button class="club-solid" type="submit">${tr('prepare')}</button></form>
      <div class="club-draft" hidden><label for="club-draft-preview">${tr('draft')}</label><textarea id="club-draft-preview" rows="6" readonly></textarea>
      <div class="club-actions"><button type="button" class="club-outline" data-copy>${tr('copy')}</button>${link('#echipa', tr('choose'))}</div>
      <span class="club-status" aria-live="polite"></span></div></div></div></section>
    <section id="contact" class="club-section club-contact" aria-labelledby="club-contact-title"><div class="club-wrap">
    <h2 id="club-contact-title">${tr('contactTitle')}</h2>
    <div class="club-contact-links">${link('#echipa', tr('teamSocial'))}${link(programmeChannel, tr('youtube'))}${link('#parteneri', tr('formTitle'))}</div></div></section>`;
  if (values) {
    for (const [name, value] of values) root.querySelector('form').elements.namedItem(name).value = value;
  }
  if (draftOpen) showDraft(false);
}

function showDraft(focus) {
  const form = root.querySelector('form');
  const draft = root.querySelector('.club-draft');
  const data = new FormData(form);
  const output = draft.querySelector('textarea');
  output.value = [
    tr('salutation'), tr('proposal'), data.get('offer').trim(),
    `${data.get('organisation').trim()}\n${tr('reply')} ${data.get('email').trim()}.`
  ].join('\n\n');
  draft.hidden = false;
  draft.querySelector('.club-status').textContent = '';
  if (focus) output.focus();
}

if (root) {
  render();
  document.addEventListener('site:language', render);
  root.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const empty = [...form.elements].find(field => field.required && !field.value.trim());
    if (empty) {
      empty.value = '';
      empty.reportValidity();
      return;
    }
    showDraft(true);
  });
  root.addEventListener('input', event => {
    if (event.target.form) root.querySelector('.club-draft').hidden = true;
  });
  root.addEventListener('click', async event => {
    if (!event.target.closest('[data-copy]')) return;
    const preview = root.querySelector('#club-draft-preview');
    const status = root.querySelector('.club-status');
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = tr('copied');
    } catch {
      preview.focus();
      preview.select();
      status.textContent = tr('select');
    }
  });
}
