'use strict';
function moduleIllustration(kind) {
  const drawings = {
    music:
      '<path d="M48 58V20l42-8v38M48 30l42-8"/><ellipse cx="36" cy="59" rx="12" ry="8"/><ellipse cx="78" cy="51" rx="12" ry="8"/>',
    search: '<circle cx="51" cy="34" r="21"/><path d="m67 50 25 20M40 27h22M40 36h15"/>',
    book: '<path d="M16 15q24-8 44 5 20-13 44-5v50q-24-8-44 5-20-13-44-5ZM60 20v50M28 29h20M28 39h20M72 29h20M72 39h20"/>',
    calendar:
      '<rect x="23" y="15" width="75" height="54" rx="6"/><path d="M23 31h75M40 9v13M81 9v13M40 42h9M61 42h9M81 42h7M40 54h9M61 54h9"/>',
    letters:
      '<rect x="22" y="16" width="76" height="48" rx="5"/><path d="m23 20 37 26 37-26M22 64l25-25M98 64 73 39"/>',
    team: '<circle cx="60" cy="24" r="10"/><circle cx="27" cy="35" r="8"/><circle cx="93" cy="35" r="8"/><path d="M41 66V53q0-15 19-15t19 15v13M12 67V56q0-11 15-11h7M108 67V56q0-11-15-11h-7"/>',
    stage: '<path d="M18 14h84v53H18ZM39 14q0 30-21 33M81 14q0 30 21 33M35 67V53h50v14M60 25v16"/>',
    impro:
      '<path d="M26 21h25l-7-10M51 21 29 57h30M70 60h24l-7 10M94 60 72 24h26"/><circle cx="15" cy="61" r="3"/><circle cx="105" cy="17" r="3"/>',
    finance:
      '<rect x="30" y="9" width="62" height="64" rx="5"/><path d="M43 24h36M43 35h20M43 47h36M43 58h22"/>',
    network:
      '<circle cx="60" cy="40" r="12"/><circle cx="24" cy="17" r="7"/><circle cx="98" cy="19" r="7"/><circle cx="24" cy="64" r="7"/><circle cx="98" cy="63" r="7"/><path d="m30 21 20 13M70 34l22-12M50 47 30 60M71 47l21 12"/>',
  };
  return (
    '<svg viewBox="0 0 120 82" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (drawings[kind] || drawings.stage) +
    '</svg>'
  );
}
function moduleCatalogueCards(publicMode = false, limit = 0) {
  return moduleCataloguePresentation(publicMode, limit);
}
function moduleGateView(plugin, access) {
  return (
    heading('Un outil qui se greffe sur votre espace', plugin.title, plugin.description) +
    `<section class="panel module-gate"><div class="module-illustration">${moduleIllustration(plugin.illustration)}</div><h2>${access.reason === 'identity' ? 'Identifiez-vous pour entrer' : access.reason === 'disabled' ? 'Cet outil est désactivé' : 'Quelques informations sont nécessaires'}</h2>${access.missing?.length ? '<ul>' + access.missing.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : ''}<p>${access.reason === 'disabled' ? 'Ses données sont conservées. Vous pouvez réactiver ce module depuis votre catalogue.' : 'Les données utiles se complètent au moment où vous en avez besoin.'}</p><div class="document-actions">${access.reason === 'identity' ? '<a class="primary" href="#connexion">Se connecter</a>' : '<button class="primary" type="button" data-module-present="' + plugin.id + '">Configurer ce module</button>'}<a class="secondary" href="#modules">Voir tous les modules →</a>${access.reason === 'profile' && access.missing.some((x) => x.includes('spectacle')) ? '<a href="#spectacles">Renseigner mon répertoire →</a>' : ''}</div></section>`
  );
}
function moduleDialogHTML(plugin) {
  const publicMode = !ModuleRegistry.identified(),
    active = !publicMode && ModuleRegistry.enabled(plugin.id),
    missing = publicMode ? [] : ModuleRegistry.missing(plugin.id);
  return `<div class="dialog-head"><span class="eyebrow">${esc(plugin.family)} · Module optionnel</span><button type="button" data-module-close aria-label="Fermer la présentation du module">×</button></div><div class="module-dialog-title"><span class="module-illustration">${moduleIllustration(plugin.illustration)}</span><div><h2>${esc(plugin.title)}</h2><p>${esc(plugin.description)}</p></div></div><section><h3>Ce que vous pourrez faire</h3><p>${esc(plugin.example)}</p><h3>Les informations nécessaires</h3><ul><li>Votre identification et le nom de la structure ou de l’artiste.</li>${plugin.required.includes('show') ? '<li>Au moins un spectacle ou une proposition dans votre répertoire.</li>' : ''}${plugin.information.map((x) => '<li>' + esc(x) + '</li>').join('')}</ul>${plugin.dependencies.length ? '<p class="muted">Dépendance : ' + plugin.dependencies.map((id) => esc(ModuleRegistry.get(id).title)).join(', ') + '. Elle sera activée avec cet outil.</p>' : ''}</section>${!publicMode && missing.some((x) => x.startsWith('Le nom')) ? '<form id="module-base-profile"><label>Nom de la structure ou nom d’artiste<input name="name" required maxlength="160"></label><button class="secondary">Enregistrer ce repère commun</button></form>' : ''}<p id="module-dialog-error" role="alert"></p><div class="document-actions">${publicMode ? '<a class="primary" href="#project-login" data-module-login>Se connecter pour choisir mes outils →</a>' : `<button type="button" class="${active ? 'secondary' : 'primary'}" data-module-toggle="${plugin.id}" data-enable="${!active}">${active ? 'Désactiver cet outil' : 'Activer cet outil'}</button>${active && !missing.length ? '<a class="primary" data-module-go href="#' + plugin.routes[0] + '">Ouvrir l’outil →</a>' : ''}${active && missing.some((x) => x.includes('spectacle')) ? '<a data-module-go href="#spectacles">Compléter le répertoire →</a>' : ''}`}</div><p class="muted">La désactivation conserve les données. Elle n’accorde ni ne retire de droits sur les espaces privés. Les outils ne sont pas vendus séparément. Le service hébergé reposera sur une participation annuelle et un accès solidaire dont les modalités restent à définir. Aucun tarif ni paiement n’est activé.</p>`;
}
views.modules = () =>
  heading(
    'Un socle commun, vos outils à la carte',
    'Mes modules',
    'Choisissez les outils utiles aujourd’hui. Ajoutez les autres quand votre pratique évolue.',
  ) +
  `<details class="module-base-summary"><summary>Profil commun & réglages</summary><section class="module-mother panel"><div><span class="eyebrow">Le module mère</span><h2>Votre structure, votre point d’ancrage.</h2><p>Identification, profil, droits, navigation et sauvegarde forment le socle. Les outils se greffent dessus avec leurs propres règles et informations utiles.</p></div><div><a class="secondary" href="#demarrer">Mon profil de départ →</a><button type="button" class="text-action" data-module-light>Commencer avec l’essentiel</button></div></section></details>${moduleLayoutToolbar()}${moduleCatalogueMode()}<div class="module-catalogue-filter"><label>Un besoin, un outil<input id="module-catalogue-query" type="search" value="${esc(moduleCatalogueQuery)}" placeholder="Prospection, textes, planning…"></label><label class="inline-check"><input id="module-only-enabled" type="checkbox" ${moduleOnlyEnabled ? 'checked' : ''}>Mes modules activés uniquement</label></div><div id="module-catalogue-cards" class="module-catalogue-grid">${moduleCatalogueCards()}</div><p class="muted">Tous les outils s’inscrivent dans un même service, sans vente par module. La participation annuelle, l’accès solidaire et les invitations pour contribution sont en préparation, sans tarif publié ni paiement activé. La version open source sous AGPL-3.0 est gratuite à installer soi-même. Le partage de connaissances et l’entraide sont au cœur du projet. Aucun code externe n’est chargé depuis ce catalogue. Vos préférences de menus restent réglables dans Mon interface.</p>`;
