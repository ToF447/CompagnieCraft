/** Export local de prospection.
 * Crée un téléchargement dans le navigateur, sans envoi à un service externe. */
'use strict';

function prospectDownload(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
