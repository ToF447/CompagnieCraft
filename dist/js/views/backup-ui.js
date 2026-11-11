'use strict';
let backupBusy = false,
  backupMessage = '';
function backupAllowed() {
  return window.ATELIER_SERVER
    ? window.ATELIER_ACCESS?.context()?.role === 'owner'
    : DemoAccess.open();
}
function backupSection() {
  if (!backupAllowed())
    return '<section class="panel section-gap"><h2>Sauvegarde des données</h2><p>Le responsable de la structure peut télécharger la sauvegarde CSV depuis cet espace.</p></section>';
  const server = Boolean(window.ATELIER_SERVER || window.ATELIER_BACKUP_ENDPOINT);
  return `<section class="panel section-gap backup-panel"><h2>Sauvegarder mes données</h2><p>Un seul téléchargement ZIP : des CSV par domaine, un index et une copie structurée complète des données incluses. Les liens entre contacts, spectacles, candidatures et projets sont conservés.</p><ul><li>Tous les modules renseignés de <strong>${esc(state.profile?.name || 'cet espace')}</strong>, même désactivés.</li><li>Mes préférences et les informations saisies dans cet onglet, conservées séparément de la dernière version serveur.</li>${window.ATELIER_SERVER ? '<li>Version enregistrée, historique conservé, membres et droits, factures et paiements de cette structure.</li>' : '<li>Avec le serveur : mes contributions au collectif et les textes, versions et disponibilités des espaces partagés dont je suis responsable.</li>'}</ul>${server ? '<label class="inline-check"><input id="backup-include-server" type="checkbox" checked ' + (backupBusy ? 'disabled' : '') + '>Inclure les données enregistrées sur le serveur</label>' : '<p>Mode local : seules les données de l’espace ouvert et les préférences de ce navigateur sont disponibles.</p>'}<p class="muted">Le ZIP ne contient pas les mots de passe, jetons d’accès ni fichiers binaires externes. Il contient les textes, liens et métadonnées enregistrés. L’export reste privé sur votre ordinateur.</p><button type="button" class="primary" data-backup-download ${backupBusy ? 'disabled' : ''}>${backupBusy ? 'Préparation de la sauvegarde…' : 'Télécharger ma sauvegarde CSV (ZIP)'}</button><p id="backup-status" role="status" aria-live="polite">${esc(backupMessage)}</p></section>`;
}
const backupAccessViewBefore = views.acces;
views.acces = () =>
  backupAccessViewBefore().replace(
    /<p class="lead">[\s\S]*?<\/p>/,
    (lead) => lead + backupSection(),
  );
