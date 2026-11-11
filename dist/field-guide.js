/* Continuous field guidance is presentation only. It never saves a form, reads a
 * password for analysis, transmits values, or replaces the field being edited.
 * Context-specific advice wins over the generic field/type explanation. */
'use strict';
const guideAdvice = {
  'prospect-city':
    'Choisissez une commune dans la liste : son code, son département et sa région seront repris. Cette ville sert à la recherche de lieux, pas à déterminer le siège administratif.',
  'community-city':
    'Une commune peut partager son nom avec une autre. Vérifiez le département et le code postal dans la proposition avant de sélectionner.',
  'funding-city':
    'Renseignez le siège réel du porteur de la demande. Le lieu du projet peut être différent ; ces deux territoires peuvent modifier les conditions d’une aide.',
  city: 'Indiquez la ville de base ou du siège. Sélectionnez une commune proposée pour conserver les références départementales et régionales. La saisie libre reste possible.',
  place:
    'Indiquez le lieu ou la structure d’accueil. Une ville seule ne désigne pas encore la salle ni le bon interlocuteur.',
  contactId:
    'Reliez un contact du carnet : son nom et son lieu seront repris dans la demande. Vous pourrez corriger sa fiche depuis Contacts & lieux.',
  show: 'Choisissez le spectacle concerné. Dans une proposition groupée, le spectacle retenu devra être confirmé avant de passer à une option ou une représentation confirmée.',
  'prospect-show':
    'Vous pouvez chercher pour un spectacle ou pour tout le répertoire. Les critères sont évalués séparément pour chaque spectacle.',
  assignee:
    'Choisissez qui suit le dossier ou l’activité. Affecter un responsable artistique ne lui crée pas automatiquement un compte de connexion.',
  owner:
    'La personne responsable coordonne ce projet ou cette action. Les droits de connexion se règlent séparément dans Comptes & partage.',
  member:
    'Cette personne appartient à l’équipe renseignée par la troupe. Son indisponibilité aide à repérer les conflits ; elle n’annule aucune activité.',
  next: 'Écrivez une action concrète : envoyer le dossier, vérifier la jauge, rappeler un contact. Une prochaine action claire facilite le relais entre personnes.',
  deadline:
    'Choisissez le jour où reprendre ce dossier. C’est une échéance de relance, distincte de la date envisagée pour jouer.',
  date: 'Indiquez la date réellement envisagée ou convenue. Renseigner une date ne transforme pas une proposition en accord.',
  targetDate:
    'La nouvelle date modifiera la fiche source. Les horaires et le statut seront conservés ; les conflits connus seront signalés avant validation.',
  status:
    'Choisissez l’étape réelle du dossier. Une option est un accord provisoire ; une date confirmée suppose les vérifications et accords de la troupe.',
  checked:
    'Cochez seulement lorsque la prochaine action a été accomplie. Cette coche ne confirme pas le spectacle.',
  time: 'Pour repérer les chevauchements, utilisez un créneau précis comme 14:00–15:30. Un horaire incomplet sera signalé comme restant à vérifier.',
  start:
    'Renseignez le début dans le fuseau du projet. Les heures ambiguës ou inexistantes au changement d’heure doivent être corrigées.',
  end: 'L’heure de fin doit suivre le début. Scindez les activités qui passent minuit en deux créneaux pour garder des durées lisibles.',
  from: 'Cette date marque le début de la période. Vérifiez le contrat, la mission ou l’indisponibilité concernée.',
  to: 'Cette date marque la fin de la période. Pour une indisponibilité, le dernier jour indiqué reste inclus.',
  productionId:
    'Reliez l’activité à son dossier de production pour retrouver son équipe, son budget et ses documents directement depuis le planning.',
  members:
    'Affectez seulement les personnes réellement mobilisées. Le planning compare leurs créneaux et leurs indisponibilités.',
  quantity:
    'Utilisez une quantité entière. Une salle ou un véhicule possède une fiche de quantité 1 ; les autres stocks peuvent comporter plusieurs unités.',
  unavailable:
    'Indiquez les unités inutilisables ou en entretien. Le planning les retire de la capacité disponible lors des réservations.',
  actualMinutes:
    'Saisissez une durée réalisée connue, en minutes. Laisser vide signifie inconnu ; saisir zéro signifie une durée constatée nulle. Ce suivi n’est pas une paie.',
  title:
    'Donnez un nom court et reconnaissable à ce projet ou rendez-vous, pour que les autres personnes le retrouvent dans les listes et le planning.',
  genre:
    'Précisez la forme artistique : théâtre, récit, arts de la rue, musique, cirque… Elle sert au rapprochement avec les lieux.',
  topics:
    'Décrivez les sujets effectivement traités : mémoire, voisinage, écologie, transmission… Le sujet ne doit pas être déduit automatiquement du public ou de la discipline.',
  story:
    'Présentez ce que raconte et fait vivre le spectacle, avec des mots utiles à une personne qui doit envisager son accueil.',
  duration:
    'Précisez la durée du spectacle, les pauses éventuelles et les adaptations possibles, sans confondre avec le montage.',
  age: 'Indiquez le public et les âges conseillés. Un spectacle intergénérationnel n’est pas automatiquement adapté à la petite enfance.',
  capacity:
    'Indiquez la jauge et les conditions qui la limitent. Une jauge adaptable doit être discutée avec le lieu.',
  cast: 'Indiquez combien de personnes voyagent et leurs fonctions : interprétation, technique, médiation, accompagnement.',
  space:
    'Décrivez les dimensions, le sol, l’obscurité, l’accès et les contraintes de l’espace de jeu.',
  tech: 'Listez les besoins son, lumière, alimentation, sécurité et matériel réellement nécessaires. Distinguez ce que vous apportez de ce que le lieu doit fournir.',
  setup:
    'Précisez les temps de montage et démontage et le nombre de personnes à prévoir avec le lieu.',
  access:
    'Décrivez les conditions d’accessibilité et les adaptations à préparer avec les publics et le lieu. N’affirmez pas une accessibilité qui n’a pas été vérifiée.',
  weather:
    'Pour le plein air, précisez les limites météo, le lieu de repli et la personne qui décide avec l’organisateur.',
  price:
    'Présentez les conditions de prix à discuter : cession, transports, repas, hébergement, technique. Distinguez estimation et accord validé.',
  planned:
    'Saisissez le montant prévu en euros, avec deux décimales au maximum. Le budget garde cette prévision distincte du réalisé.',
  actual:
    'Un réalisé vide reste inconnu. Inscrivez un montant seulement lorsqu’il est établi ; zéro est un montant connu, pas une absence d’information.',
  basis:
    'Indiquez si les montants sont HT ou TTC. Les bases différentes ne doivent pas être mélangées dans un total global.',
  flow: 'Une recette est une somme attendue ou reçue ; une dépense, une somme prévue ou payée. Cela ne déclenche aucun mouvement bancaire.',
  amount:
    'Indiquez un paiement effectivement constaté et son justificatif. Cette saisie ne lance ni virement ni remboursement.',
  method:
    'Le moyen de règlement ne détermine pas le statut de la rémunération. Une prestation salariée ne devient pas une facture parce qu’elle est réglée par virement.',
  gross:
    'Recopiez le brut d’un calcul officiel ou du service de paie. L’atelier ne calcule pas les cotisations sociales.',
  net: 'Recopiez le net réellement à verser depuis la paie ou le calcul officiel. Pour le GUSO, le net est distinct des cotisations.',
  contributions:
    'Recopiez les cotisations indiquées par le service compétent. Aucun taux forfaitaire n’est appliqué par l’atelier.',
  cost: 'Indiquez le coût employeur depuis un calcul vérifié. Ne le déduisez pas du seul net à verser.',
  mainShow:
    'Répondez pour l’employeur qui embauche. Le caractère professionnel de son activité ou de son objet spectacle influe sur le champ GUSO.',
  live: 'Le parcours GUSO concerne le spectacle vivant. Les ateliers et autres interventions ne sont pas automatiquement couverts par ce circuit.',
  professional:
    'Il s’agit de l’embauche rémunérée de l’artiste ou du technicien pour le spectacle concerné ; le statut associatif de l’employeur ne suffit pas à décider du circuit.',
  reference:
    'Gardez une référence permettant de retrouver la pièce ou l’action réellement effectuée. Ne saisissez aucun identifiant de connexion ni secret.',
  siret:
    'Le SIRET du porteur comporte 14 chiffres. Utilisez son identification réelle ; ne mettez pas un exemple pour terminer un formulaire.',
  rna: 'Le numéro RNA d’une association ne remplace pas son SIRET. Renseignez seulement le justificatif effectivement attribué.',
  licence:
    'Indiquez la situation réelle du récépissé valant licence et sa validité si ce dossier le demande. Un numéro ne doit pas être inventé.',
  requested:
    'Saisissez le montant demandé au financeur. Vérifiez séparément les plafonds, le budget du projet et le règlement officiel du dispositif.',
  annualBudget:
    'Reprenez le budget réel du dernier exercice selon les documents comptables. Une prévision de projet est une autre donnée.',
  projectBudget:
    'Indiquez le coût prévisionnel de ce projet et ses ressources. Les engagements doivent être distingués des recettes espérées.',
  partners:
    'Précisez qui contribue au projet, avec quelle mission et quel accord. Un lieu repéré n’est pas encore un partenaire engagé.',
  email:
    'Utilisez l’adresse adaptée à ce champ. Une adresse dans le carnet n’inscrit personne à une liste de diffusion.',
  url: 'Ajoutez une adresse publique HTTP ou HTTPS. N’insérez pas de mot de passe ni de lien comportant un secret d’accès.',
  contactName:
    'Indiquez la personne qui pourra reprendre le dossier de gestion. Son compte individuel se gère dans Comptes & partage.',
  publicEmail:
    'Cette adresse peut apparaître sur les fiches destinées aux lieux. Elle est distincte de l’adresse individuelle de connexion.',
  useSeat:
    'Cochez uniquement si la commune choisie est bien le siège administratif. La ville de recherche de lieux peut être différente.',
  notes:
    'Gardez des informations professionnelles utiles et vérifiables. Évitez les données sensibles ou personnelles sans lien avec le travail de la troupe.',
};
const guideJourneys = {
  prospection: [
    'Choisir un spectacle ou le répertoire complet.',
    'Sélectionner une commune et le périmètre de recherche.',
    'Lire la source et vérifier l’accueil avant de créer une démarche.',
  ],
  demandes: [
    'Relier le lieu et le spectacle.',
    'Définir une prochaine action, un responsable et une relance.',
    'Faire évoluer l’étape lorsque les accords sont réellement établis.',
  ],
  planning: [
    'Retrouver les activités et échéances de la troupe.',
    'Déplacer une carte ou utiliser le bouton Déplacer.',
    'Vérifier les alertes puis ouvrir le projet ou la fiche source.',
  ],
  sources: [
    'Comprendre quels annuaires sont interrogés.',
    'Ajouter les sources publiques propres à la troupe.',
    'Actualiser pour recevoir les nouvelles fiches, puis vérifier leur pertinence.',
  ],
  aides: [
    'Renseigner le porteur et son siège réel.',
    'Examiner les conditions et les informations encore inconnues.',
    'Relire la source officielle avant tout dépôt.',
  ],
  acces: [
    'Un compte personnel par personne.',
    'Le responsable choisit gestion ou lecture seule.',
    'Transmettre le lien d’invitation et ajuster les droits au besoin.',
  ],
  demarrer: [
    'Choisir le profil : association, compagnie, artiste ou collectif.',
    'Renseigner le nom, la ville et le contact de gestion.',
    'Compléter les dossiers utiles ensuite, sans activer les paiements.',
  ],
};
let guideEnabled = true,
  guideControl = null,
  guideHoverTimer = 0,
  guideLeaveTimer = 0,
  guideHoverTarget = null,
  guidePointer = null,
  guidePointerFrame = false,
  guideReturningFocus = false,
  guideScheduled = false;
try {
  guideEnabled = localStorage.getItem('atelier-field-guide') !== 'off';
} catch {}

function guideLabel(control) {
  if (control.dataset?.helpTitle) return control.dataset.helpTitle;
  if (control.getAttribute('aria-label')) return control.getAttribute('aria-label');
  const label = control.labels?.[0];
  if (!label)
    return (
      control.textContent
        ?.replace(/\s+/g, ' ')
        .trim()
        .replace(/^[^\p{L}\p{N}]+/u, '') ||
      control.name ||
      'Ce champ'
    );
  const clone = label.cloneNode(true);
  for (const el of clone.querySelectorAll('input,select,textarea,button,small')) el.remove();
  return clone.textContent.replace(/\s+/g, ' ').trim() || control.name || 'Ce champ';
}
function guideText(control) {
  if (guideAction(control)) return GuideActions.text(control);
  if (control.id === 'troupe')
    return 'Choisissez l’espace de la troupe avec lequel travailler. Ses fiches, recherches et démarches restent séparées de celles des autres troupes.';
  if (control.type === 'search' && !/city|commune|ville/i.test(control.id + control.name))
    return 'Filtrez ou recherchez les informations de cette rubrique. La saisie ne modifie aucune fiche.';
  const name = control.name || control.id || '',
    form = control.form?.id || '';
  if (control.type === 'password')
    return 'Utilisez un mot de passe individuel. Ne le partagez pas avec le responsable ou les autres membres. Il ne figure pas dans les fiches de la troupe.';
  if (form === 'access-invite-form' && name === 'role')
    return 'Gestion permet de modifier les fiches ; lecture seule permet de consulter. Seul le responsable peut inviter ou changer les droits.';
  if (form === 'source-editor-form' && name === 'checked')
    return 'Indiquez la date à laquelle vous avez réellement consulté ce lien. Ce champ est une déclaration de la troupe, pas un contrôle automatique.';
  if (form === 'organization-form' && name === 'email')
    return 'Adresse de gestion de la structure. Elle n’est pas reprise comme adresse publique de diffusion. La connexion individuelle utilise son propre compte.';
  if (guideAdvice[name]) return guideAdvice[name];
  if (name.startsWith('resource-'))
    return 'Indiquez combien d’unités de cette ressource seront mobilisées sur le créneau. La capacité et les réservations simultanées sont vérifiées.';
  if (name.startsWith('ready-'))
    return 'Cochez après avoir réellement vérifié ce point avec le lieu. Une case cochée ne remplace pas l’accord ou le document nécessaire.';
  if (name === 'tags')
    return 'Sélectionnez les disciplines ou conditions effectivement repérées dans la source. Ne déduisez pas un sujet artistique d’un simple public visé.';
  if (control.type === 'checkbox')
    return 'Cette case décrit une information ou une action de la troupe. Vérifiez sa réalité avant de la cocher ; elle restera modifiable avec les droits de gestion.';
  if (control.tagName === 'SELECT')
    return 'Choisissez la valeur qui décrit la situation réelle. Si elle est inconnue, gardez « à vérifier » ou l’option vide lorsqu’elle est proposée.';
  if (control.type === 'date')
    return 'Indiquez une date connue pour ce dossier. Une échéance, une période de contrat et une date de représentation ont des fonctions différentes.';
  if (['number', 'time'].includes(control.type))
    return 'Respectez l’unité indiquée dans le libellé. Laissez un renseignement facultatif vide plutôt que de remplacer une valeur inconnue par zéro.';
  const field = typeof fundingFields !== 'undefined' && fundingFields.find((f) => f[0] === name);
  return field
    ? 'Ce renseignement appartient au dossier du porteur ou du projet. Appuyez-vous sur les pièces réelles ; un champ rempli ne certifie pas à lui seul l’éligibilité.'
    : 'Renseignez une information utile et vérifiable pour « ' +
        guideLabel(control) +
        ' ». Vous pourrez la corriger avec les droits de gestion ; les champs facultatifs peuvent rester vides.';
}
// Resolve descendants (icons, spans and labels) to the actual interactive control.
// Delegation keeps newly rendered views covered without adding listeners per button.
function guideAction(el) {
  return Boolean(
    el?.matches?.(
      'button,a[href],summary,[role="button"],input[type="submit"],input[type="button"]',
    ),
  );
}
function guideEligible(el) {
  return Boolean(
    el?.matches?.(
      'input:not([type=hidden]),select,textarea,button,a[href],summary,[role="button"]',
    ) &&
      !el.closest(
        '#admin-suggestions,#ops-command-results,#guide-dialog,#field-guide-popover,#appearance-menu,#newsletter-editor,.module-card-button,.module-dashboard-open',
      ),
  );
}
function guideTarget(node) {
  const control = node?.closest?.('input,select,textarea,button,a[href],summary,[role="button"]');
  if (guideEligible(control)) return control;
  const field = node?.closest?.('label')?.control;
  return guideEligible(field) ? field : null;
}
function guideHide() {
  clearTimeout(guideHoverTimer);
  clearTimeout(guideLeaveTimer);
  guideHoverTarget = null;
  const box = document.querySelector('#field-guide-popover');
  if (box) box.hidden = true;
  if (guideControl) {
    const ids = (guideControl.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== 'field-guide-popover');
    if (ids.length) guideControl.setAttribute('aria-describedby', ids.join(' '));
    else guideControl.removeAttribute('aria-describedby');
  }
}
function guideLeave() {
  clearTimeout(guideHoverTimer);
  guideHoverTarget = null;
  clearTimeout(guideLeaveTimer);
  // Allow the pointer to cross the gap into the tooltip without closing it.
  guideLeaveTimer = setTimeout(guideHide, guideControl?.dataset.photoSource ? 500 : 140);
}
function guideHover(control) {
  if (!control) {
    guideLeave();
    return;
  }
  if (control === guideHoverTarget) return;
  // An actionable photo card stays reachable while crossing a neighbouring photo.
  // Replacing it still requires a deliberate hover on the next control.
  const visiblePhoto =
    guideControl?.dataset.photoSource && !document.querySelector('#field-guide-popover')?.hidden;
  if (visiblePhoto) {
    clearTimeout(guideHoverTimer);
    clearTimeout(guideLeaveTimer);
  } else guideHide();
  guideHoverTarget = control;
  guideHoverTimer = setTimeout(
    () => {
      if (guideHoverTarget === control && control.isConnected) {
        guideShow(control);
        if (
          guideControl === control &&
          !document.querySelector('#field-guide-popover')?.hidden &&
          typeof personalHintSeen === 'function'
        )
          personalHintSeen(control);
      }
    },
    typeof personalHintDelay === 'function' ? personalHintDelay() : 650,
  );
}
// Keep the popup beside the pointer, flip horizontally and vertically at edges.
// Keyboard help uses the control rectangle instead of a stale mouse location.
function guidePopupPosition(r, pointer, width, height, viewportWidth, viewportHeight) {
  const margin = 12,
    gap = 14;
  let left, top;
  if (pointer) {
    left =
      pointer.x + gap + width <= viewportWidth - margin ? pointer.x + gap : pointer.x - gap - width;
    top =
      pointer.y + gap + height <= viewportHeight - margin
        ? pointer.y + gap
        : pointer.y - gap - height;
  } else {
    left = r.left;
    top = r.top > height + 16 ? r.top - height - 8 : r.bottom + 8;
  }
  return {
    left: Math.max(margin, Math.min(left, viewportWidth - width - margin)),
    top: Math.max(margin, Math.min(top, viewportHeight - height - margin)),
  };
}
function guidePosition() {
  const box = document.querySelector('#field-guide-popover');
  if (!box || box.hidden) return;
  if (!guideControl?.isConnected) {
    guideHide();
    return;
  }
  const r = guideControl.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) {
    guideHide();
    return;
  }
  const width = Math.min(350, innerWidth - 24);
  box.style.width = width + 'px';
  const height = box.offsetHeight;
  const point = guidePointer?.control === guideControl ? guidePointer : null;
  const position = guidePopupPosition(r, point, width, height, innerWidth, innerHeight);
  box.style.left = position.left + 'px';
  box.style.top = position.top + 'px';
}
function guideShow(control, force = false) {
  if (!guideEligible(control) || (!guideEnabled && !force)) return;
  guideHide();
  guideControl = control;
  if (
    !force &&
    control.getAttribute('aria-controls') === 'admin-suggestion-options' &&
    control.getAttribute('aria-expanded') === 'true' &&
    !document.querySelector('#admin-suggestions')?.hidden &&
    document.querySelector('#admin-suggestions')
  )
    return;
  const box = document.querySelector('#field-guide-popover');
  if (!box) return;
  (control.closest('dialog') || document.body).append(box);
  let photoSource = '';
  try {
    const u = new URL(control.dataset.photoSource);
    if (u.protocol === 'https:' && u.hostname === 'commons.wikimedia.org') photoSource = u.href;
  } catch {}
  box.setAttribute('role', photoSource ? 'dialog' : 'tooltip');
  if (photoSource) box.setAttribute('aria-label', guideLabel(control));
  else box.removeAttribute('aria-label');
  box.innerHTML =
    (photoSource ? '<div class="guide-photo-header"><strong>' : '<strong>') +
    esc(guideLabel(control)) +
    (photoSource
      ? '</strong><a class="guide-photo-source" data-guide-source href="' +
        esc(photoSource) +
        '" target="_blank" rel="noopener noreferrer" aria-label="Voir la source de cette photo (nouvel onglet)"></a></div><p>'
      : '</strong><p>') +
    esc(guideText(control)) +
    '</p><small>' +
    (control.disabled || control.getAttribute('aria-disabled') === 'true'
      ? 'Cette action ou ce champ est indisponible dans ce contexte.'
      : guideAction(control)
        ? ''
        : control.readOnly
          ? 'Champ en lecture seule dans ce contexte.'
          : control.required
            ? 'Champ requis pour enregistrer ce formulaire.'
            : 'Renseignement facultatif pour ce formulaire.') +
    '</small>';
  if (photoSource && control.dataset.photoLicense) {
    const license = esc(control.dataset.photoLicense);
    box
      .querySelector('p')
      ?.insertAdjacentHTML(
        'beforeend',
        ' <span class="guide-cc" role="img" aria-label="Licence ' +
          license +
          '" title="' +
          license +
          '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="12" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="currentColor">cc</text></svg></span>',
      );
  }
  box.hidden = false;
  const previous = (control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (!previous.includes(box.id))
    control.setAttribute('aria-describedby', [...previous, box.id].join(' '));
  guidePosition();
}
function guideProgress() {
  guideScheduled = false;
  for (const form of document.querySelectorAll('form')) {
    if (form.closest('#guide-dialog') || ['server-login', 'project-demo-login'].includes(form.id))
      continue;
    const fields = [
      ...form.querySelectorAll('input[required],select[required],textarea[required]'),
    ].filter((f) => !f.disabled && f.type !== 'hidden');
    if (!fields.length) continue;
    let line = form.querySelector('.guide-progress');
    if (!line) {
      line = document.createElement('p');
      line.className = 'guide-progress';
      line.setAttribute('role', 'status');
      const footer = form.querySelector('.editor-footer');
      if (footer) footer.before(line);
      else form.append(line);
    }
    const complete = fields.filter(
      (f) =>
        (f.type === 'checkbox' ? f.checked : Boolean(f.value.trim())) &&
        (f.validity?.valid ?? true),
    ).length;
    const text =
      complete +
      ' / ' +
      fields.length +
      ' champs requis renseignés · vous pourrez revenir sur les informations après enregistrement.';
    if (line.textContent !== text) line.textContent = text;
    line.hidden = !guideEnabled;
  }
}
function guideSchedule() {
  if (!guideScheduled) {
    guideScheduled = true;
    requestAnimationFrame(guideProgress);
  }
}
function guideOpen() {
  guideHide();
  closeSuggestions();
  const route = location.hash.slice(1) || 'accueil',
    steps = guideJourneys[route] || [
      'Renseigner les informations connues.',
      'Enregistrer le dossier avant de changer de page.',
      'Revenir sur les champs depuis la fiche lorsque les informations évoluent.',
    ];
  const dialog = document.querySelector('#guide-dialog');
  dialog.innerHTML = `<div class="editor-header"><span class="eyebrow">Un peu d’aide, au bon moment</span><button type="button" class="icon-action" data-guide-close aria-label="Fermer le guide">×</button></div><h2>Le fil de cette page</h2><ol>${steps.map((s) => '<li>' + esc(s) + '</li>').join('')}</ol>${guideControl?.isConnected ? '<section class="guide-current"><h3>' + esc(guideLabel(guideControl)) + '</h3><p>' + esc(guideText(guideControl)) + '</p></section>' : ''}<label class="inline-check"><input type="checkbox" data-guide-toggle ${guideEnabled ? 'checked' : ''}> Conseils au survol et au clavier</label><p class="muted">Le délai des conseils augmente avec votre familiarité et est mémorisé dans votre compte. Aucun contenu de champ ni historique de navigation ne sert à cette progression.</p><p><a href="#qualite" data-guide-close-link>Voir les informations à compléter →</a></p>`;
  dialog.showModal();
}
document.addEventListener('DOMContentLoaded', () => {
  const popover = document.createElement('div');
  popover.id = 'field-guide-popover';
  popover.hidden = true;
  popover.setAttribute('role', 'tooltip');
  document.body.append(popover);
  const dialog = document.createElement('dialog');
  dialog.id = 'guide-dialog';
  document.body.append(dialog);
  const button = document.createElement('button');
  button.className = 'guide-launch';
  button.type = 'button';
  button.setAttribute('data-guide-open', '');
  button.innerHTML = '<span aria-hidden="true">?</span> Aide';
  document.body.append(button);
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-guide-close],[data-guide-close-link]')) dialog.close();
  });
  document.addEventListener('focusin', (e) => {
    if (guideReturningFocus) return;
    if (e.target.closest?.('#field-guide-popover')) {
      clearTimeout(guideLeaveTimer);
      return;
    }
    guidePointer = null;
    const target = guideTarget(e.target);
    if (target) guideHover(target);
    else guideHide();
  });
  document.addEventListener('focusout', (e) => {
    if (e?.relatedTarget?.closest?.('#field-guide-popover')) return;
    guideHide();
    guideSchedule();
  });
  document.addEventListener('input', () => {
    guideHide();
    guideSchedule();
  });
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.target.closest?.('#field-guide-popover')) {
      clearTimeout(guideLeaveTimer);
      clearTimeout(guideHoverTimer);
      guideHoverTarget = null;
      return;
    }
    const target = guideTarget(e.target),
      previous = guideTarget(e.relatedTarget);
    if (target && Number.isFinite(e.clientX) && Number.isFinite(e.clientY))
      guidePointer = { control: target, x: e.clientX, y: e.clientY };
    if (target && target !== previous) guideHover(target);
  });
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch' || e.target.closest?.('#field-guide-popover')) return;
      // Freeze an open photo card: otherwise its source icon runs away from the cursor.
      if (guideControl?.dataset.photoSource && !popover.hidden) return;
      const target = guideTarget(e.target);
      if (!target || !Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
      guidePointer = { control: target, x: e.clientX, y: e.clientY };
      if (guideControl === target && !guidePointerFrame) {
        guidePointerFrame = true;
        requestAnimationFrame(() => {
          guidePointerFrame = false;
          guidePosition();
        });
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.relatedTarget?.closest?.('#field-guide-popover')) {
      clearTimeout(guideLeaveTimer);
      return;
    }
    const target = guideTarget(e.target),
      next = guideTarget(e.relatedTarget);
    if ((target && target !== next) || e.target.closest?.('#field-guide-popover')) guideLeave();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e?.target?.closest?.('#field-guide-popover')) guideHide();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#field-guide-popover')) return;
    guideHide();
    const photo = e.target.closest?.('[data-scene-info]');
    if (photo) {
      if (guideEnabled) guideShow(photo, true);
      return;
    }
    if (e.target.closest('[data-guide-open]')) guideOpen();
  });
  document.addEventListener('cancel', guideHide, true);
  addEventListener('blur', guideHide);
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-guide-toggle]')) {
      guideEnabled = e.target.checked;
      try {
        localStorage.setItem('atelier-field-guide', guideEnabled ? 'on' : 'off');
      } catch {}
      guideHide();
      guideSchedule();
    }
  });
  document.addEventListener('keydown', (e) => {
    guidePointer = null;
    if (e.key === 'ArrowRight' && !popover.hidden) {
      const source = popover.querySelector('a[data-guide-source]');
      if (source) {
        e.preventDefault();
        source.focus();
        return;
      }
    }
    if (e.key === 'F1') {
      e.preventDefault();
      guideOpen();
    }
    if (e.key === 'Escape' && (!popover.hidden || guideHoverTarget)) {
      e.preventDefault();
      e.stopPropagation();
      const restore = e.target?.closest?.('#field-guide-popover') ? guideControl : null;
      guideHide();
      if (restore) {
        guideReturningFocus = true;
        restore.focus?.();
        guideReturningFocus = false;
      }
    }
  });
  addEventListener('scroll', guideHide, true);
  addEventListener('resize', guidePosition);
  addEventListener('hashchange', () => {
    guideHide();
    guideControl = null;
  });
  new MutationObserver(() => {
    if (guideControl && !guideControl.isConnected) guideHide();
    guideSchedule();
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
  guideSchedule();
  window.ATELIER_GUIDE = { hide: guideHide };
});
