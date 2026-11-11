/** One transient, accessible reader. Account/route changes abort the request;
 * no exercise or remote HTML is persisted or injected into the workspace. */
'use strict';
let improReaderSession = null;
function improReaderClose() {
  const session = improReaderSession;
  improReaderSession = null;
  session?.abort.abort();
  document.getElementById('impro-reader')?.remove();
  if (session?.opener?.isConnected) session.opener.focus({ preventScroll: true });
}
function improReaderContent(row) {
  const blocks = (Array.isArray(row.blocks) ? row.blocks : []).filter(
    (b) => ['p', 'h2', 'h3', 'h4', 'li'].includes(b.kind) && typeof b.text === 'string',
  );
  return `<p class="impro-reader-source">${esc(row.sourceName)} · ${row.full ? 'Texte de la fiche' : 'Aperçu'}</p><div class="impro-reader-copy">${blocks.map((b) => (b.kind === 'li' ? `<p class="impro-reader-item">• ${esc(b.text)}</p>` : `<${b.kind}>${esc(b.text)}</${b.kind}>`)).join('') || `<p>${esc(row.excerpt || 'Aucun aperçu textuel disponible.')}</p>`}</div><footer><p>${esc(row.notice)}</p>${row.full ? `<p>${esc(row.author)} · <a href="${esc(practiceExampleLink(row.licenceURL))}" target="_blank" rel="noopener noreferrer">${esc(row.licence)} ↗</a>${row.historyURL ? ` · <a href="${esc(practiceExampleLink(row.historyURL))}" target="_blank" rel="noopener noreferrer">Historique et contributions ↗</a>` : ''}</p>` : ''}<p>Consultée le ${esc(new Date(row.checkedAt).toLocaleString('fr-FR'))}. Le site d’origine reste la référence pour les mises à jour.</p><a class="secondary" href="${esc(practiceExampleLink(row.url))}" target="_blank" rel="noopener noreferrer">Voir la fiche d’origine ↗</a></footer>`;
}
async function improReaderOpen(row, opener) {
  improReaderClose();
  const modal = document.createElement('dialog');
  modal.id = 'impro-reader';
  modal.setAttribute('aria-labelledby', 'impro-reader-title');
  modal.innerHTML = `<header><div><small>Lecture dans CompagnieCraft</small><h2 id="impro-reader-title">${esc(row.title)}</h2></div><button type="button" data-impro-reader-close aria-label="Fermer la fiche">×</button></header><div id="impro-reader-body" aria-live="polite"><p role="status">Lecture de la fiche et vérification de sa licence…</p></div>`;
  document.body.append(modal);
  const session = {
    abort: new AbortController(),
    opener,
    tenant,
    account: personalScope,
    hash: location.hash,
  };
  improReaderSession = session;
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    improReaderClose();
  });
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-impro-reader-close]')) improReaderClose();
  });
  modal.showModal();
  const timer = setTimeout(() => session.abort.abort(), 12000);
  try {
    let result;
    const params = { source: row.sourceId, url: row.url };
    if (window.ATELIER_SERVER) result = await window.ATELIER_ACCESS.call('impro-read', params);
    else {
      const response = await fetch('/api/impro/read?' + new URLSearchParams(params), {
        signal: session.abort.signal,
        credentials: 'same-origin',
        cache: 'no-store',
      });
      result = await response.json();
      if (!response.ok) throw Error(result.message || 'Lecture indisponible.');
    }
    if (improReaderSession !== session) return;
    if (
      session.tenant !== tenant ||
      session.account !== personalScope ||
      session.hash !== location.hash
    ) {
      improReaderClose();
      return;
    }
    modal.querySelector('#impro-reader-title').textContent = result.title;
    modal.querySelector('#impro-reader-body').innerHTML = improReaderContent(result);
  } catch (error) {
    if (improReaderSession !== session) return;
    modal.querySelector('#impro-reader-body').innerHTML =
      `<p role="alert">${esc(error.name === 'AbortError' ? 'La lecture a pris trop de temps. Réessayez ou consultez la source.' : error.message)}</p><a class="secondary" href="${esc(practiceExampleLink(row.url))}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche d’origine ↗</a>`;
  } finally {
    clearTimeout(timer);
  }
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-practice-read-reference]');
  if (!button) return;
  const row = practiceExamples.rows.find((r) => r.id === button.dataset.practiceReadReference);
  if (row) void improReaderOpen(row, button);
});
for (const event of ['hashchange', 'atelier-account-changed', 'compagniecraft-modules-changed'])
  window.addEventListener(event, improReaderClose);
document.addEventListener('change', (event) => {
  if (event.target.id === 'troupe') improReaderClose();
});
