'use strict';
// Run a new public metadata + page inspection for each explicit search. A second
// batch can complete the same page; a new query never reuses old page evidence.
searchDirectory = async function (criteria, page = 1, offset = 0) {
  directoryController?.abort();
  const generation = ++directoryGeneration,
    owner = tenant,
    controller = new AbortController();
  directoryController = controller;
  directoryState.busy = true;
  directoryState.error = '';
  directoryState.requestCriteria = criteria;
  render();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    criteria = await prepareRadiusCriteria(criteria);
    if (generation !== directoryGeneration || tenant !== owner) return;
    const verified = verifiedDirectoryUrl(criteria, page, offset),
      url = verified || buildDirectoryUrl(criteria.kind, criteria, page);
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: verified ? 'same-origin' : 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(data.message || 'Annuaire indisponible (HTTP ' + response.status + ').');
    if (!Array.isArray(data.data) || !data.meta) throw Error('Format de l’annuaire modifié.');
    if (generation !== directoryGeneration || tenant !== owner) return;
    let rows = data.data
      .map((raw) => {
        const row = normalizeDirectoryRow(criteria.kind, raw);
        if (!row) return null;
        const check = raw.siteCheck || {
          status: 'unchecked',
          reason: 'Le contrôle des pages doit être raccordé sur cet hébergement.',
          evidence: [],
          tags: [],
        };
        row.siteCheck = check;
        if (check.status === 'artistic') {
          row.tags = check.tags;
          row.themes = check.themes || [];
          row.audience = check.audience || 'unknown';
          row.status = 'identify';
          row.checked = check.checkedAt
            ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(
                new Date(check.checkedAt),
              )
            : '';
          if (check.events?.length) {
            row.eventStart = check.events[0].start;
            row.eventEnd = check.events[0].end;
            row.eventNature = 'public';
            row.eventLabel =
              'Événement publié du ' + date(row.eventStart) + ' au ' + date(row.eventEnd);
          }
        }
        if (['rejected', 'unavailable'].includes(check.status)) row.status = 'unverified';
        return row;
      })
      .filter(Boolean);
    if (criteria.radius) rows = RadiusService.filter(rows, criteria.radius);
    if (offset && directoryState.page === page)
      rows = rows.map((row) => {
        const old = directoryState.rows.find((r) => r.id === row.id);
        return row.siteCheck.status === 'unchecked' && old ? old : row;
      });
    directoryState.rows =
      page === 1 && !offset
        ? rows
        : [...new Map([...directoryState.rows, ...rows].map((r) => [r.id, r])).values()];
    directoryState.criteria = criteria;
    directoryState.kind = criteria.kind;
    directoryState.total = Number(data.meta.total) || 0;
    directoryState.page = page;
    directoryState.loadedAt = day(0);
    directoryState.verification = data.verification || null;
  } catch (e) {
    if (generation !== directoryGeneration || tenant !== owner) return;
    directoryState.error =
      (e.name === 'AbortError' ? 'Le contrôle a dépassé le délai prévu.' : e.message) +
      ' Les résultats précédents ne sont pas une nouvelle vérification.';
  } finally {
    clearTimeout(timer);
    if (generation === directoryGeneration && tenant === owner) {
      directoryState.busy = false;
      render();
    }
  }
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.venueMode) {
    venueResultMode = b.dataset.venueMode;
    render();
  }
  if (b.hasAttribute('data-venue-check-more') && !directoryState.busy)
    void searchDirectory(
      directoryState.criteria,
      directoryState.page,
      (directoryState.verification?.offset || 0) + 6,
    );
});
// The main entry is the dated, checked festival search, rather than an unqualified
// legal-register list. Other discovery sources remain explicitly accessible.
const venueShowMatchesBefore = typeof showSourceMatches === 'function' ? showSourceMatches : null;
if (venueShowMatchesBefore)
  showSourceMatches = function (source) {
    if (!source.siteCheck) return venueShowMatchesBefore(source);
    const supported = ['artistic', 'documented'].includes(source.siteCheck.status),
      rejected =
        source.siteCheck.status === 'rejected' ||
        (source.linkReview && source.status === 'unverified');
    return venueShowFit(source).map((row) => ({
      show: row.show,
      status: rejected
        ? 'excluded'
        : supported
          ? row.status
          : row.status === 'excluded'
            ? 'excluded'
            : 'unknown',
      reasons: rejected
        ? ['Destination écartée après contrôle.']
        : supported && row.status === 'match'
          ? [
              'Formes documentées : ' +
                row.common.map((t) => prospectTags[t] || t).join(', ') +
                '. Public et thème documentés pris en compte.',
            ]
          : ['Preuves ou critères insuffisants pour recommander ce lieu.'],
    }));
  };
prospectTab = 'directory';
