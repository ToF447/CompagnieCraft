'use strict';
let nlSession = null,
  nlSelected = '',
  nlViewport = 'desktop',
  nlHistory = [],
  nlFuture = [],
  nlLastEdit = { key: '', at: 0 };
function nlDirty() {
  return !!nlSession && JSON.stringify(nlSession.draft) !== nlSession.initial;
}
function nlAssert() {
  if (!nlSession || nlSession.tenant !== tenant)
    throw Error('La troupe a changé. Fermez et rouvrez la maquette dans le bon espace.');
  bookingWritable();
}
function nlChange(fn, key = '') {
  nlAssert();
  const before = JSON.stringify(nlSession.draft),
    now = Date.now();
  fn(nlSession.draft);
  if (before === JSON.stringify(nlSession.draft)) return;
  if (!key || nlLastEdit.key !== key || now - nlLastEdit.at > 1000) {
    nlHistory.push(before);
    nlHistory = nlHistory.slice(-40);
  }
  nlFuture = [];
  nlLastEdit = { key, at: now };
  nlPaintPreview();
  nlPaintStatus();
}
function nlOpen() {
  if (nlSession && nlSession.tenant !== tenant) nlSession = null;
  const draft = newsletterCurrent();
  nlSession = { tenant, draft: JSON.parse(JSON.stringify(draft)), initial: JSON.stringify(draft) };
  nlSelected = draft.blocks.find((b) => b.type === 'hero')?.id || draft.blocks[0].id;
  nlHistory = [];
  nlFuture = [];
  nlViewport = 'desktop';
  const modal = document.querySelector('#newsletter-editor');
  modal.innerHTML = newsletterEditorHTML();
  nlPaintPreview();
  nlInspector();
  nlPaintStatus();
  modal.showModal();
}
function nlClose() {
  if (
    nlDirty() &&
    !confirm(
      'Fermer sans enregistrer la maquette ? Vos modifications de cette fenêtre seront abandonnées.',
    )
  )
    return;
  document.querySelector('#newsletter-editor').close();
  nlSession = null;
}
function nlError(error) {
  document.querySelector('#nl-error').textContent = error.message;
}
function nlEditField(target) {
  const key = target.dataset.nlField,
    scope = target.dataset.nlScope;
  if (!key) return;
  try {
    nlChange(
      (doc) => {
        if (scope === 'doc') {
          if (!['subject', 'preheader'].includes(key)) return;
          doc[key] = target.value;
        } else if (scope === 'style') {
          if (!['layout', 'font', 'accent', 'paper', 'align', 'radius'].includes(key)) return;
          if (key === 'paper') delete doc.style.harmony;
          doc.style[key] = key === 'radius' ? Number(target.value) : target.value;
        } else {
          const b = doc.blocks.find((b) => b.id === nlSelected);
          if (
            !b ||
            ![
              'title',
              'text',
              'src',
              'alt',
              'url',
              'label',
              'credit',
              'creditUrl',
              'license',
              'licenseUrl',
            ].includes(key)
          )
            return;
          if (key === 'src' && target.value !== b.src)
            Object.assign(b, { credit: '', creditUrl: '', license: '', licenseUrl: '' });
          b[key] = target.value;
        }
      },
      scope + ':' + nlSelected + ':' + key,
    );
  } catch (e) {
    nlError(e);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'newsletter-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    nlClose();
  });
  modal.addEventListener('input', (event) => nlEditField(event.target));
  modal.addEventListener('change', (event) => {
    const t = event.target;
    if (t.id === 'nl-zone-picker') {
      nlSelected = t.value;
      nlPaintPreview();
      nlInspector();
    } else if (t.tagName === 'SELECT' && t.dataset.nlField) nlEditField(t);
    if (t.dataset.nlDate)
      try {
        nlChange((doc) => {
          const b = doc.blocks.find((b) => b.id === nlSelected);
          if (!b || b.type !== 'dates') return;
          const ids = new Set(b.requestIds);
          if (t.checked) ids.add(t.dataset.nlDate);
          else ids.delete(t.dataset.nlDate);
          b.requestIds = [...ids];
        });
      } catch (e) {
        nlError(e);
      }
  });
  document.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if (b.hasAttribute('data-newsletter-open')) {
        nlOpen();
        return;
      }
      if (b.hasAttribute('data-newsletter-download')) {
        prospectDownload(
          newsletterHTML(newsletterCurrent()),
          'newsletter.html',
          'text/html;charset=utf-8',
        );
        return;
      }
      if (!b.closest('#newsletter-editor') || !nlSession) return;
      if (d.nlZone) {
        nlSelected = d.nlZone;
        nlPaintPreview();
        nlInspector();
      }
      if (b.hasAttribute('data-nl-general')) {
        nlSelected = '';
        nlPaintPreview();
        nlInspector();
      }
      if (d.nlViewport) {
        nlViewport = d.nlViewport;
        nlPaintPreview();
      }
      if (b.hasAttribute('data-nl-close')) {
        nlClose();
        return;
      }
      if (b.hasAttribute('data-nl-undo') || b.hasAttribute('data-nl-redo')) {
        nlAssert();
        const undo = b.hasAttribute('data-nl-undo'),
          from = undo ? nlHistory : nlFuture,
          to = undo ? nlFuture : nlHistory;
        if (from.length) {
          to.push(JSON.stringify(nlSession.draft));
          nlSession.draft = JSON.parse(from.pop());
          if (nlSelected && !nlSession.draft.blocks.some((b) => b.id === nlSelected))
            nlSelected = nlSession.draft.blocks[0].id;
          nlLastEdit = { key: '', at: 0 };
          nlPaintPreview();
          nlInspector();
          nlPaintStatus();
        }
      }
      if (d.nlPhoto) {
        const photo = (window.ATELIER_SCENES || []).find((p) => p.id === d.nlPhoto);
        nlChange((doc) =>
          newsletterPhoto(
            doc.blocks.find((b) => b.id === nlSelected),
            photo,
          ),
        );
        nlInspector();
      }
      if (d.nlMove) {
        nlChange((doc) => {
          const i = doc.blocks.findIndex((b) => b.id === nlSelected),
            j = i + Number(d.nlMove);
          if (i >= 0 && j >= 0 && j < doc.blocks.length)
            [doc.blocks[i], doc.blocks[j]] = [doc.blocks[j], doc.blocks[i]];
        });
        nlInspector();
      }
      if (b.hasAttribute('data-nl-add') || b.hasAttribute('data-nl-duplicate')) {
        nlChange((doc) => {
          if (doc.blocks.length >= 24)
            throw Error('La maquette peut contenir au maximum 24 zones.');
          const i = doc.blocks.findIndex((b) => b.id === nlSelected),
            block = b.hasAttribute('data-nl-duplicate')
              ? { ...JSON.parse(JSON.stringify(doc.blocks[i])), id: crypto.randomUUID() }
              : newsletterBlock(document.querySelector('#nl-add-kind').value);
          doc.blocks.splice(i < 0 ? doc.blocks.length : i + 1, 0, block);
          nlSelected = block.id;
        });
        nlInspector();
      }
      if (b.hasAttribute('data-nl-remove')) {
        nlChange((doc) => {
          if (doc.blocks.length < 2) return;
          const i = doc.blocks.findIndex((b) => b.id === nlSelected);
          doc.blocks.splice(i, 1);
          nlSelected = doc.blocks[Math.max(0, i - 1)].id;
        });
        nlInspector();
      }
      if (b.hasAttribute('data-nl-export')) {
        prospectDownload(
          newsletterHTML(nlSession.draft),
          'newsletter.html',
          'text/html;charset=utf-8',
        );
        notice('HTML exporté. Vérifiez l’affichage et les liens dans votre outil d’envoi.');
      }
      if (b.hasAttribute('data-nl-save')) {
        nlAssert();
        const ok = newsletterSave(nlSession.draft);
        if (!ok && !window.ATELIER_SERVER)
          throw Error('Stockage indisponible : exportez votre maquette avant de fermer.');
        document.querySelector('#newsletter-editor').close();
        nlSession = null;
        render();
        notice(
          window.ATELIER_SERVER
            ? 'Maquette transmise à la sauvegarde de la troupe.'
            : 'Maquette enregistrée pour cette troupe.',
        );
      }
    } catch (e) {
      if (nlSession) nlError(e);
      else notice(e.message);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!modal.open) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      modal.querySelector('[data-nl-save]')?.click();
    }
  });
});

window.addEventListener('beforeunload', (event) => {
  if (nlDirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});
