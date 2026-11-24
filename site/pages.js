const root = document.documentElement;
const slugs = { chassis: 'sasiu', wheels: 'roti', electronics: 'electronica', lift: 'lift', gripper: 'cleste', intake: 'colector' };

function readPage(url) {
  const requested = url.searchParams.get('pagina');
  return ['echipa', 'robot'].includes(requested) ? requested : 'home';
}

export function currentPart() {
  const slug = new URL(location.href).searchParams.get('piesa');
  return Object.keys(slugs).find(key => slugs[key] === slug) || 'gripper';
}

function labelPage() {
  const en = root.lang === 'en';
  const titles = en
    ? { robot: 'Robot · FTC Team', echipa: 'Members · FTC Team', home: 'FTC Team · Ideas in motion' }
    : { robot: 'Robotul · Echipa FTC', echipa: 'Membri · Echipa FTC', home: 'Echipa FTC · Idei în mișcare' };
  document.title = titles[root.dataset.page];
  for (const link of document.querySelectorAll('.header nav a')) {
    const page = new URL(link.href).searchParams.get('pagina');
    if (page && page === root.dataset.page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function showPage(url, previous, scrollYTo, focusHeading) {
  const page = readPage(url);
  root.dataset.page = page;
  labelPage();
  document.dispatchEvent(new CustomEvent('site:page', { detail: { page, previous, part: currentPart() } }));
  if (previous !== page || page === 'home') {
    if (scrollYTo !== undefined) window.scrollTo({ top: scrollYTo, behavior: 'instant' });
    else {
      const anchor = page === 'home' && url.hash ? document.getElementById(url.hash.slice(1)) : null;
      if (anchor) anchor.scrollIntoView({ behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (focusHeading && page !== 'home') {
      document.getElementById(page === 'robot' ? 'studio-title' : 'team-title').focus({ preventScroll: true });
    }
  }
}

function navigate(url, replace = false) {
  const previous = root.dataset.page;
  if (url.href !== location.href) {
    if (!replace) history.replaceState({ ...history.state, ftcScroll: scrollY }, '');
    history[replace ? 'replaceState' : 'pushState']({ ftcScroll: 0 }, '', url);
  }
  showPage(url, previous, undefined, true);
}

export function inspectPart(key) {
  if (!Object.hasOwn(slugs, key)) return;
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.set('pagina', 'robot');
  url.searchParams.set('piesa', slugs[key]);
  navigate(url, root.dataset.page === 'robot');
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname) return;
  if (link.getAttribute('href').startsWith('#')) {
    url.searchParams.delete('pagina');
    url.searchParams.delete('piesa');
  }
  if (readPage(url) === 'home' && root.dataset.page === 'home') return;
  event.preventDefault();
  navigate(url);
});
window.addEventListener('popstate', event => showPage(new URL(location.href), root.dataset.page, event.state?.ftcScroll, false));
document.addEventListener('site:language', labelPage);
labelPage();
