/** Versioned CSV backup, independent of DOM/storage/network. Human-readable
 * tables are paired with a typed JSON-pointer tree so nested arrays, empty
 * objects, nulls and exact text can be recovered without guessing cell types. */
'use strict';
const BackupCSV = (() => {
  const encoder = new TextEncoder();
  const sensitive =
    /password|token|secret(?:_?key)?$|csrf|cookie|authorization|invite_?link|session_?id|session_?version|api_?key/i;
  const pointer = (k) => String(k).replaceAll('~', '~0').replaceAll('/', '~1');
  const slug = (s) =>
    String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/gi, '_')
      .toLowerCase()
      .slice(0, 80) || 'donnees';
  function cell(v) {
    let s = v == null ? '' : String(v);
    if (typeof v === 'string' && /^[\s\u0000-\u001f]*[=+\-@\t\r\n]/u.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  function csv(rows) {
    return '\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n';
  }
  function base64(text) {
    const bytes = encoder.encode(text);
    let raw = '';
    for (let i = 0; i < bytes.length; i += 8192)
      raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(raw);
  }
  function collect(input) {
    const tree = [
        ['noeud_id', 'parent_id', 'chemin_json_pointer', 'type', 'valeur_json_utf8_base64'],
      ],
      redactions = [],
      tables = new Map();
    let count = 0;
    function visit(value, path = '', parent = '', schema = 'racine') {
      if (++count > 500000 || path.split('/').length > 40)
        throw Error('Sauvegarde trop volumineuse ou trop imbriquée.');
      const id = 'n' + count,
        type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      tree.push([
        id,
        parent,
        path,
        type,
        ['object', 'array'].includes(type) ? '' : base64(JSON.stringify(value)),
      ]);
      if (type === 'object') {
        const record = Object.assign(Object.create(null), {
          _noeud_id: id,
          _parent_id: parent,
          _chemin: path,
        });
        for (const key of Object.keys(value).sort()) {
          const child = value[key];
          if (sensitive.test(key)) {
            redactions.push([path + '/' + pointer(key), 'Champ d’authentification exclu']);
            continue;
          }
          if (child === null || typeof child !== 'object') record['donnee.' + key] = child;
          else record['lien.' + key + '__chemin'] = path + '/' + pointer(key);
        }
        if (!tables.has(schema)) tables.set(schema, []);
        tables.get(schema).push(record);
        for (const key of Object.keys(value).sort())
          if (!sensitive.test(key))
            visit(value[key], path + '/' + pointer(key), id, schema + '/' + key);
      } else if (type === 'array') {
        value.forEach((child, i) => {
          if (child === null || typeof child !== 'object') {
            if (!tables.has(schema)) tables.set(schema, []);
            tables.get(schema).push({
              _parent_id: id,
              _chemin: path + '/' + i,
              index: i,
              type: child === null ? 'null' : typeof child,
              valeur: child,
            });
          }
          visit(child, path + '/' + i, id, schema);
        });
      }
    }
    visit(input);
    return { tree, tables, redactions };
  }
  async function files(bundle) {
    const { tree, tables, redactions } = collect(bundle),
      files = [],
      index = [['fichier', 'domaine', 'lignes_donnees', 'colonnes', 'sha256_utf8']],
      dictionary = [['fichier', 'colonne', 'types_observes', 'relation']];
    async function add(name, domain, rows) {
      const bytes = encoder.encode(csv(rows)),
        hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      index.push([
        name,
        domain,
        Math.max(0, rows.length - 1),
        rows[0]?.length || 0,
        [...hash].map((v) => v.toString(16).padStart(2, '0')).join(''),
      ]);
      files.push({ name, bytes });
    }
    let number = 0;
    for (const [schema, records] of tables) {
      const columns = [...new Set(records.flatMap(Object.keys))];
      const name =
        'donnees/' +
        String(++number).padStart(3, '0') +
        '_' +
        slug(schema.replace(/^racine\//, '')) +
        '.csv';
      await add(name, schema, [columns, ...records.map((r) => columns.map((c) => r[c] ?? ''))]);
      for (const column of columns)
        dictionary.push([
          name,
          column,
          [
            ...new Set(
              records
                .filter((r) => column in r)
                .map((r) => (r[column] === null ? 'null' : typeof r[column])),
            ),
          ]
            .sort()
            .join(' | '),
          column === '_parent_id' || column === '_noeud_id'
            ? 'ARBRE_COMPLET.noeud_id'
            : column === '_chemin' || column.startsWith('lien.')
              ? 'ARBRE_COMPLET.chemin_json_pointer'
              : 'Champ de la fiche d’origine',
        ]);
    }
    await add('DICTIONNAIRE.csv', 'Colonnes et relations', dictionary);
    await add('structure/ARBRE_COMPLET.csv', 'Arbre typé de toutes les données autorisées', tree);
    await add('structure/CHAMPS_EXCLUS.csv', 'Champs d’authentification exclus', [
      ['chemin', 'motif'],
      ...redactions,
    ]);
    await add('LIRE_MOI.csv', 'Notice', [
      ['rubrique', 'explication'],
      ['format', 'CompagnieCraft CSV v1'],
      [
        'encodage',
        'UTF-8 avec BOM ; séparateur point-virgule ; cellules entre guillemets ; lignes CRLF.',
      ],
      [
        'lecture',
        'Les fichiers donnees sont les tables lisibles de chaque domaine : fiches, contacts, demandes, planning, équipe, musique, newsletter et modules présents dans la sauvegarde.',
      ],
      [
        'relations',
        '_noeud_id et _parent_id relient les tables ; _chemin est un pointeur JSON. Les champs d’origine ont le préfixe donnee. : donnee.id, donnee.contactId, donnee.show, etc. DICTIONNAIRE décrit chaque colonne et ses types.',
      ],
      [
        'champs imbriques',
        'Une colonne terminant par __chemin indique la position des données imbriquées dans les autres tables et dans ARBRE_COMPLET.',
      ],
      [
        'copie exacte',
        'ARBRE_COMPLET conserve chaque nœud, son type et son parent. valeur_json_utf8_base64 contient JSON encodé en UTF-8 puis base64. Une chaîne vide, null, un objet vide et un tableau vide restent distincts. Décoder avant de reconstruire le document ; ne pas importer directement ce fichier dans la base.',
      ],
      [
        'tableur',
        'Les textes commençant par une formule sont préfixés d’une apostrophe dans les tables lisibles. La valeur exacte reste dans ARBRE_COMPLET.',
      ],
      [
        'integrite',
        'INDEX.csv donne les lignes, colonnes et empreintes SHA-256 des fichiers, BOM compris. INDEX ne se signe pas lui-même.',
      ],
      [
        'portee',
        'Voir les tables racine/metadonnees et racine/serveur : espace choisi, date, couverture et exclusions. Si le serveur est exclu volontairement, le ZIP est nommé sauvegarde-locale.',
      ],
      [
        'pieces jointes',
        'Les contenus textuels enregistrés sont inclus. Les liens et métadonnées des fichiers sont conservés ; les fichiers binaires externes ne sont pas téléchargés.',
      ],
      [
        'confidentialite',
        'Archive non chiffrée contenant vos données privées : conservez-la dans un emplacement personnel. Aucun export n’est envoyé à un tiers.',
      ],
      [
        'restauration',
        'Export de données, sans restauration automatique ni sauvegarde de la configuration d’hébergement. Les mots de passe, sessions et invitations ne sont pas restaurables par cet export.',
      ],
    ]);
    files.unshift({ name: 'INDEX.csv', bytes: encoder.encode(csv(index)) });
    return files;
  }
  // ZIP method 0 (stored), UTF-8 filenames, CRC32. No library, CDN or upload.
  function zip(files) {
    let total = 0,
      offset = 0;
    const chunks = [],
      central = [];
    const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
      for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
      return n >>> 0;
    });
    function header(size) {
      const bytes = new Uint8Array(size);
      return { bytes, v: new DataView(bytes.buffer) };
    }
    for (const file of files) {
      const name = encoder.encode(file.name),
        data = file.bytes;
      if (
        !/^[a-zA-Z0-9_/. -]+$/.test(file.name) ||
        file.name.includes('..') ||
        file.name.startsWith('/')
      )
        throw Error('Nom de fichier d’archive invalide.');
      total += data.length;
      if (total > 80000000 || files.length > 4000)
        throw Error('Sauvegarde trop volumineuse pour un téléchargement dans ce navigateur.');
      let crc = 0xffffffff;
      for (const b of data) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
      crc = (crc ^ 0xffffffff) >>> 0;
      const local = header(30);
      local.v.setUint32(0, 0x04034b50, true);
      local.v.setUint16(4, 20, true);
      local.v.setUint16(6, 0x800, true);
      local.v.setUint16(12, 33, true);
      local.v.setUint32(14, crc, true);
      local.v.setUint32(18, data.length, true);
      local.v.setUint32(22, data.length, true);
      local.v.setUint16(26, name.length, true);
      const entry = header(46);
      entry.v.setUint32(0, 0x02014b50, true);
      entry.v.setUint16(4, 20, true);
      entry.v.setUint16(6, 20, true);
      entry.v.setUint16(8, 0x800, true);
      entry.v.setUint16(14, 33, true);
      entry.v.setUint32(16, crc, true);
      entry.v.setUint32(20, data.length, true);
      entry.v.setUint32(24, data.length, true);
      entry.v.setUint16(28, name.length, true);
      entry.v.setUint32(42, offset, true);
      chunks.push(local.bytes, name, data);
      central.push(entry.bytes, name);
      offset += 30 + name.length + data.length;
    }
    const length = central.reduce((n, b) => n + b.length, 0),
      end = header(22);
    end.v.setUint32(0, 0x06054b50, true);
    end.v.setUint16(8, files.length, true);
    end.v.setUint16(10, files.length, true);
    end.v.setUint32(12, length, true);
    end.v.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end.bytes], { type: 'application/zip' });
  }
  return { cell, csv, collect, files, zip, slug };
})();
