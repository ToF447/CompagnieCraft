'use strict';
const opsProjectStages = { preparation: 'Préparation', tour: 'En tournée', closed: 'Terminé' };
const opsSlotKinds = {
  rehearsal: 'Répétition',
  setup: 'Montage / technique',
  performance: 'Représentation à préparer',
  travel: 'Déplacement',
  lodging: 'Hébergement',
  meeting: 'Réunion / repérage',
  workshop: 'Atelier / médiation',
  other: 'Autre activité',
};
const opsResourceKinds = {
  equipment: 'Matériel / costume',
  space: 'Salle / espace',
  vehicle: 'Véhicule',
};
function opsData() {
  state.productions ??= [];
  state.planningSlots ??= [];
  state.resources ??= [];
  return state;
}
function opsText(value, label, max = 250, required = false) {
  if (typeof value !== 'string') value = '';
  value = value.trim();
  if ((required && !value) || value.length > max)
    throw Error(
      label +
        ' : ' +
        (required ? 'renseignez une valeur de ' : 'maximum ') +
        max +
        ' caractères maximum.',
    );
  return value;
}
function opsDate(value, required = false) {
  if (!value && !required) return '';
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + 'T12:00:00Z')) ||
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value
  )
    throw Error('Choisissez une date valide.');
  return value;
}
function opsMoney(value, optional = false) {
  let raw = String(value ?? '').trim();
  if (!raw && optional) return null;
  raw = raw
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/€$/, '')
    .replace(',', '.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw))
    throw Error('Montant invalide : utilisez des euros et au maximum deux décimales.');
  const [whole, dec = ''] = raw.split('.'),
    cents = Number(whole) * 100 + Number(dec.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 10000000000) throw Error('Montant trop élevé.');
  return cents;
}
function opsMoneyInput(cents) {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');
}
function opsEuro(cents) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function opsProject(id) {
  return opsData().productions.find((p) => p.id === id);
}
function opsSaveProject(values, id = '') {
  opsData();
  const old = opsProject(id),
    title = opsText(values.title, 'Nom de la production', 250, true),
    show = values.show || '';
  if (show && !repertoire().includes(show))
    throw Error('Choisissez un spectacle du répertoire de cette troupe.');
  if (!opsProjectStages[values.stage]) throw Error('Étape de production inconnue.');
  if (!['unspecified', 'net', 'gross'].includes(values.basis))
    throw Error('Précisez la base du budget.');
  const timeZone = values.timeZone || 'Europe/Paris';
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone }).format(new Date());
  } catch {
    throw Error('Fuseau horaire inconnu.');
  }
  if (!Array.isArray(values.requestIds || [])) throw Error('Demandes liées invalides.');
  const requestIds = [...new Set(values.requestIds || [])];
  if (old)
    for (const slot of state.planningSlots.filter((s) => s.productionId === old.id)) {
      opsInstant(slot.date, slot.start, timeZone);
      opsInstant(slot.date, slot.end, timeZone);
    }
  for (const key of requestIds) {
    const r = state.requests.find((r) => r.id === key);
    if (!r || (show && r.show !== show && !r.proposedShows?.includes(show)))
      throw Error('La demande choisie ne correspond pas à ce spectacle.');
  }
  const project = {
    ...old,
    id: old?.id || crypto.randomUUID(),
    title,
    show,
    timeZone,
    stage: values.stage,
    basis: values.basis,
    owner: opsText(values.owner, 'Responsable', 250),
    note: opsText(values.note, 'Notes', 8000),
    requestIds,
    budget: old?.budget || [],
    tasks: old?.tasks || [],
    documents: old?.documents || [],
    created: old?.created || day(0),
  };
  if (old) Object.assign(old, project);
  else state.productions.push(project);
  return old || project;
}
function opsBudgetTotals(project) {
  const rows = (project.budget || []).filter((r) => !r.archived),
    sum = (flow, key) => rows.filter((r) => r.flow === flow).reduce((n, r) => n + (r[key] ?? 0), 0);
  return {
    plannedIncome: sum('income', 'plannedCents'),
    plannedExpense: sum('expense', 'plannedCents'),
    actualIncome: sum('income', 'actualCents'),
    actualExpense: sum('expense', 'actualCents'),
    plannedBalance: sum('income', 'plannedCents') - sum('expense', 'plannedCents'),
    actualBalance: sum('income', 'actualCents') - sum('expense', 'actualCents'),
    unknownActual: rows.filter((r) => r.actualCents === null).length,
  };
}
function opsSaveBudget(projectId, values, id = '') {
  const p = opsProject(projectId);
  if (!p) throw Error('Production introuvable.');
  if (
    !['income', 'expense'].includes(values.flow) ||
    !['forecast', 'agreed', 'settled'].includes(values.stage)
  )
    throw Error('Type de ligne budgétaire inconnu.');
  const actual = opsMoney(values.actual, true),
    paidDate = opsDate(values.paidDate);
  if (values.stage === 'settled' && (actual === null || !paidDate))
    throw Error('Renseignez le montant réalisé et la date du règlement.');
  if (values.contactId && !state.contacts.some((c) => c.id === values.contactId))
    throw Error('Contact absent du carnet.');
  const old = p.budget.find((r) => r.id === id),
    row = {
      ...old,
      id: old?.id || crypto.randomUUID(),
      label: opsText(values.label, 'Libellé', 250, true),
      category: opsText(values.category, 'Catégorie', 120, true),
      flow: values.flow,
      stage: values.stage,
      plannedCents: opsMoney(values.planned),
      actualCents: actual,
      due: opsDate(values.due),
      paidDate,
      contactId: values.contactId || '',
      reference: opsText(values.reference, 'Référence', 250),
      archived: old?.archived || false,
    };
  if (old) Object.assign(old, row);
  else p.budget.push(row);
  return old || row;
}
function opsSaveTask(projectId, values, id = '') {
  const p = opsProject(projectId);
  if (!p) throw Error('Production introuvable.');
  const old = p.tasks.find((r) => r.id === id),
    row = {
      ...old,
      id: old?.id || crypto.randomUUID(),
      label: opsText(values.label, 'Action', 250, true),
      owner: opsText(values.owner, 'Responsable', 250),
      due: opsDate(values.due),
      done: old?.done || false,
    };
  if (old) Object.assign(old, row);
  else p.tasks.push(row);
  return old || row;
}
function opsSaveDocument(projectId, values, id = '') {
  const p = opsProject(projectId);
  if (!p) throw Error('Production introuvable.');
  if (
    !['quote', 'contract', 'invoice', 'technical', 'authorization', 'other'].includes(
      values.kind,
    ) ||
    !['draft', 'expected', 'ready', 'signed', 'received'].includes(values.stage)
  )
    throw Error('Type ou état de document inconnu.');
  const url = values.url ? prospectUrl(values.url) : '';
  if (values.url && !url)
    throw Error('Ajoutez un lien HTTP ou HTTPS valide, sans identifiant dans l’adresse.');
  const old = p.documents.find((r) => r.id === id),
    row = {
      ...old,
      id: old?.id || crypto.randomUUID(),
      label: opsText(values.label, 'Document', 250, true),
      kind: values.kind,
      stage: values.stage,
      reference: opsText(values.reference, 'Référence', 250),
      url,
      due: opsDate(values.due),
      note: opsText(values.note, 'Note du document', 4000),
      archived: old?.archived || false,
    };
  if (old) Object.assign(old, row);
  else p.documents.push(row);
  return old || row;
}
function opsSaveResource(values, id = '') {
  opsData();
  const old = state.resources.find((r) => r.id === id),
    quantity = Number(values.quantity),
    unavailable = Number(values.unavailable || 0);
  if (
    !opsResourceKinds[values.kind] ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10000 ||
    !Number.isInteger(unavailable) ||
    unavailable < 0 ||
    unavailable > quantity
  )
    throw Error('Renseignez un stock entier et un nombre indisponible inférieur ou égal au stock.');
  if (['space', 'vehicle'].includes(values.kind) && quantity !== 1)
    throw Error('Créez une fiche par salle ou véhicule, avec une quantité de 1.');
  const row = {
    ...old,
    id: old?.id || crypto.randomUUID(),
    name: opsText(values.name, 'Nom de la ressource', 250, true),
    kind: values.kind,
    quantity,
    unavailable,
    location: opsText(values.location, 'Lieu de stockage', 250),
    note: opsText(values.note, 'Notes', 4000),
  };
  if (old) Object.assign(old, row);
  else state.resources.push(row);
  return old || row;
}
function opsMinutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || ''))
    throw Error('Renseignez une heure au format HH:MM.');
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function opsValidateSlot(values, id = '') {
  opsData();
  const old = state.planningSlots.find((r) => r.id === id),
    productionId = values.productionId || '';
  if (!opsProject(productionId)) throw Error('Choisissez une production de cette troupe.');
  if (
    !opsSlotKinds[values.kind] ||
    !['draft', 'planned', 'done', 'cancelled'].includes(values.stage)
  )
    throw Error('Type de créneau inconnu.');
  const start = opsMinutes(values.start),
    end = opsMinutes(values.end);
  if (end <= start)
    throw Error('L’heure de fin doit suivre le début. Scindez les activités qui passent minuit.');
  if (!Array.isArray(values.members || []) || !Array.isArray(values.resources || []))
    throw Error('Affectations invalides.');
  const members = [...new Set(values.members || [])],
    allowed = new Set([...teamMembers(), ...(old?.members || [])]);
  if (members.some((n) => !allowed.has(n))) throw Error('Choisissez les personnes de la troupe.');
  for (const r of values.resources || [])
    if (!Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 0)
      throw Error('Quantité réservée invalide.');
  const reservations = (values.resources || [])
    .filter((r) => Number(r.quantity) > 0)
    .map((row) => {
      const resource = state.resources.find((r) => r.id === row.resourceId),
        quantity = Number(row.quantity);
      if (!resource || !Number.isInteger(quantity) || quantity > 10000)
        throw Error('Réservation de ressource invalide.');
      return { resourceId: resource.id, quantity };
    });
  if (new Set(reservations.map((r) => r.resourceId)).size !== reservations.length)
    throw Error('Une même ressource est indiquée plusieurs fois.');
  const actual =
    values.actualMinutes === '' || values.actualMinutes === undefined
      ? null
      : Number(values.actualMinutes);
  if (actual !== null && (!Number.isInteger(actual) || actual < 0 || actual > 1440))
    throw Error('Le temps réalisé doit être compris entre 0 et 1 440 minutes.');
  opsInstant(values.date, values.start, opsProject(productionId).timeZone || 'Europe/Paris');
  opsInstant(values.date, values.end, opsProject(productionId).timeZone || 'Europe/Paris');
  return {
    ...old,
    id: old?.id || id || crypto.randomUUID(),
    productionId,
    label: opsText(values.label, 'Activité', 250, true),
    kind: values.kind,
    stage: values.stage,
    date: opsDate(values.date, true),
    start: values.start,
    end: values.end,
    place: opsText(values.place, 'Lieu', 250),
    members,
    resources: reservations,
    actualMinutes: actual,
    note: opsText(values.note, 'Notes pratiques', 8000),
  };
}
const opsZoneFormatters = new Map();
function opsInstant(dateValue, time, zone = 'Europe/Paris') {
  opsDate(dateValue, true);
  opsMinutes(time);
  const target = Date.parse(dateValue + 'T' + time + ':00Z'),
    formatter =
      opsZoneFormatters.get(zone) ||
      new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    local = (ms) => {
      const p = Object.fromEntries(
        formatter.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
      );
      return Date.UTC(
        Number(p.year),
        Number(p.month) - 1,
        Number(p.day),
        Number(p.hour),
        Number(p.minute),
        Number(p.second),
      );
    };
  opsZoneFormatters.set(zone, formatter);
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const delta = target - local(instant);
    if (!delta) break;
    instant += delta;
  }
  if (local(instant) !== target)
    throw Error('Cette heure n’existe pas dans le fuseau du projet à cause du changement d’heure.');
  if (local(instant - 3600000) === target || local(instant + 3600000) === target)
    throw Error(
      'Cette heure est ambiguë au changement d’heure. Choisissez un créneau hors de cette heure doublée.',
    );
  return instant;
}
function opsInterval(slot) {
  const zone = opsProject(slot.productionId)?.timeZone || 'Europe/Paris';
  return {
    start: opsInstant(slot.date, slot.start, zone),
    end: opsInstant(slot.date, slot.end, zone),
  };
}
function opsIntervalsOverlap(a, b) {
  const x = opsInterval(a),
    y = opsInterval(b);
  return x.start < y.end && y.start < x.end;
}
function opsConflicts(slots = opsData().planningSlots) {
  const live = slots.filter((s) => s.stage !== 'cancelled'),
    intervals = new Map(live.map((s) => [s.id, opsInterval(s)])),
    result = [],
    seen = new Set(),
    add = (kind, ids, message) => {
      const key = kind + '|' + [...ids].sort().join('|') + '|' + message;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ kind, slotIds: ids, message });
      }
    };
  const ordered = [...live].sort((a, b) => intervals.get(a.id).start - intervals.get(b.id).start);
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i],
      ia = intervals.get(a.id);
    for (const absent of state.absences || [])
      if (
        !absent.cancelled &&
        a.date >= absent.from &&
        a.date <= absent.to &&
        a.members.includes(absent.member)
      )
        add('absence', [a.id], absent.member + ' est indisponible le ' + date(a.date) + '.');
    for (let j = i + 1; j < ordered.length; j++) {
      const b = ordered[j],
        ib = intervals.get(b.id);
      if (ib.start >= ia.end) break;
      if (ia.start < ib.end) {
        const common = a.members.filter((m) => b.members.includes(m));
        if (common.length)
          add('person', [a.id, b.id], common.join(', ') + ' : deux activités se chevauchent.');
      }
    }
  }
  for (const resource of state.resources) {
    const rows = live.filter((s) => s.resources.some((r) => r.resourceId === resource.id)),
      points = [
        ...new Set(
          rows.flatMap((s) => {
            const i = intervals.get(s.id);
            return [i.start, i.end];
          }),
        ),
      ].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const active = rows.filter((s) => {
          const r = intervals.get(s.id);
          return r.start < points[i + 1] && r.end > points[i];
        }),
        load = active.reduce(
          (n, s) => n + s.resources.find((r) => r.resourceId === resource.id).quantity,
          0,
        ),
        capacity = resource.quantity - resource.unavailable;
      if (load > capacity)
        add(
          'resource',
          active.map((s) => s.id),
          resource.name +
            ' : ' +
            load +
            ' réservé(s), ' +
            capacity +
            ' disponible(s) sur un même créneau.',
        );
    }
  }
  return result;
}
function opsSaveSlot(values, id = '') {
  const row = opsValidateSlot(values, id),
    slots = [...state.planningSlots.filter((s) => s.id !== row.id), row],
    conflicts = opsConflicts(slots).filter((c) => c.slotIds.includes(row.id));
  if (conflicts.length && !values.acceptConflicts) {
    const error = Error(conflicts.map((c) => c.message).join(' '));
    error.conflicts = conflicts;
    throw error;
  }
  const old = state.planningSlots.find((s) => s.id === row.id);
  row.conflictsAcknowledged = Boolean(values.acceptConflicts);
  if (old) Object.assign(old, row);
  else state.planningSlots.push(row);
  return old || row;
}
function opsApplyTemplate(projectId, dateValue, kind = 'small') {
  const p = opsProject(projectId);
  if (!p) throw Error('Production introuvable.');
  const d = opsDate(dateValue, true);
  if (
    state.planningSlots.some(
      (s) => s.productionId === projectId && s.templateKey === kind + '-' + d,
    )
  )
    throw Error('Ce planning type a déjà été appliqué à cette date.');
  const defs =
    kind === 'care'
      ? [
          ['Repérage et échange avec le référent', 'meeting', '09:00', '09:45'],
          ['Installation douce', 'setup', '10:00', '10:30'],
          ['Intervention à préparer', 'workshop', '10:45', '11:30'],
        ]
      : kind === 'street'
        ? [
            ['Repérage du parcours et repli', 'meeting', '09:00', '10:00'],
            ['Installation et vérifications', 'setup', '10:00', '11:00'],
            ['Représentation à préparer', 'performance', '15:00', '16:00'],
          ]
        : [
            ['Montage et accueil', 'setup', '09:00', '11:00'],
            ['Raccord / répétition', 'rehearsal', '11:00', '12:00'],
            ['Représentation à préparer', 'performance', '15:00', '16:00'],
          ];
  for (const [label, type, start, end] of defs)
    state.planningSlots.push({
      id: crypto.randomUUID(),
      productionId: projectId,
      date: d,
      label,
      kind: type,
      start,
      end,
      stage: 'draft',
      place: '',
      members: [],
      resources: [],
      actualMinutes: null,
      note: 'Gabarit de préparation : horaires, équipe et accueil à valider.',
      templateKey: kind + '-' + d,
    });
  return defs.length;
}
