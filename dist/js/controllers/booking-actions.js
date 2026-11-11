'use strict';
// Route and contextual entry points expose the same workflow from existing screens.
function bookingTourWindowView() {
  const anchor = state.requests.find(
    (r) => r.id === bookingData().tour?.anchor && r.status === 'confirmed',
  );
  if (!anchor?.date) return '';
  return `<section class="panel section-gap"><h2>Autour du ${date(anchor.date)}</h2><p>Activités connues à trois jours de cette date. L’absence d’activité ne confirme ni la disponibilité de tous les artistes ni celle d’un lieu.</p>${bookingTourWindow(
    anchor.date,
  )
    .map(
      (d) =>
        '<p><strong>' +
        date(d.date) +
        '</strong> · ' +
        (d.activities.length
          ? d.activities.map((r) => esc(r.title) + ' (' + esc(r.status) + ')').join(' · ')
          : 'Aucune activité renseignée') +
        '</p>',
    )
    .join(
      '',
    )}<a class="secondary" href="#planning">Vérifier l’équipe et les horaires dans le planning</a></section>`;
}
const bookingTourBeforeWindow = bookingTourView;
bookingTourView = () =>
  bookingTourBeforeWindow().replace(
    '<label>Code INSEE',
    field('Ville de la date · choisir une proposition', 'booking-city', '') + '<label>Code INSEE',
  ) + bookingTourWindowView();
const bookingHomeBefore = views.accueil;
views.accueil = () =>
  `<section class="booking-start"><div><strong>Du spectacle à la prochaine date</strong><p>Affiner les lieux, préparer une candidature et organiser les étapes proches.</p></div><a class="primary" href="#parcours">Mon parcours de diffusion</a></section>` +
  bookingHomeBefore();
const bookingCardsBefore = prospectCard;
prospectCard = function (s) {
  const html = bookingCardsBefore(s),
    names = selectedShowNames(),
    extra = `<details class="section-gap"><summary>Correspondances et conditions d’accueil</summary>${names.map((name) => bookingFitView(s, name)).join('')}<button class="secondary" data-book-venue="${esc(s.id)}">Préciser les conditions du lieu</button></details>`;
  return html.replace('</article>', extra + '</article>');
};
const bookingMatchesBefore = showSourceMatches;
showSourceMatches = function (s) {
  return selectedShowNames().map((name) => {
    const f = bookingFit(s, name);
    return {
      show: name,
      status: f.status === 'excluded' ? 'excluded' : f.reasons.length ? 'match' : 'unknown',
      reasons: f.reasons,
    };
  });
};
prospectSelectionMatch = function (s) {
  const rows = selectedShowNames()
    .map((n) => bookingFit(s, n))
    .filter((f) => f.status !== 'excluded');
  return {
    count: rows.reduce((n, f) => n + f.reasons.length, 0),
    reasons: rows.flatMap((f) => f.reasons.map((r) => f.show + ' : ' + r)),
    checks: rows.flatMap((f) => f.missing),
  };
};
const bookingQualifyBefore = qualifyProspect;
qualifyProspect = function (entry) {
  const f = bookingFit(entry.source, entry.show);
  if (f.status === 'excluded') throw Error(f.excluded.join(' · '));
  return bookingQualifyBefore(entry);
};
const bookingRequestBefore = requestFields;
requestFields = function (r) {
  return (
    bookingRequestBefore(r) +
    (r.id
      ? `<button type="button" class="secondary" data-book-application="${esc(r.id)}">Message & dossier de candidature</button>`
      : '')
  );
};
const bookingEditShowBefore = applyShowEdit;
applyShowEdit = function (index, data) {
  const old = repertoire()[index],
    before = { ...bookingShow(old) };
  bookingEditShowBefore(index, data);
  for (const p of bookingData().shows)
    if (p.show === old) {
      p.show = data.name;
      if (data.duration !== undefined && data.duration !== before.duration) p.duration = null;
      if (data.capacity !== undefined && data.capacity !== before.capacity) p.capacity = null;
    }
};
const bookingDirectoryBefore = searchDirectory;
searchDirectory = async function (...args) {
  const owner = tenant;
  await bookingDirectoryBefore(...args);
  if (owner === tenant && !directoryState.error && directoryState.loadedAt) {
    bookingObserve(directoryState.rows);
    save();
  }
};
const bookingRefreshBefore = refreshSourceRegistry;
refreshSourceRegistry = async function () {
  const owner = tenant;
  await bookingRefreshBefore();
  if (owner === tenant) {
    bookingObserve(sourceManagerResults);
    save();
    if (location.hash === '#parcours') render();
  }
};
const bookingSourcesBefore = allProspectSources;
allProspectSources = function () {
  const byId = new Map(bookingData().catalog.map((c) => [c.id, c.source]));
  for (const s of bookingSourcesBefore()) byId.set(s.id, s);
  return [...byId.values()];
};
// Browser recovery is limited to local demo workspaces. Server snapshots never enter localStorage.
const bookingSaveBefore = save;
let bookingRecoveryWarning = false;
save = function () {
  if (!window.ATELIER_SERVER) {
    try {
      const key = 'compagniecraft-recovery-' + tenant,
        list = bookingLocalHistory(),
        serialized = JSON.stringify(state);
      if (!list.length || Date.now() - list[0].at >= 60000) {
        if (list[0]?.serialized !== serialized) {
          list.unshift({ at: Date.now(), serialized });
          localStorage.setItem(key, JSON.stringify(list.slice(0, 3)));
        }
      }
    } catch {
      if (!bookingRecoveryWarning) {
        bookingRecoveryWarning = true;
        notice(
          'Les points de récupération du navigateur sont indisponibles. Exportez vos dossiers.',
        );
      }
    }
  }
  return bookingSaveBefore();
};
function bookingClose() {
  const m = document.querySelector('#booking-editor'),
    form = m.querySelector('form');
  if (
    form &&
    m.dataset.initial !== JSON.stringify([...new FormData(form)]) &&
    !confirm('Fermer sans enregistrer les modifications de cette fiche ?')
  )
    return;
  m.close();
  bookingDialogKind = '';
}
document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.name === 'booking-city' && input.closest('#booking-tour')) {
    const city = suggestionSelections.get(input);
    if (city) input.form.querySelector('[name="code"]').value = city.code;
  }
});
function bookingUnchanged() {
  const m = document.querySelector('#booking-editor'),
    form = m.querySelector('form');
  if (form && m.dataset.initial !== JSON.stringify([...new FormData(form)]))
    throw Error('Enregistrez les modifications avant de télécharger ou d’ouvrir la messagerie.');
}
function bookingError(error) {
  const el = document.querySelector('#booking-editor[open] #booking-error');
  if (el) el.textContent = error.message;
  else notice(error.message);
}
function bookingOpenApplicationFromRequest(id) {
  const m = document.querySelector('#workspace-editor');
  if (m?.open) {
    if (editorInitial !== JSON.stringify([...new FormData(m.querySelector('form'))]))
      throw Error('Enregistrez la demande avant de préparer sa candidature.');
    m.close();
    editSession = null;
  }
  bookingEditApplication(id);
}
function bookingImportPreview(p, revision = null) {
  const real = !!window.ATELIER_SERVER;
  if (real && p.structure !== tenant) throw Error('Cette sauvegarde appartient à un autre espace.');
  bookingImport = { ...p, tenant, revision };
  const m = document.querySelector('#booking-editor');
  bookingDialogTenant = tenant;
  bookingDialogKind = 'restore';
  m.innerHTML = `<div class="dialog-head"><h2>Restaurer les dossiers</h2><button data-book-close aria-label="Fermer">×</button></div><p><strong>${esc(p.name || p.state?.profile?.name || 'Version serveur')}</strong></p><p>${p.state ? p.state.profile.shows.length + ' spectacle(s), ' + p.state.contacts.length + ' contact(s), ' + p.state.requests.length + ' démarche(s).' : 'Version serveur ' + revision + '.'}</p><p>Les dossiers actuels seront remplacés. ${real ? 'Le serveur conservera une version antérieure dans son historique. Les comptes et pièces comptables émises ne sont pas remplacés.' : 'Un point de récupération des dossiers actuels sera conservé dans ce navigateur.'}</p><label class="inline-check"><input id="booking-confirm-restore" type="checkbox">Je souhaite remplacer les dossiers de cet espace.</label><p id="booking-error" role="alert"></p><button class="primary" data-book-restore>Restaurer cette version</button>`;
  delete m.dataset.initial;
  m.showModal();
}
async function bookingRestore() {
  bookingWritable();
  if (!bookingImport || bookingImport.tenant !== tenant)
    throw Error('L’espace a changé. Rouvrez votre sauvegarde.');
  if (!document.querySelector('#booking-confirm-restore')?.checked)
    throw Error('Cochez la confirmation de remplacement.');
  if (window.ATELIER_HAS_UNSAVED_WORK?.())
    throw Error('Attendez la sauvegarde du travail en cours.');
  const p = bookingImport;
  if (window.ATELIER_SERVER) {
    if (window.ATELIER_ACCESS.context().role !== 'owner')
      throw Error('Restauration réservée au responsable.');
    const ctx = window.ATELIER_ACCESS.context();
    await window.ATELIER_ACCESS.call(
      p.revision !== null ? 'restore' : 'portable-restore',
      p.revision !== null
        ? { revision: ctx.revision, target_revision: p.revision }
        : { revision: ctx.revision, backup: p },
    );
    await window.ATELIER_ACCESS.refresh(tenant);
  } else {
    const key = 'compagniecraft-recovery-' + tenant,
      list = bookingLocalHistory();
    list.unshift({ at: Date.now(), serialized: JSON.stringify(state) });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 3)));
    state = p.state;
    ensureWorkspace();
    bookingSaveBefore();
    render();
  }
  document.querySelector('#booking-editor').close();
  bookingImport = null;
  notice('Dossiers restaurés. Les comptes utilisateurs ne sont pas modifiés.');
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'booking-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    bookingClose();
  });
  modal.addEventListener('submit', (event) => {
    if (event.target.id !== 'booking-form') return;
    event.preventDefault();
    if (bookingDialogTenant !== tenant) return;
    try {
      bookingWritable();
      const form = new FormData(event.target),
        v = Object.fromEntries(form);
      v.tags = form.getAll('tags');
      v.topics = form.getAll('topics');
      if (bookingDialogKind === 'show') bookingSaveShow(bookingDialogId, v);
      if (bookingDialogKind === 'venue') bookingSaveVenue(sourceForProspect(bookingDialogId), v);
      if (bookingDialogKind === 'application')
        bookingSaveApplication(
          state.requests.find((r) => r.id === bookingDialogId),
          v,
        );
      save();
      modal.close();
      render();
      notice('Fiche mise à jour. Les outils utilisent ces informations.');
    } catch (e) {
      bookingError(e);
    }
  });
  document.addEventListener('click', async (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if (d.bookTab) {
        bookingTab = d.bookTab;
        render();
      }
      if (d.bookShow) bookingEditShow(d.bookShow);
      if (d.bookArt) openEditor('show', String(repertoire().indexOf(d.bookArt)));
      if (d.bookSearch) {
        prospectShow = d.bookSearch;
        location.hash = 'prospection';
        render();
      }
      if (d.bookVenue) bookingEditVenue(d.bookVenue);
      if (d.bookApplication) bookingOpenApplicationFromRequest(d.bookApplication);
      if (b.hasAttribute('data-book-close')) bookingClose();
      if (d.bookDossier) {
        bookingUnchanged();
        const r = state.requests.find((r) => r.id === d.bookDossier);
        prospectDownload(bookingDossier(r), 'candidature-dossier.html', 'text/html;charset=utf-8');
      }
      if (d.bookMessage || d.bookMail || d.bookSent) {
        bookingUnchanged();
        const r = state.requests.find((r) => r.id === (d.bookMessage || d.bookMail || d.bookSent)),
          a = bookingApplication(r);
        if (!a) throw Error('Enregistrez d’abord la candidature.');
        if (d.bookMessage)
          prospectDownload(
            'Objet : ' + a.subject + '\n\n' + a.body,
            'candidature-message.txt',
            'text/plain;charset=utf-8',
          );
        if (d.bookMail) {
          const aTag = document.createElement('a');
          aTag.href = bookingMailto(a);
          aTag.click();
        }
        if (d.bookSent) {
          const when = prompt('Date de l’envoi effectué (AAAA-MM-JJ)', day(0));
          if (when) {
            bookingMarkSent(r, when);
            save();
            document.querySelector('#booking-editor').close();
            render();
            notice('Envoi déclaré. La date de spectacle reste à confirmer.');
          }
        }
      }
      if (d.bookTourStart) {
        prospectShow = d.bookTourShow;
        openProspectEditor(d.bookTourStart);
      }
      if (b.hasAttribute('data-book-export'))
        prospectDownload(
          JSON.stringify(bookingBackup(), null, 2),
          'compagniecraft-dossiers.json',
          'application/json',
        );
      if (b.hasAttribute('data-book-import'))
        document.querySelector('#booking-backup-file').click();
      if (b.hasAttribute('data-book-history')) {
        const owner = tenant,
          r = await window.ATELIER_ACCESS.call('history');
        if (owner === tenant) {
          bookingHistory = r.history;
          render();
        }
      }
      if (d.bookRecover !== undefined) {
        if (window.ATELIER_SERVER)
          bookingImportPreview({ structure: tenant }, Number(d.bookRecover));
        else {
          const h = bookingLocalHistory()[Number(d.bookRecover)];
          if (!h) throw Error('Point de récupération introuvable.');
          bookingImportPreview(
            bookingReadBackup(
              JSON.stringify({
                format: 'compagniecraft-workspace-v1',
                name: state.profile.name,
                state: JSON.parse(h.serialized),
              }),
            ),
          );
        }
      }
      if (b.hasAttribute('data-book-restore')) await bookingRestore();
    } catch (e) {
      bookingError(e);
    }
  });
  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'booking-backup-file') return;
    const owner = tenant,
      file = event.target.files[0];
    try {
      if (!file) return;
      if (file.size > 1500000) throw Error('Fichier trop volumineux (1,5 Mo maximum).');
      const raw = await file.text();
      if (owner !== tenant) throw Error('La troupe a changé. Recommencez.');
      bookingImportPreview(bookingReadBackup(raw));
    } catch (e) {
      bookingError(e);
    } finally {
      event.target.value = '';
    }
  });
  document.addEventListener('submit', async (event) => {
    if (event.target.id !== 'booking-tour') return;
    event.preventDefault();
    const owner = tenant;
    try {
      bookingWritable();
      const v = Object.fromEntries(new FormData(event.target)),
        r = state.requests.find((r) => r.id === v.anchor && r.status === 'confirmed'),
        radius = bookingNumber(v.radius, 'Rayon', 500),
        rate = bookingNumber(v.rate, 'Coût kilométrique', 10),
        factor = bookingNumber(v.factor, 'Coefficient', 3),
        nights = bookingNumber(v.nights, 'Nuits', 30),
        lodging = bookingNumber(v.lodging, 'Hébergement', 10000);
      if (!r || [radius, rate, factor, nights, lodging].includes(null) || factor < 1)
        throw Error('Complétez la date et les hypothèses.');
      const code = String(v.code).trim().toUpperCase();
      if (!/^[0-9A-Z]{5}$/.test(code))
        throw Error('Renseignez le code INSEE de la commune de la date.');
      bookingTourBusy = true;
      bookingTourError = '';
      render();
      const reference = await RadiusService.load();
      if (owner !== tenant) return;
      bookingTourRows = bookingTourCandidates(
        { communeCode: code, show: r.show, sourceId: r.prospectSourceId, place: r.place },
        allProspectSources(),
        reference,
        { radius, rate, factor, nights, lodging },
      );
      bookingData().tour = { anchor: r.id, code, radius, rate, factor, nights, lodging };
      save();
      if (!bookingTourRows.length)
        bookingTourError =
          'Aucune piste localisée compatible dans les fiches chargées. Élargissez le rayon ou chargez les annuaires voisins.';
    } catch (e) {
      if (owner === tenant) bookingTourError = e.message;
    } finally {
      if (owner === tenant) {
        bookingTourBusy = false;
        render();
      }
    }
  });
});

// The preview always follows the current typed URL; invalid values cannot open a tab.
document.addEventListener('input', (event) => {
  if (event.target.name !== 'proof' || !event.target.closest('#booking-form')) return;
  const link = event.target.closest('label')?.querySelector('[data-book-proof-link]');
  if (!link) return;
  const review =
      typeof prospectLinkReview === 'function' ? prospectLinkReview(event.target.value) : null,
    url = prospectUrl(review?.replacement || event.target.value);
  link.hidden = !url;
  if (url) link.href = url;
  else link.removeAttribute('href');
});
