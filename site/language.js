// Translate the static page while preserving the markup used by scroll animations.
// Interactive sections translate their own state when the language changes.
const english = new Map(Object.entries({
  'Acasă': 'Home',
  'Explorează piesele': 'Explore parts',
  'Componentele robotului': 'Robot components',
  'Robot FTC în 3D': '3D FTC robot',
  'Se încarcă robotul…': 'Loading the robot…',
  'Robotul 3D nu este disponibil în acest browser.': 'The 3D robot is unavailable in this browser.',
  'Sub': 'Under the',
  'carcasă.': 'chassis.',
  'Apasă pe un ecuson pentru profil.': 'Tap a badge to open its profile.',
  'Alege un ecuson': 'Choose a badge',
  'Sari la echipă': 'Skip to the team',
  'Echipa FTC, început': 'FTC team home',
  'Navigare principală': 'Main navigation',
  'Secțiunile site-ului': 'Site sections',
  'Robotul': 'Robot',
  'Echipa': 'Team',
  'Din atelier': 'Workshop',
  'Sezon': 'Season',
  'Jurnal': 'Journal',
  'Parteneriate': 'Partnerships',
  'Meniu': 'Menu',
  'Explorează robotul 3D': 'Explore the 3D robot',
  'Din idee.': 'From an idea.',
  'În mișcare.': 'Into motion.',
  'Cunoaște echipa': 'Meet the team',
  'MECANISM DE RIDICARE': 'LIFT MECHANISM',
  'ELECTRONICĂ & CONTROL': 'ELECTRONICS & CONTROL',
  'ROȚI MECANUM': 'MECANUM WHEELS',
  'Descompune': 'Explode',
  'Structură': 'Wireframe',
  'Mecanisme': 'Mechanisms',
  'Comenzi robot 3D': '3D robot controls',
  'Perspectivă robot': 'Robot view',
  'Rotește robotul spre stânga': 'Rotate robot left',
  'Rotește robotul spre dreapta': 'Rotate robot right',
  'Mărește robotul': 'Zoom in',
  'Micșorează robotul': 'Zoom out',
  'Ecusoane suspendate 3D. Trage un ecuson pentru balans sau selectează un membru și folosește butoanele de mai jos.': '3D lanyard badges. Drag a badge to swing it or select a member and use the buttons below.',
  'Se pregătesc ecusoanele…': 'Loading the badges…',
  'Grupul anterior de ecusoane': 'Previous group of badges',
  'Următorul grup de ecusoane': 'Next group of badges',
  'Anterior': 'Previous',
  'Următorul': 'Next',
  'Animația ecusonului selectat': 'Selected badge controls',
  'Balans': 'Swing',
  'Întoarce ecusonul': 'Flip badge',
  'Așază ecusoanele': 'Reset badges',
  'Cei 15 membri': 'All 15 members',
  'Întrebăm.': 'Ask.',
  'Înțelegem provocarea. Ascultăm ideile. Alegem ce merită încercat.': 'Understand the challenge. Hear everyone’s ideas. Choose what to try.',
  'Proiectăm.': 'Design.',
  'Din schițe și conversații apar soluții. Din soluții, primul prototip.': 'Sketches and conversations become ideas we can turn into a first prototype.',
  'Construim.': 'Build.',
  'Materialele, electronica și codul devin un singur mecanism.': 'Materials, electronics and code come together in one mechanism.',
  'Încercăm din nou.': 'Try again.',
  'Testăm. Observăm. Ajustăm. Fiecare încercare ne duce mai departe.': 'We test, observe and adjust. Each attempt takes us a step further.',
  'Un site independent de echipă. FIRST® și FTC® sunt mărci ale FIRST.': 'An independent team website. FIRST® and FTC® are trademarks of FIRST.'
}));

const bindings = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode;
  const original = node.textContent;
  const key = original.trim();
  if (english.has(key)) {
    bindings.push(lang => { node.textContent = lang === 'ro' ? original : original.replace(key, english.get(key)); });
  }
}
for (const element of document.querySelectorAll('[aria-label]')) {
  const original = element.getAttribute('aria-label');
  if (english.has(original)) {
    bindings.push(lang => element.setAttribute('aria-label', lang === 'ro' ? original : english.get(original)));
  }
}

const toggle = document.getElementById('language-toggle');
function setLanguage(lang) {
  document.documentElement.lang = lang;
  for (const translate of bindings) translate(lang);
  const next = lang === 'ro' ? 'en' : 'ro';
  toggle.lang = next;
  toggle.textContent = next.toUpperCase();
  toggle.setAttribute('aria-label', next === 'en' ? 'Switch to English' : 'Schimbă limba în română');
  document.title = lang === 'ro' ? 'Echipa FTC · Idei în mișcare' : 'FTC Team · Ideas in motion';
  document.querySelector('meta[name="description"]').content = lang === 'ro'
    ? 'Cunoaște echipa FTC și explorează robotul 3D.'
    : 'Meet the FTC team and explore the 3D robot.';
  document.dispatchEvent(new CustomEvent('site:language', { detail: { lang } }));
}
let savedLanguage = 'ro';
try { savedLanguage = localStorage.getItem('ftc-language'); } catch {}
setLanguage(savedLanguage === 'en' ? 'en' : 'ro');
toggle.addEventListener('click', () => {
  const lang = document.documentElement.lang === 'ro' ? 'en' : 'ro';
  setLanguage(lang);
  try { localStorage.setItem('ftc-language', lang); } catch {}
});

const menu = document.querySelector('.site-menu');
menu.addEventListener('click', event => {
  if (event.target.closest('a')) menu.open = false;
});
document.addEventListener('pointerdown', event => {
  if (!menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
