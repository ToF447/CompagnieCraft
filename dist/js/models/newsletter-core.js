/* Structured newsletter content only: no arbitrary HTML, scripts, CSS or sending.
 * The editor works on a private draft. Only Save replaces the troupe's layout.
 * Announced dates read public show/date/place fields from confirmed requests. */
'use strict';
const newsletterTypes = {
  brand: 'En-tête',
  hero: 'Titre & introduction',
  image: 'Photographie',
  text: 'Texte',
  cta: 'Bouton',
  dates: 'Dates à annoncer',
  footer: 'Pied de page',
};
function newsletterURL(value, image = false) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (image && /^assets\/scenes-libres\/[a-zA-Z0-9_-]+\.webp$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (
      !['https:', 'http:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      /^(localhost|127\.|0\.|10\.|192\.168\.|\[)/i.test(u.hostname) ||
      /^(172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(u.hostname) ||
      /\.(local|internal|localhost)$/i.test(u.hostname)
    )
      return '';
    return u.href;
  } catch {
    return '';
  }
}
function newsletterBlock(type) {
  if (!newsletterTypes[type]) throw Error('Zone inconnue.');
  const name = state.profile?.name || 'Votre compagnie';
  return {
    id: crypto.randomUUID(),
    type,
    title:
      type === 'brand'
        ? name
        : type === 'hero'
          ? 'Des nouvelles de la troupe'
          : type === 'dates'
            ? 'Les prochains rendez-vous'
            : type === 'text'
              ? 'À partager'
              : '',
    text:
      type === 'hero'
        ? state.company?.pitch ||
          'Un spectacle, une rencontre, une nouvelle à partager avec votre public.'
        : type === 'text'
          ? 'Racontez ici votre actualité.'
          : type === 'footer'
            ? name + '\n' + (state.company?.mail || 'Votre contact de diffusion')
            : '',
    src: '',
    alt: '',
    url: '',
    label: type === 'cta' ? 'Découvrir le spectacle' : '',
    credit: '',
    creditUrl: '',
    license: '',
    licenseUrl: '',
    requestIds: [],
  };
}
function newsletterSeed() {
  const blocks = ['brand', 'hero', 'image', 'text', 'cta', 'footer'].map(newsletterBlock);
  return {
    version: 1,
    subject:
      state.company?.communication?.subject ||
      'Les nouvelles de ' + (state.profile?.name || 'la troupe'),
    preheader: 'Spectacles, rencontres et nouvelles de la compagnie.',
    style: {
      accent: '#315244',
      paper: '#fffdf7',
      font: 'sans',
      radius: 8,
      align: 'left',
      layout: 'letter',
    },
    blocks,
    updated: '',
  };
}
function newsletterValidate(v) {
  if (JSON.stringify(v).length > 120000) throw Error('Maquette trop volumineuse.');
  if (
    !v ||
    v.version !== 1 ||
    !v.style ||
    !Array.isArray(v.blocks) ||
    v.blocks.length < 1 ||
    v.blocks.length > 24
  )
    throw Error('Maquette invalide : de 1 à 24 zones.');
  const s = v.style;
  if (
    !/^#[0-9a-f]{6}$/i.test(s.accent) ||
    !/^#[0-9a-f]{6}$/i.test(s.paper) ||
    !['sans', 'serif'].includes(s.font) ||
    !['left', 'center'].includes(s.align) ||
    !['letter', 'poster'].includes(s.layout) ||
    !Number.isInteger(s.radius) ||
    s.radius < 0 ||
    s.radius > 20
  )
    throw Error('Style de maquette invalide.');
  if (s.harmony && !harmonyValid(s.harmony)) throw Error('Harmonie de newsletter invalide.');
  const ids = new Set(),
    blocks = v.blocks.map((b) => {
      if (
        !b ||
        !newsletterTypes[b.type] ||
        typeof b.id !== 'string' ||
        !b.id ||
        b.id.length > 100 ||
        ids.has(b.id)
      )
        throw Error('Zone de maquette invalide ou en double.');
      ids.add(b.id);
      const out = { id: b.id, type: b.type };
      for (const [key, max] of Object.entries({
        title: 250,
        text: 6000,
        src: 2000,
        alt: 250,
        url: 2000,
        label: 120,
        credit: 500,
        creditUrl: 2000,
        license: 80,
        licenseUrl: 2000,
      })) {
        out[key] = opsText(b[key] || '', 'Zone : ' + key, max);
        if (
          ['src', 'url', 'creditUrl', 'licenseUrl'].includes(key) &&
          out[key] &&
          !newsletterURL(out[key], key === 'src')
        )
          throw Error('Adresse invalide dans la zone « ' + newsletterTypes[b.type] + ' ».');
      }
      if (
        !Array.isArray(b.requestIds) ||
        b.requestIds.length > 30 ||
        b.requestIds.some((id) => typeof id !== 'string' || id.length > 100) ||
        new Set(b.requestIds).size !== b.requestIds.length
      )
        throw Error('Sélection de dates invalide.');
      out.requestIds = [...b.requestIds];
      return out;
    });
  return {
    version: 1,
    subject: opsText(v.subject, 'Objet', 250, true),
    preheader: opsText(v.preheader || '', 'Texte d’aperçu', 250),
    style: {
      ...(s.harmony ? { harmony: { hue: s.harmony.hue, theme: s.harmony.theme } } : {}),
      accent: s.accent,
      paper: s.paper,
      font: s.font,
      radius: s.radius,
      align: s.align,
      layout: s.layout,
    },
    blocks,
    updated: opsText(v.updated || '', 'Date de sauvegarde', 40),
  };
}
function newsletterCurrent() {
  return state.newsletter ? newsletterValidate(state.newsletter) : newsletterSeed();
}
function newsletterDates(block) {
  return block.requestIds
    .map((id) => state.requests.find((r) => r.id === id && r.status === 'confirmed' && r.date))
    .filter(Boolean)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
function newsletterPhoto(block, photo) {
  if (!photo || !newsletterURL(photo.src, true)) throw Error('Photographie introuvable.');
  Object.assign(block, {
    src: photo.src,
    alt: photo.alt || photo.caption || '',
    credit: photo.credit || '',
    creditUrl: photo.source || '',
    license: photo.license || '',
    licenseUrl: photo.licenseUrl || '',
  });
}
function newsletterContrast(hex) {
  const values = hex
      .slice(1)
      .match(/../g)
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)),
    l = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#111111' : '#ffffff';
}
function newsletterText(value) {
  return esc(value).replaceAll('\n', '<br>');
}
function newsletterImageURL(src, origin) {
  if (src.startsWith('assets/')) {
    const u = new URL(src, origin);
    return u.href;
  }
  return newsletterURL(src, true);
}
function newsletterBlockHTML(block, doc, exporting = false, origin = location.origin + '/') {
  const s = doc.style,
    c = newsletterColors(doc),
    font = s.font === 'serif' ? 'Georgia,serif' : 'Arial,sans-serif',
    title = 'margin:0 0 14px;font-family:' + font + ';line-height:1.2;color:' + c.text + ';',
    paragraph = 'margin:0;line-height:1.7;color:' + c.text + ';',
    url = newsletterURL(block.url),
    text = newsletterText(block.text);
  if (block.type === 'brand')
    return (
      '<p style="margin:0;font:bold 19px ' +
      font +
      ';color:' +
      s.accent +
      ';letter-spacing:-.4px">' +
      esc(block.title) +
      '</p>' +
      (block.text
        ? '<p style="' + paragraph + 'font-size:12px;margin-top:5px">' + text + '</p>'
        : '')
    );
  if (block.type === 'hero')
    return (
      '<h1 style="' +
      title +
      'font-size:' +
      (s.layout === 'poster' ? 42 : 34) +
      'px">' +
      esc(block.title) +
      '</h1><p style="' +
      paragraph +
      'font-size:17px">' +
      text +
      '</p>'
    );
  if (block.type === 'image') {
    const source = block.src ? newsletterImageURL(block.src, origin) : '';
    return source
      ? '<img src="' +
          esc(source) +
          '" alt="' +
          esc(block.alt) +
          '" width="556" style="display:block;width:100%;height:auto;max-width:100%;border:0;border-radius:' +
          s.radius +
          'px">' +
          (block.credit
            ? '<p style="font:11px/1.5 Arial,sans-serif;margin:9px 0;color:' +
              c.muted +
              '">Photographie : ' +
              esc(block.credit) +
              (block.license ? ' · ' + esc(block.license) : '') +
              (exporting && block.creditUrl
                ? ' · <a href="' +
                  esc(newsletterURL(block.creditUrl)) +
                  '" style="color:inherit">Source</a>'
                : '') +
              (exporting && block.licenseUrl
                ? ' · <a href="' +
                  esc(newsletterURL(block.licenseUrl)) +
                  '" style="color:inherit">Licence</a>'
                : '') +
              '</p>'
            : '')
      : exporting
        ? ''
        : '<div class="nl-image-empty"><span aria-hidden="true">＋</span>Choisir une photographie<small>Depuis la sélection libre ou une adresse d’image</small></div>';
  }
  if (block.type === 'text')
    return (
      (block.title ? '<h2 style="' + title + 'font-size:24px">' + esc(block.title) + '</h2>' : '') +
      '<p style="' +
      paragraph +
      'font-size:16px">' +
      text +
      '</p>'
    );
  if (block.type === 'cta') {
    const label = esc(block.label || 'Votre bouton'),
      style =
        'display:inline-block;padding:14px 24px;border-radius:' +
        s.radius +
        'px;background:' +
        s.accent +
        ';color:' +
        newsletterContrast(s.accent) +
        ';font:bold 15px Arial,sans-serif;text-decoration:none;';
    return exporting
      ? url
        ? '<a href="' + esc(url) + '" style="' + style + '">' + label + '</a>'
        : '<p style="' + paragraph + '">' + label + ' — lien à compléter</p>'
      : '<span style="' + style + '">' + label + '</span>';
  }
  if (block.type === 'dates') {
    const dates = newsletterDates(block);
    return (
      '<h2 style="' +
      title +
      'font-size:24px">' +
      esc(block.title) +
      '</h2>' +
      dates
        .map(
          (r) =>
            '<p style="' +
            paragraph +
            'padding:12px 0;border-bottom:1px solid ' +
            c.border +
            '"><strong>' +
            esc(r.show) +
            '</strong><br>' +
            date(r.date) +
            ' · ' +
            esc(r.place) +
            '</p>',
        )
        .join('') +
      (!dates.length && !exporting
        ? '<p class="nl-date-empty">Choisissez les dates confirmées à annoncer.</p>'
        : '')
    );
  }
  return (
    '<p style="font:12px/1.8 Arial,sans-serif;color:' +
    c.muted +
    ';margin:0">' +
    text +
    '</p>' +
    (exporting && url
      ? '<p style="font:12px Arial,sans-serif;margin:12px 0 0"><a href="' +
        esc(url) +
        '" style="color:' +
        s.accent +
        '">' +
        esc(block.label || 'Gérer mon abonnement') +
        '</a></p>'
      : '')
  );
}
function newsletterColors(doc) {
  return doc.style.harmony
    ? harmonyPalette(doc.style.harmony.hue, doc.style.harmony.theme)
    : { text: '#24352f', muted: '#65706b', border: '#e0e5df', bg: '#eef0eb' };
}
function newsletterHTML(doc, origin = location.origin + '/') {
  doc = newsletterValidate(doc);
  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    esc(doc.subject) +
    '</title></head><body style="margin:0;padding:24px 10px;background:' +
    newsletterColors(doc).bg +
    '"><div style="display:none;max-height:0;overflow:hidden;opacity:0">' +
    esc(doc.preheader) +
    '</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:' +
    doc.style.paper +
    ';font-family:' +
    (doc.style.font === 'serif' ? 'Georgia,serif' : 'Arial,sans-serif') +
    ';text-align:' +
    doc.style.align +
    '">' +
    doc.blocks
      .map(
        (b) =>
          '<tr><td style="padding:' +
          (b.type === 'brand' ? '24px 32px 16px' : '18px 32px') +
          '">' +
          newsletterBlockHTML(b, doc, true, origin) +
          '</td></tr>',
      )
      .join('') +
    '</table></td></tr></table></body></html>'
  );
}
function newsletterPlain(doc) {
  return [
    doc.subject,
    doc.preheader,
    ...doc.blocks.map((b) =>
      b.type === 'dates'
        ? [
            b.title,
            ...newsletterDates(b).map((r) => r.show + ' · ' + r.date + ' · ' + r.place),
          ].join('\n')
        : [b.title, b.text, b.label, b.url, b.type === 'image' ? b.credit : '']
            .filter(Boolean)
            .join('\n'),
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
}
function newsletterSave(doc) {
  bookingWritable();
  const next = newsletterValidate(doc);
  next.updated = new Date().toISOString();
  state.newsletter = next;
  return save();
}
