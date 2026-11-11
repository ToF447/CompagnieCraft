// Negative evidence only. Absence of these signals never validates a venue.
export function linkContentReview(title, html) {
  const normalize = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const heading = normalize(title),
    text = normalize(html).slice(0, 131072);
  if (
    /casino en ligne|online casino/.test(heading) &&
    /sans kyc|free spins|casino bonus|casinos en ligne|jeux d.argent/.test(text)
  )
    return {
      contentStatus: 'unrelated',
      contentNote:
        'Contenu de casino en ligne : destination sans rapport avec un accueil artistique, à écarter.',
    };
  if (/domain (?:is )?for sale|this domain is parked|domaine (?:est )?a vendre/.test(heading))
    return {
      contentStatus: 'parked',
      contentNote: 'Domaine en vente ou parqué : aucune activité artistique confirmée.',
    };
  return { contentStatus: 'unreviewed' };
}
