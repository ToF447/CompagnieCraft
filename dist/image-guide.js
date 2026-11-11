/* Informational resource shared by demo and connected workspace resource views. */
(() => {
  const previous = views.ressources;
  views.ressources = function (...args) {
    return (
      previous.apply(this, args) +
      `<section class="panel section-gap" aria-labelledby="image-guide-heading"><h2 id="image-guide-heading">Préparer les images du site</h2><p>Dimensions, formats, poids et cadrage : les recommandations utiles pour ordinateur, tablette et mobile, adaptées aux emplacements de CompagnieCraft.</p><p>Avec les points à vérifier avant import et les limites actuelles du site : mosaïque, transparence du logo et qualité du zoom.</p><div class="document-actions"><a class="primary" href="guide-images.html" target="_blank" rel="noopener noreferrer">Consulter la fiche ↗</a><a class="secondary" href="guide-images.html" download="CompagnieCraft-guide-images.html">Télécharger la fiche</a></div><p class="muted">Fiche imprimable, également enregistrable en PDF depuis votre navigateur.</p></section>`
    );
  };
})();
