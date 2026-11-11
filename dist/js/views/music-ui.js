'use strict';
function musicExternal(url, label) {
  const safe = musicSafeLink(url);
  return safe
    ? `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`
    : '';
}
function musicCard(row, p) {
  const fit = musicFit(row, p),
    blocked = fit === 'blocked',
    style = musicCatalog.styles.find((s) => s.id === p.style)?.label;
  return `<article class="panel music-card"><div class="music-card-meta"><span>${esc(row.city || 'Commune à préciser')}${Number.isFinite(row.distanceKm) ? ' · ' + Math.round(row.distanceKm) + ' km' : ''}</span><span>${row.type === 'cafe' ? 'Café-concert' : row.type === 'festival' ? 'Festival' : 'Salle'}</span></div><h3>${esc(row.name)}</h3><strong>${blocked ? 'Site écarté ou inaccessible' : fit === 'large' ? 'Jauge supérieure au souhait' : fit === 'documented' ? 'Style documenté · ' + esc(style) : 'Style de programmation à qualifier'}</strong><p>${esc(row.evidence)}</p>${row.styleEvidence ? '<p class="muted">Catégories déclarées : ' + esc(row.styleEvidence) + '</p>' : ''}<p>${row.capacity ? esc(row.capacity) + ' places déclarées' : 'Jauge non renseignée'} · ${p.format === 'acoustique' ? 'Accueil acoustique' : 'Sonorisation et accueil amplifié'} à confirmer.</p>${row.check ? '<p class="muted">Contrôle du site : ' + esc(row.check.reason) + '</p>' : '<p class="muted">Site non contrôlé à cette requête.</p>'}${row.curated ? '<p class="muted">Repères documentés le ' + esc(musicCatalog.reviewedAt) + '. ' + esc(row.conditions || '') + '</p>' : ''}${row.check?.events?.length ? '<details><summary>Événements publiés dans les 12 prochains mois · à confirmer</summary><ul>' + row.check.events.map((ev) => '<li>' + esc(ev.start) + ' · ' + esc(ev.name || ev.title || 'Concert publié') + '</li>').join('') + '</ul><p>Une programmation publiée ne signifie pas une candidature ouverte.</p></details>' : ''}<div class="music-links">${!blocked ? musicExternal(row.url, 'Site / programmation') : ''}${musicExternal(row.source, 'Source')}</div>${!blocked && fit !== 'large' ? '<button type="button" class="secondary" data-music-contact="' + esc(row.id) + '">Garder dans mes contacts</button>' : ''}${fit === 'documented' ? '<button type="button" class="primary" data-music-proposal="' + esc(row.id) + '">Préparer ma candidature</button>' : ''}</article>`;
}
function musicView() {
  if (!musicCatalog) {
    void musicLoadCatalog()
      .then(() => {
        if (location.hash === '#musique') render();
      })
      .catch((e) => notice(e.message));
    return heading(
      'Diffusion musicale',
      'Musique & petites scènes',
      'Chargement des sources musicales…',
    );
  }
  const p = musicProfile(),
    r = musicResults.tenant === tenant ? musicResults : null,
    style = musicCatalog.styles.find((s) => s.id === p.style)?.label;
  const rows = r?.rows || [],
    good = rows.filter((x) => musicFit(x, p) === 'documented'),
    qualify = rows.filter((x) => musicFit(x, p) === 'qualify'),
    excluded = rows.filter((x) => ['blocked', 'large'].includes(musicFit(x, p)));
  return (
    heading(
      'Un module gratuit, à votre rythme',
      'Musique & petites scènes',
      'Petites salles, cafés-concerts associatifs et festivals : chercher selon votre musique, puis ouvrir le dialogue.',
    ) +
    `<section class="panel music-project"><details ${!p.title ? 'open' : ''}><summary>Mon projet musical${p.title ? ' · ' + esc(p.title) : ' · quelques repères pour mieux chercher'}</summary><form id="music-profile" class="music-form"><label>Projet / nom d’artiste<input name="title" maxlength="160" value="${esc(p.title)}" placeholder="Votre groupe ou votre formule concert"></label><label>Style principal<select name="style">${musicCatalog.styles.map((s) => `<option value="${s.id}" ${s.id === p.style ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label><label>Format<select name="format"><option value="amplifie" ${p.format === 'amplifie' ? 'selected' : ''}>Amplifié</option><option value="acoustique" ${p.format === 'acoustique' ? 'selected' : ''}>Acoustique</option></select></label><label>Musiciens sur scène<input name="members" type="number" min="1" max="30" value="${p.members}"></label><label>Durée du concert (min)<input name="duration" type="number" min="1" max="300" value="${p.duration}"></label><label>Jauge maximale souhaitée · hors festivals<input name="capacity" type="number" min="1" max="2000" value="${p.capacity}"></label><label class="music-wide">Lien d’écoute / vidéo<input name="listen" type="url" maxlength="500" value="${esc(p.listen)}" placeholder="https://…"></label><label class="music-wide">Besoins et formule · plateau, son, matériel, déplacement<textarea name="notes" maxlength="3000">${esc(p.notes)}</textarea></label><button class="primary">Enregistrer mon projet</button><span class="muted">Votre fiche reste dans votre espace. Aucun message n’est envoyé.</span></form></details></section><section class="panel"><form id="music-search" class="music-form"><label>Style à rechercher<select name="style">${musicCatalog.styles.map((s) => `<option value="${s.id}" ${s.id === p.style ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label><label>Où jouer ?<select name="kind"><option value="venues" ${r?.kind === 'venues' ? 'selected' : ''}>Petites salles · musique</option><option value="cafe" ${r?.kind === 'cafe' ? 'selected' : ''}>Cafés-concerts documentés</option><option value="festivals" ${r?.kind === 'festivals' ? 'selected' : ''}>Festivals musicaux</option></select></label><label>Ville de départ<input id="music-city" aria-label="Ville de départ" autocomplete="off" value="${esc(p.city?.nom || '')}" placeholder="Choisir une commune française" aria-controls="music-cities"><span id="music-cities" class="music-cities"></span></label><label>Périmètre<select name="scope">${[
      ['city', 'Cette ville'],
      ['km25', '25 km'],
      ['km50', '50 km'],
      ['km100', '100 km'],
      ['france', 'France entière'],
    ]
      .map(([v, l]) => `<option value="${v}" ${p.scope === v ? 'selected' : ''}>${l}</option>`)
      .join(
        '',
      )}</select></label><div class="music-wide music-links"><button class="primary" data-help="Relit les annuaires musicaux selon le style et la zone choisis, puis contrôle les sites lorsque ce service est disponible." ${r?.busy ? 'disabled' : ''}>${r?.busy ? 'Recherche et contrôles en cours…' : 'Rechercher des lieux musicaux'}</button><span>Annuaire relu à chaque recherche. Dates publiées : horizon de 12 mois.</span></div></form><p class="muted">Le style et la zone servent à interroger les annuaires. Les besoins techniques servent à préparer l’échange ; ils ne prouvent pas l’équipement d’un lieu.</p></section><div role="status" aria-live="polite">${r?.error ? '<p class="music-error">' + esc(r.error) + '</p>' : ''}${r?.checkedAt ? '<p>' + esc(r.coverage) + '</p><p class="muted">Annuaire consulté : ' + esc(new Date(r.checkedAt).toLocaleString('fr-FR')) + '. ' + esc(r.total) + ' fiches avant qualification · ' + rows.length + ' affichées sur cette page.</p>' : ''}</div>${r?.page ? `<section class="music-results"><h2>Style documenté · ${esc(style)} <small>${good.length}</small></h2><p>Un rapprochement artistique à affiner avec le lieu. Aucune date disponible ni rémunération n’est présumée.</p><div class="music-grid">${good.map((x) => musicCard(x, p)).join('') || '<p>Aucune correspondance documentée sur cette page. Essayez le périmètre voisin ou les festivals ; aucun lieu sans preuve de style n’est ajouté à cette sélection.</p>'}</div>${qualify.length ? '<details><summary>Musique déclarée · style ou petite jauge à qualifier (' + qualify.length + ')</summary><div class="music-grid">' + qualify.map((x) => musicCard(x, p)).join('') + '</div></details>' : ''}${excluded.length ? '<details><summary>Écartés / sites indisponibles (' + excluded.length + ')</summary><div class="music-grid">' + excluded.map((x) => musicCard(x, p)).join('') + '</div></details>' : ''}${r.kind !== 'cafe' && r.page * 20 < r.total ? '<button class="secondary" data-music-more ' + (r.busy ? 'disabled' : '') + '>Page suivante · 20 fiches</button>' : ''}</section>` : ''}<section class="panel"><h2>Préparer la prise de contact</h2><p>Gardez une piste, vérifiez la programmation, puis présentez votre formule, votre musique et votre accueil technique. Les contacts enregistrés rejoignent le carnet commun de votre structure.</p><div class="music-links"><button type="button" class="secondary" data-music-draft>Copier ma présentation musicale</button><a href="#contacts">Mes contacts →</a><a href="#demandes">Mes candidatures →</a><a href="#modules">Mes modules →</a></div><details><summary>Sources et couverture de ce module</summary><p>Festivals : liste nationale du ministère de la Culture, filtrée par catégorie musicale avant pagination. Salles : Basilic, sous-domaine musique et diffusion. Basilic ne renseigne généralement pas les styles de programmation ni les sites web ; ces pistes restent à qualifier.</p><p>Cafés-concerts : première sélection documentée, encore limitée. Un café ou restaurant ordinaire n’est jamais retenu à partir de sa seule activité commerciale. Les contrôles automatiques portent sur six sites maximum par page ; les autres restent signalés non contrôlés. Les dates absentes ne sont pas inventées.</p>${musicExternal('https://www.data.gouv.fr/datasets/liste-des-festivals-en-france', 'Annuaire national des festivals')} · ${musicExternal('https://www.data.gouv.fr/datasets/base-des-lieux-et-des-equipements-culturels', 'Basilic')}</details></section>`
  );
}
