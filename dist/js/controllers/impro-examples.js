/** Refresh only on entry/return or explicit request, not every rerender while
 * typing. The current scene and locked elements never change on network replies. */
'use strict';
let practiceExamplesAbort;
function practiceExamplesActive() {
  return (
    ['#improvisation', '#atelier-creation'].includes(location.hash) &&
    practiceTab === 'impro' &&
    ModuleRegistry.canOpen('improvisation').ok
  );
}
function practiceExamplesPatch() {
  const el = document.querySelector('.practice-more-impros');
  if (el && practiceExamplesActive()) el.outerHTML = practiceMoreView();
}
function practiceExamplesVisit() {
  const key = tenant + '|' + location.hash;
  if (practiceExamples.entry === key) return;
  practiceExamples.entry = key;
  queueMicrotask(() => {
    if (practiceExamples.entry === key && practiceExamplesActive()) void practiceRenewExamples();
  });
}
async function practiceRenewExamples() {
  if (!practiceExamplesActive()) return;
  practiceMoreContext();
  const players = Number(
      document.getElementById('practice-impro-players')?.value || practiceImpro?.players || 2,
    ),
    minutes = Number(
      document.getElementById('practice-impro-minutes')?.value || practiceImpro?.minutes || 3,
    );
  if (
    !Number.isInteger(players) ||
    players < 2 ||
    players > 12 ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 30
  ) {
    practiceError(Error('Choisissez de 2 à 12 participants et de 1 à 30 minutes.'));
    return;
  }
  practiceExamplesAbort?.abort();
  const generation = ++practiceExamples.generation,
    workspace = tenant,
    account = personalScope,
    controller = new AbortController();
  practiceExamplesAbort = controller;
  const local = practiceDrawBatch({ ...practiceImpro, players, minutes }, practiceLocks, [
    ...practiceMoreRows,
    ...practiceExamples.recentLocal,
  ]);
  practiceExamples.recentLocal = [...practiceExamples.recentLocal, ...practiceMoreRows].slice(-200);
  if (local.length) practiceMoreRows = local;
  practiceMoreMessage = local.length
    ? local.length + ' situations originales renouvelées ; le tirage principal reste en place.'
    : 'Les éléments gardés ne permettent pas d’autre combinaison. Libérez un élément pour renouveler les situations.';
  Object.assign(practiceExamples, { busy: true, error: '', rows: [], sources: [], checkedAt: '' });
  practiceExamplesPatch();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    let result;
    if (window.ATELIER_SERVER) result = await window.ATELIER_ACCESS.call('impro-examples');
    else {
      if (!window.ATELIER_IMPRO_ENDPOINT)
        throw Error('Le service de sources n’est pas raccordé à cette installation.');
      const response = await fetch(window.ATELIER_IMPRO_ENDPOINT, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      result = await response.json();
      if (!response.ok) throw Error(result.message || 'Consultation indisponible.');
    }
    if (
      generation !== practiceExamples.generation ||
      workspace !== tenant ||
      account !== personalScope ||
      !practiceExamplesActive()
    )
      return;
    if (!Array.isArray(result.references) || !Array.isArray(result.sources))
      throw Error('Format des sources modifié.');
    practiceExamples.rows = practicePickReferences(result.references, practiceExamples.seen);
    practiceExamples.seen = [
      ...new Set([...practiceExamples.seen, ...practiceExamples.rows.map((r) => r.url)]),
    ].slice(-400);
    practiceExamples.sources = result.sources;
    practiceExamples.checkedAt = result.checkedAt;
  } catch (error) {
    if (generation === practiceExamples.generation && workspace === tenant)
      practiceExamples.error =
        error.name === 'AbortError'
          ? 'Délai de consultation dépassé. Les situations originales restent disponibles.'
          : error.message;
  } finally {
    clearTimeout(timer);
    if (generation === practiceExamples.generation && workspace === tenant) {
      practiceExamples.busy = false;
      practiceExamplesPatch();
    }
  }
}
function practiceExamplesLeave(clear = false) {
  practiceExamplesAbort?.abort();
  practiceExamples.generation++;
  practiceExamples.entry = '';
  practiceExamples.busy = false;
  if (clear) {
    practiceExamples.rows = [];
    practiceExamples.sources = [];
    practiceExamples.seen = [];
    practiceExamples.recentLocal = [];
  }
}
window.addEventListener('hashchange', () => {
  if (!practiceExamplesActive()) practiceExamplesLeave();
});
function practiceExamplesRestart() {
  practiceExamplesLeave(true);
  if (practiceExamplesActive()) {
    practiceExamples.entry = tenant + '|' + location.hash;
    void practiceRenewExamples();
  }
}
window.addEventListener('atelier-account-changed', practiceExamplesRestart);
document.addEventListener('change', (e) => {
  if (e.target.id === 'troupe') practiceExamplesRestart();
});
window.addEventListener('compagniecraft-modules-changed', () => {
  if (!practiceExamplesActive()) practiceExamplesLeave();
});
document.addEventListener('click', (e) => {
  const mode = e.target.closest('[data-impro-examples-mode]');
  if (mode) {
    practiceExamples.mode = mode.dataset.improExamplesMode;
    practiceExamplesPatch();
  }
  const tab = e.target.closest('[data-practice-tab]');
  if (tab && tab.dataset.practiceTab !== 'impro') practiceExamplesLeave();
  const share = e.target.closest('[data-practice-share-reference]');
  if (share) {
    const row = practiceExamples.rows.find((r) => r.id === share.dataset.practiceShareReference);
    if (row)
      practiceShare(
        'Une fiche d’improvisation à découvrir',
        row.title +
          '\nSource : ' +
          row.sourceName +
          '\n' +
          row.url +
          '\nConsignes, effectif et durée à consulter sur la fiche originale.',
      );
  }
});
