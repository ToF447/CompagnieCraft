/** Shared product information, not a change to storage or authentication.
 * Explain personal-account usage separately from the current demo's storage.
 * Used by the public landing and the workspace information forms. */
function dataConditionsHTML() {
  if (window.ATELIER_DEMO_HOST)
    return '<details class="data-conditions"><summary>Où sont conservés mes essais ?</summary><p>Cette démonstration publique ne crée pas de compte personnel. Les fiches, textes, disponibilités simulées et préférences restent dans le stockage de votre navigateur. Ils ne sont pas partagés entre ordinateurs et peuvent être perdus si vous effacez ce stockage.</p><p>Le serveur interroge les sources publiques pour les recherches et conserve un cache temporaire des annonces publiques. Les sources et l’hébergeur peuvent conserver leurs propres journaux techniques. Aucun paiement, e-mail ou publication communautaire n’est déclenché par le bac à sable.</p><p>N’utilisez pas cette démonstration pour des renseignements confidentiels. Une piste de recherche ne garantit ni disponibilité ni candidature ouverte.</p></details>';
  const demo = !window.ATELIER_SERVER;
  return `<details class="data-conditions"><summary>Où sont conservés mes renseignements ?</summary>
    <h3>Avec un compte personnel</h3>
    <p>En utilisation avec un compte personnel, les informations du compte et les fiches de votre espace sont conservées sur le serveur de l’application pour les retrouver à la connexion et travailler avec les personnes autorisées dans votre troupe.</p>
    <h3>Un espace privé, un partage choisi</h3>
    <p>Vos fiches et vos notes internes ne sont pas publiées automatiquement. Vous choisissez les informations que vous proposez au collectif ; les contributions publiées deviennent visibles dans cet espace de partage.</p>
    <h3>Des renseignements modifiables</h3>
    <p>Vous pouvez compléter et corriger vos fiches selon vos droits dans la troupe. Les indications manquantes restent à préciser : elles ne sont pas présentées comme des conditions d’accueil confirmées.</p>
    <h3>Les recherches et services externes</h3>
    <p>Les services externes interrogés pour une recherche reçoivent les critères nécessaires à cette recherche et peuvent conserver des journaux selon leurs propres règles. Vos notes privées ne sont pas transmises aux sites inspectés.</p>
    <p>Une piste trouvée ne vaut ni disponibilité, ni candidature acceptée. Une prise de contact ou une publication dans le collectif reste une action volontaire.</p>
  </details>${demo ? `<details class="demo-storage-note"><summary>Particularités de l’aperçu actuel</summary><p>Sur cet aperçu de démonstration, les fiches de troupe restent dans ce navigateur. Les préférences liées au compte, les textes d’équipe et les contributions publiées utilisent les services serveur lorsqu’ils sont activés. La connexion personnelle par e-mail sur Hostinger n’est pas encore activée sur ce lien.</p></details>` : ''}`;
}
