'use strict';
// Read-only summaries of the selected troupe. Never seed data or fetch another
// module's private records merely to populate the dashboard.
function moduleDashboardStats(id, data, today) {
  const list = (v) => (Array.isArray(v) ? v : []),
    requests = list(data.requests),
    active = requests.filter((r) => !['done', 'cancelled'].includes(r.status));
  const due = active.filter(
    (r) => !r.checked && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline || '') && r.deadline <= today,
  ).length;
  switch (id) {
    case 'musique':
      return {
        value: list(data.contacts).filter((c) => c.musicSourceId).length,
        label: 'contact(s) musique',
        detail:
          data.music?.title || 'Décrire votre formule musicale et chercher les lieux adaptés.',
      };
    case 'repertoire':
      return {
        value: list(data.profile?.shows).length,
        label: 'spectacle(s) au répertoire',
        detail: 'Présenter les créations, leurs publics et leurs conditions d’accueil.',
      };
    case 'prospection':
      return {
        value: new Set(
          list(data.prospectEntries)
            .filter((r) => r.stage !== 'discarded')
            .map((r) => r.sourceId || r.id),
        ).size,
        label: 'piste(s) dans votre sélection',
        detail:
          'Reprendre les pistes enregistrées ou chercher de nouveaux lieux. Aucune date n’est présumée disponible.',
      };
    case 'candidatures':
      return {
        value: active.length,
        label: 'démarche(s) en cours',
        detail: due
          ? due + ' relance(s) arrivée(s) à échéance.'
          : list(data.contacts).length + ' contact(s) dans le carnet.',
        attention: due > 0,
      };
    case 'planning': {
      const future = [
        ...list(data.schedule)
          .filter((r) => !r.cancelled)
          .map((r) => ({ date: r.date, title: r.title })),
        ...list(data.planningSlots)
          .filter((r) => r.stage !== 'cancelled')
          .map((r) => ({ date: r.date, title: r.label })),
        ...requests
          .filter((r) => !['cancelled', 'done'].includes(r.status))
          .map((r) => ({ date: r.date, title: r.show })),
      ]
        .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') && r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        value: future.length,
        label: 'élément(s) daté(s) à venir',
        detail: future.length
          ? 'Prochain : ' + future[0].date + ' · ' + (future[0].title || 'Activité à préciser')
          : 'Ajoutez une répétition, un déplacement ou une représentation.',
        nextDate: future[0]?.date,
      };
    }
    case 'production':
      return {
        value: list(data.productions).filter((p) => p.stage !== 'closed').length,
        label: 'production(s) en préparation ou tournée',
        detail:
          list(data.productions)
            .filter((p) => p.stage !== 'closed')
            .flatMap((p) => list(p.tasks))
            .filter((t) => !t.done).length + ' action(s) de production à préparer.',
      };
    case 'partage':
      return {
        value: 'En équipe',
        label: 'textes & disponibilités',
        detail:
          'Ouvrez votre espace privé pour retrouver les textes et les réponses. Ces données ne sont pas chargées dans ce résumé.',
      };
    case 'bibliotheque':
      return {
        value: list(data.practice?.favorites).length,
        label: 'référence(s) en favoris',
        detail:
          list(data.practice?.references).length +
          ' référence(s) personnelle(s). Le catalogue se filtre par distribution.',
      };
    case 'exercices':
      return {
        value: list(data.practice?.workshop).length,
        label: 'exercice(s) dans votre séance',
        detail: 'Préparer la prochaine séance ou explorer les exercices d’atelier.',
      };
    case 'improvisation':
      return {
        value: list(data.practice?.impros).length,
        label: 'improvisation(s) enregistrée(s)',
        detail: 'Retrouver un tirage ou inventer une nouvelle situation de jeu.',
      };
    case 'communication':
      return {
        value: data.newsletter ? 1 : 0,
        label: 'maquette de newsletter enregistrée',
        detail: data.newsletter?.subject
          ? 'Objet : ' + data.newsletter.subject
          : 'Composer une lettre et préparer vos supports de diffusion.',
      };
    case 'aides':
      return {
        value:
          data.fundingProfile?.seat?.code && data.fundingProfile?.seat?.nom
            ? 'Siège renseigné'
            : 'À compléter',
        label: 'dossier de la troupe',
        detail:
          'Examiner les critères et les pièces nécessaires. Aucune éligibilité n’est déduite de ce résumé.',
      };
    case 'collectif':
      return {
        value: 'Partager',
        label: 'lieux, expériences & ressources',
        detail:
          'Découvrir le collectif ou préparer une contribution. Vous choisissez ce qui devient public.',
      };
    case 'finances':
      return {
        value: list(data.finance?.drafts).length,
        label: 'brouillon(s) de facture',
        detail:
          'Factures émises et règlements à consulter dans l’outil. Aucun encaissement n’est effectué ici.',
      };
    default:
      return {
        value: 'Ouvrir',
        label: 'votre outil',
        detail: 'Retrouver les informations de ce module.',
      };
  }
}
function moduleDashboardPlugins() {
  const hidden = personalSettings.hidden || [];
  return moduleOrderedPlugins().filter(
    (p) => ModuleRegistry.enabled(p.id) && p.routes.some((route) => !hidden.includes(route)),
  );
}

// Build a read-only work list from the current troupe and visible modules only.
function moduleDashboardActions(data, today, enabled) {
  const valid = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  if (!valid(today)) return [];
  const cutoff = new Date(today + 'T12:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  const end = cutoff.toISOString().slice(0, 10),
    rows = [];
  const add = (row, due) => {
    const date = valid(due) ? due : '';
    if (date && date > end) return;
    rows.push({
      ...row,
      date,
      period: !date
        ? 'À planifier'
        : date < today
          ? 'En retard'
          : date === today
            ? 'Aujourd’hui'
            : 'Dans les 7 jours',
    });
  };
  if (enabled.includes('candidatures'))
    for (const r of data.requests || []) {
      if (!r.id || r.checked || ['done', 'cancelled'].includes(r.status)) continue;
      add(
        {
          kind: 'request',
          id: r.id,
          title: r.next || 'Définir la prochaine démarche',
          context: [r.place, r.show].filter(Boolean).join(' — '),
          owner: r.assignee || 'À attribuer',
        },
        r.deadline,
      );
    }
  if (enabled.includes('production'))
    for (const p of data.productions || []) {
      if (!p.id || p.stage === 'closed') continue;
      for (const t of p.tasks || []) {
        if (t.done) continue;
        add(
          {
            kind: 'production',
            id: p.id,
            title: t.label || 'Préciser cette action',
            context: p.title || 'Production',
            owner: t.owner || 'À attribuer',
          },
          t.due,
        );
      }
    }
  return rows.sort(
    (a, b) =>
      (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title, 'fr'),
  );
}
