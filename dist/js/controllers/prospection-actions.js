/** Contrôleur de prospection.
 * Relie les formulaires aux règles métier, aux vues et aux exports.
 * Les générations et AbortController évitent qu’une ancienne recherche écrase
 * les résultats d’une nouvelle recherche ou ceux d’une autre troupe. */
'use strict';

pages.splice(1, 0, ['prospection', '⌕', 'Trouver où jouer']);

async function searchDirectory(criteria, page = 1) {
  directoryController?.abort();
  const generation = ++directoryGeneration,
    tenantAtStart = tenant;
  const controller = new AbortController();
  directoryController = controller;
  directoryState.busy = true;
  directoryState.error = '';
  directoryState.requestCriteria = criteria;
  render();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    criteria = await prepareRadiusCriteria(criteria);
    if (generation !== directoryGeneration || tenant !== tenantAtStart) return;
    const response = await fetch(buildDirectoryUrl(criteria.kind, criteria, page), {
      signal: controller.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw Error('L’annuaire public a répondu HTTP ' + response.status + '.');
    const data = await response.json();
    if (!Array.isArray(data.data) || !data.meta) throw Error('Format de l’annuaire modifié.');
    if (generation !== directoryGeneration || tenant !== tenantAtStart) return;
    let rows = data.data.map((r) => normalizeDirectoryRow(criteria.kind, r)).filter(Boolean);
    if (criteria.radius) rows = RadiusService.filter(rows, criteria.radius);
    directoryState.rows =
      page === 1
        ? rows
        : [...new Map([...directoryState.rows, ...rows].map((r) => [r.id, r])).values()];
    directoryState.criteria = criteria;
    directoryState.kind = criteria.kind;
    directoryState.total = Number(data.meta.total) || 0;
    directoryState.page = page;
    directoryState.loadedAt = day(0);
  } catch (error) {
    if (generation !== directoryGeneration || tenant !== tenantAtStart) return;
    directoryState.error =
      error.name === 'AbortError'
        ? 'La recherche a pris trop de temps. Réessayez ; les pistes déjà chargées sont conservées.'
        : error.message + ' Les pistes déjà chargées restent disponibles.';
  } finally {
    clearTimeout(timeout);
    if (generation === directoryGeneration && tenant === tenantAtStart) {
      directoryState.busy = false;
      render();
    }
  }
}

function openProspectEditor(sourceId) {
  const source = sourceForProspect(sourceId);
  if (!source) return;
  if (source.status === 'closed') {
    notice('Cette campagne est close. Gardez-la en veille pour un autre cycle.');
    return;
  }
  const existing = trackedProspect(source);
  prospectEditor = { sourceId, tenant, show: prospectShow };
  const modal = document.querySelector('#prospect-editor');
  modal.innerHTML = `<form id="prospect-start-form"><div class="dialog-head"><h2>Préparer la démarche</h2><button type="button" data-prospect-close aria-label="Fermer">×</button></div><p><strong>${esc(source.name)}</strong><br>${esc(prospectShow)}</p><p>${esc(source.process)}</p>${field('Responsable', 'assignee', existing?.assignee || state.company?.team?.[0]?.[0] || '')}${field('Prochaine action', 'next', existing?.next || source.next, 'text', true)}<div class="form-row">${field('Échéance de relance', 'deadline', existing?.deadline || day(7), 'date')}${selectField(
    'Priorité',
    'priority',
    [
      ['normal', 'Normale'],
      ['high', 'Haute'],
      ['low', 'Basse'],
    ],
    existing?.priority || 'normal',
  )}</div><p class="muted">Cette action crée une demande « À étudier », sans date de représentation. Les rendez-vous professionnels de la source restent distincts.</p><p class="prospect-error" id="prospect-form-error" role="alert"></p><button class="primary" type="submit">Créer ou retrouver ma démarche</button></form>`;
  modal.showModal();
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'prospect-editor';
  document.body.append(modal);
  content.addEventListener('input', (event) => {
    if (event.target.id === 'prospect-search') {
      prospectQuery = event.target.value;
      document.querySelector('#prospect-cards').innerHTML = prospectRows()
        .map(prospectCard)
        .join('');
      document.querySelector('#prospect-count').textContent =
        prospectRows().length + ' piste(s) documentée(s).';
    }
  });
  content.addEventListener('change', (event) => {
    const t = event.target;
    if (t.name === 'prospect-show') {
      prospectShow = t.value;
      state.prospectSelection = prospectShow;
      save();
      render();
    }
    if (t.name === 'prospect-region') {
      prospectRegion = t.value;
      state.prospectScope = 'france';
      state.prospectLocation = null;
      render();
    }
    if (t.dataset.prospectTag && prospectShow !== ALL_SHOWS) {
      const existing = (state.prospectProfiles ??= []).find((p) => p.show === prospectShow),
        tags = new Set(currentProspectTags());
      if (t.checked) tags.add(t.dataset.prospectTag);
      else tags.delete(t.dataset.prospectTag);
      if (existing) existing.tags = [...tags];
      else state.prospectProfiles.push({ show: prospectShow, tags: [...tags] });
      persist('Critères de prospection conservés pour ce spectacle.');
    }
    if (t.id === 'prospect-kind') {
      prospectKind = t.value;
      render();
    }
    if (t.id === 'prospect-suggested') {
      prospectSelectedOnly = t.checked;
      render();
    }
  });
  content.addEventListener('submit', (event) => {
    if (event.target.id !== 'directory-search') return;
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    void searchDirectory(
      {
        kind: form.kind === 'libraries' ? 'venues' : form.kind,
        venueType: form.kind === 'libraries' ? 'library' : '',
        region: prospectRegion,
        city: String(form.city || '').trim(),
        q: String(form.q || '').trim(),
      },
      1,
    );
  });
  content.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.dataset.prospectTab) {
      prospectTab = b.dataset.prospectTab;
      render();
    }
    if (b.dataset.prospectWatch) {
      const s = sourceForProspect(b.dataset.prospectWatch);
      if (s) {
        if (prospectShow === ALL_SHOWS) {
          for (const row of showSourceMatches(s).filter((row) => row.status !== 'excluded'))
            saveProspectEntry(s, row.show, { next: s.next });
          persist('Piste conservée pour les spectacles à examiner.');
          return;
        }
        if (trackedProspect(s)) {
          notice('Cette piste est déjà dans votre sélection.');
          return;
        }
        saveProspectEntry(s, prospectShow, { next: s.next });
        persist('Piste conservée dans la sélection de cette troupe.');
      }
    }
    if (b.dataset.prospectStart) openProspectEditor(b.dataset.prospectStart);
    if (b.hasAttribute('data-prospect-csv'))
      prospectDownload(
        prospectCsv(prospectRows()),
        'pistes-prospection.csv',
        'text/csv;charset=utf-8',
      );
    if (b.hasAttribute('data-directory-more') && !directoryState.busy)
      void searchDirectory(directoryState.criteria, directoryState.page + 1);
    if (b.dataset.prospectArchive) {
      const entry = state.prospectEntries.find((e) => e.id === b.dataset.prospectArchive);
      if (entry) {
        entry.stage = entry.stage === 'discarded' ? 'watch' : 'discarded';
        persist();
      }
    }
    if (b.dataset.prospectDraft) {
      const entry = state.prospectEntries.find((e) => e.id === b.dataset.prospectDraft);
      if (entry)
        prospectDownload(
          prospectDraft(entry),
          'message-de-prospection-a-relire.txt',
          'text/plain;charset=utf-8',
        );
    }
    if (b.dataset.prospectEvent) {
      const entry = state.prospectEntries.find((e) => e.id === b.dataset.prospectEvent);
      if (entry?.source.eventStart) {
        if (prospectTemporalStatus(entry.source, day(0)) !== 'announced') {
          notice('Cette édition est passée, annulée ou non vérifiée : aucune date ajoutée.');
          return;
        }
        if (state.schedule.some((e) => e.prospectSourceId === entry.sourceId)) {
          notice('Ce rendez-vous professionnel est déjà dans l’agenda.');
          return;
        }
        state.schedule.push({
          id: crypto.randomUUID(),
          date: entry.source.eventStart,
          title: entry.source.name + ' · repérage',
          place: entry.source.city,
          time: 'À vérifier',
          status: 'Prospection',
          notes:
            entry.source.eventLabel +
            '\nSource : ' +
            entry.source.source +
            '\nAucune représentation de votre troupe n’est confirmée.',
          prospectSourceId: entry.sourceId,
        });
        persist('Date de repérage ajoutée, sans créer de représentation.');
      }
    }
  });
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-prospect-close]')) {
      const form = modal.querySelector('form');
      if (
        form &&
        JSON.stringify([...new FormData(form)]) !== modal.dataset.initial &&
        !confirm('Fermer et abandonner les changements de cette fiche ?')
      )
        return;
      modal.close();
    }
  });
  modal.addEventListener('cancel', (event) => {
    const form = modal.querySelector('form');
    if (
      form &&
      JSON.stringify([...new FormData(form)]) !== modal.dataset.initial &&
      !confirm('Fermer et abandonner les changements de cette fiche ?')
    )
      event.preventDefault();
  });
  modal.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'ensemble-prospect-form') return;
    if (!prospectEditor || prospectEditor.tenant !== tenant) return;
    try {
      const s = sourceForProspect(prospectEditor.sourceId),
        data = Object.fromEntries(new FormData(event.target));
      const entry = saveProspectEntry(s, prospectEditor.show, data),
        request = qualifyProspect(entry);
      save();
      modal.close();
      prospectTab = 'tracking';
      render();
      notice('Démarche préparée. Aucun message envoyé et aucune date confirmée.');
    } catch (error) {
      modal.querySelector('#prospect-form-error').textContent = error.message;
    }
  });
  // Capture initial values after each opening, for explicit cancellation of edits.
  const originalOpen = openProspectEditor;
  openProspectEditor = function (id) {
    originalOpen(id);
    if (modal.open)
      modal.dataset.initial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  };
  render();
});
