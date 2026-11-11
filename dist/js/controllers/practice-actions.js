'use strict';
pages.push(
  ['atelier-creation', '✧', 'La boîte de création'],
  ['bibliotheque', '¶', 'Bibliothèque'],
  ['exercices', '✧', 'Exercices & séance'],
  ['improvisation', '↝', 'Improvisation'],
);
const practiceRootView = views['atelier-creation'];
for (const [route, tab] of [
  ['bibliotheque', 'library'],
  ['exercices', 'exercises'],
  ['improvisation', 'impro'],
])
  views[route] = () => {
    practiceTab = tab;
    return practiceRootView();
  };
function practiceClockLabel() {
  const seconds = practiceClock.running
    ? Math.max(0, Math.ceil((practiceClock.deadline - Date.now()) / 1000))
    : practiceClock.remaining;
  return (
    String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
  );
}
function practiceError(error) {
  const el = document.getElementById('practice-error');
  if (el) el.textContent = error.message;
  else notice(error.message);
}
function practiceResults() {
  const results = document.getElementById(
    practiceTab === 'library' ? 'practice-library-results' : 'practice-exercise-results',
  );
  if (!results) return;
  const rows = practiceTab === 'library' ? practiceLibrary() : practiceExerciseList();
  results.innerHTML =
    practiceTab === 'library' ? practiceBookCards(rows) : practiceExerciseCards(rows);
  const count = document.getElementById('practice-result-count');
  if (count)
    count.textContent =
      rows.length + (practiceTab === 'library' ? ' référence(s)' : ' exercice(s)');
}
function practiceOpenReference(id) {
  bookingWritable();
  const ref = practiceData().references.find((r) => r.id === id) || {
      id: '',
      title: '',
      author: '',
      roles: 2,
      genre: 'Autre',
      source: '',
      note: '',
    },
    modal = document.getElementById('practice-reference-dialog');
  modal.innerHTML = `<form id="practice-reference-form"><input type="hidden" name="id" value="${esc(ref.id)}"><div class="dialog-head"><h2>${ref.id ? 'Modifier la référence' : 'Ajouter une référence'}</h2><button type="button" data-practice-close-reference aria-label="Fermer">×</button></div><label>Titre<input name="title" required maxlength="200" value="${esc(ref.title)}"></label><label>Auteur ou autrice<input name="author" maxlength="200" value="${esc(ref.author)}"></label><div class="form-row"><label>Nombre de rôles de référence<input type="number" name="roles" min="1" max="80" required value="${ref.roles}"></label><label>Genre<input name="genre" maxlength="80" value="${esc(ref.genre)}"></label></div><label>Lien vers la source ou l’édition<input type="url" name="source" maxlength="2000" value="${esc(ref.source)}"></label><label>Pourquoi cette piste pour la troupe ?<textarea name="note" maxlength="1000" rows="3">${esc(ref.note)}</textarea></label><p>Cette référence sera enregistrée avec votre espace de troupe ; aucun texte complet n’est importé depuis le lien.</p><p id="practice-reference-error" role="alert"></p><button class="primary">Enregistrer la référence</button></form>`;
  modal.showModal();
}
function practiceShare(title, content) {
  if (window.CompagnieCraft && !ModuleRegistry.canOpen('partage').ok) {
    location.hash = 'modules';
    notice('Activez Textes & disponibilités pour préparer ce partage.');
    return;
  }
  if (!sharedState.snapshot) {
    location.hash = 'atelier-partage';
    notice('Choisissez ou créez un espace privé, puis revenez préparer ce partage.');
    return;
  }
  if (!sharedCanEdit()) throw Error('Votre accès à cet espace est en lecture seule.');
  if (!sharedCanLeave()) return;
  sharedState.draft = {
    ...sharedNewText(),
    title,
    author: 'Préparation de la troupe avec CompagnieCraft',
    content,
  };
  sharedState.dirty = true;
  sharedState.historic = false;
  sharedState.history = [];
  sharedState.tab = 'texts';
  location.hash = 'atelier-partage';
  notice('Brouillon privé préparé. Relisez-le et enregistrez-le pour le partager.');
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'practice-reference-dialog';
  modal.className = 'practice-reference-dialog';
  document.body.append(modal);
});
document.addEventListener('input', (event) => {
  const el = event.target;
  try {
    if (el.id === 'practice-search') {
      practiceQuery = el.value;
      practiceResults();
    }
    if (el.id === 'practice-actors') {
      practiceActors = el.value;
      practiceResults();
    }
    if (el.id === 'practice-duration') {
      practiceDuration = el.value;
      practiceResults();
    }
    if (el.id === 'practice-participants') {
      practiceParticipants = el.value;
      practiceResults();
    }
  } catch (error) {
    practiceError(error);
  }
});
document.addEventListener('change', (event) => {
  const el = event.target;
  try {
    const fields = {
      'practice-actor-mode': 'mode',
      'practice-genre': 'genre',
      'practice-favorites': 'favorites',
      'practice-category': 'category',
      'practice-seated': 'seated',
    };
    if (fields[el.id]) {
      if (el.id === 'practice-actor-mode') practiceActorMode = el.value;
      if (el.id === 'practice-genre') practiceGenre = el.value;
      if (el.id === 'practice-favorites') practiceOnlyFavorites = el.checked;
      if (el.id === 'practice-category') practiceCategory = el.value;
      if (el.id === 'practice-seated') practiceSeated = el.checked;
      practiceResults();
    }
    if (el.hasAttribute('data-practice-minutes')) {
      const i = Number(el.dataset.practiceMinutes),
        minutes = Number(el.value);
      practiceWrite((data) => {
        if (!data.workshop[i]) throw Error('Exercice introuvable.');
        data.workshop[i].minutes = minutes;
      });
      const total = document.getElementById('practice-total');
      if (total) total.textContent = practiceData().workshop.reduce((n, r) => n + r.minutes, 0);
    }
    if (el.dataset.practiceLock) {
      if (el.checked) practiceLocks.add(el.dataset.practiceLock);
      else practiceLocks.delete(el.dataset.practiceLock);
    }
    if (['practice-impro-players', 'practice-impro-minutes'].includes(el.id)) {
      const value = Number(el.value),
        max = el.id.endsWith('players') ? 12 : 30,
        min = el.id.endsWith('players') ? 2 : 1;
      if (!Number.isInteger(value) || value < min || value > max)
        throw Error('Choisissez une valeur de ' + min + ' à ' + max + '.');
      if (practiceImpro) practiceImpro[el.id.endsWith('players') ? 'players' : 'minutes'] = value;
      if (el.id.endsWith('minutes')) {
        practiceClock.running = false;
        practiceClock.remaining = value * 60;
        const clock = document.getElementById('practice-clock');
        if (clock) clock.textContent = practiceClockLabel();
      }
    }
  } catch (error) {
    practiceError(error);
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'practice-reference-form') return;
  event.preventDefault();
  try {
    const values = Object.fromEntries(new FormData(event.target));
    practiceWrite((data) => {
      const row = {
          ...values,
          id: values.id || crypto.randomUUID(),
          roles: Number(values.roles),
          custom: true,
        },
        i = data.references.findIndex((r) => r.id === row.id);
      if (i < 0) data.references.push(row);
      else data.references[i] = row;
    });
    document.getElementById('practice-reference-dialog').close();
    render();
  } catch (error) {
    document.getElementById('practice-reference-error').textContent = error.message;
  }
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  try {
    if (d.practiceTab) {
      practiceTab = d.practiceTab;
      practiceQuery = '';
      location.hash = { library: 'bibliotheque', exercises: 'exercices', impro: 'improvisation' }[
        practiceTab
      ];
      render();
    }
    if (button.hasAttribute('data-practice-clear')) {
      practiceQuery = '';
      practiceActors = '';
      practiceGenre = '';
      practiceOnlyFavorites = false;
      practiceCategory = '';
      practiceDuration = '';
      practiceParticipants = '';
      practiceSeated = false;
      render();
    }
    if (button.hasAttribute('data-practice-reference')) practiceOpenReference(d.practiceReference);
    if (button.hasAttribute('data-practice-close-reference'))
      document.getElementById('practice-reference-dialog').close();
    if (d.practiceFavorite) {
      practiceWrite((data) => {
        data.favorites = data.favorites.includes(d.practiceFavorite)
          ? data.favorites.filter((id) => id !== d.practiceFavorite)
          : [...data.favorites, d.practiceFavorite];
      });
      practiceResults();
    }
    if (d.practiceAddExercise) {
      const exercise = practiceExercises.find((e) => e.id === d.practiceAddExercise);
      if (!exercise) throw Error('Exercice introuvable.');
      practiceWrite((data) =>
        data.workshop.push({ exerciseId: exercise.id, minutes: exercise.minutes, note: '' }),
      );
      render();
    }
    if (button.hasAttribute('data-practice-move')) {
      practiceWrite((data) => {
        const i = Number(d.practiceMove),
          j = i + Number(d.direction);
        if (i < 0 || j < 0 || i >= data.workshop.length || j >= data.workshop.length) return;
        [data.workshop[i], data.workshop[j]] = [data.workshop[j], data.workshop[i]];
      });
      render();
    }
    if (button.hasAttribute('data-practice-remove')) {
      practiceWrite((data) => data.workshop.splice(Number(d.practiceRemove), 1));
      render();
    }
    if (button.hasAttribute('data-practice-export-sequence'))
      prospectDownload(practiceSequenceText(), 'sequence-atelier.txt', 'text/plain;charset=utf-8');
    if (button.hasAttribute('data-practice-share-sequence'))
      practiceShare('Notre prochaine séance', practiceSequenceText());
    if (button.hasAttribute('data-practice-draw')) {
      const players = Number(document.getElementById('practice-impro-players').value),
        minutes = Number(document.getElementById('practice-impro-minutes').value);
      if (
        !Number.isInteger(players) ||
        players < 2 ||
        players > 12 ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 30
      )
        throw Error('Choisissez de 2 à 12 participants et de 1 à 30 minutes.');
      practiceImpro = practiceDraw({ ...practiceImpro, players, minutes }, practiceLocks);
      practiceClock.running = false;
      practiceClock.remaining = minutes * 60;
      render();
    }
    if (button.hasAttribute('data-practice-save-impro') && practiceImpro) {
      practiceWrite((data) => {
        const row = JSON.parse(JSON.stringify(practiceImpro)),
          existing = data.impros.findIndex((r) => r.id === row.id);
        if (existing >= 0) data.impros[existing] = row;
        else data.impros.push(row);
      });
      render();
    }
    if (d.practiceLoadImpro) {
      const row = practiceData().impros.find((r) => r.id === d.practiceLoadImpro);
      if (row) {
        practiceImpro = JSON.parse(JSON.stringify(row));
        practiceClock.running = false;
        practiceClock.remaining = row.minutes * 60;
        render();
      }
    }
    if (button.hasAttribute('data-practice-export-impro') && practiceImpro)
      prospectDownload(
        practiceImproText(practiceImpro),
        'improvisation.txt',
        'text/plain;charset=utf-8',
      );
    if (button.hasAttribute('data-practice-share-impro') && practiceImpro)
      practiceShare('Une situation à jouer ensemble', practiceImproText(practiceImpro));
    if (button.hasAttribute('data-practice-clock')) {
      if (practiceClock.running) {
        practiceClock.remaining = Math.max(
          0,
          Math.ceil((practiceClock.deadline - Date.now()) / 1000),
        );
        practiceClock.running = false;
      } else {
        if (practiceClock.remaining <= 0)
          practiceClock.remaining = (practiceImpro?.minutes || 3) * 60;
        practiceClock.deadline = Date.now() + practiceClock.remaining * 1000;
        practiceClock.running = true;
      }
      render();
    }
    if (button.hasAttribute('data-practice-clock-reset')) {
      practiceClock.running = false;
      practiceClock.remaining = (practiceImpro?.minutes || 3) * 60;
      render();
    }
  } catch (error) {
    practiceError(error);
  }
});
setInterval(() => {
  if (!practiceClock.running) return;
  const clock = document.getElementById('practice-clock');
  if (clock) clock.textContent = practiceClockLabel();
  if (Date.now() >= practiceClock.deadline) {
    practiceClock.running = false;
    practiceClock.remaining = 0;
    const status = document.getElementById('practice-clock-status');
    if (status) status.textContent = 'Le temps proposé est écoulé. À vous de choisir la suite.';
    const button = document.querySelector('[data-practice-clock]');
    if (button) button.textContent = 'Démarrer';
  }
}, 1000);

let practiceMoreRows = [],
  practiceMoreMessage = '',
  practiceMoreTenant = '';
function practiceMoreContext() {
  if (practiceMoreTenant !== tenant) {
    practiceMoreTenant = tenant;
    practiceMoreRows = [];
    practiceMoreMessage = '';
  }
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.hasAttribute('data-practice-more')) {
      void practiceRenewExamples();
      return;
    }
    if (button.dataset.practiceUseIdea) {
      practiceMoreContext();
      const row = practiceMoreRows.find((r) => r.id === button.dataset.practiceUseIdea);
      if (!row) return;
      practiceImpro = JSON.parse(JSON.stringify(row));
      practiceClock.running = false;
      practiceClock.remaining = row.minutes * 60;
      render();
      document.getElementById('practice-current-impro')?.focus();
    }
  } catch (error) {
    practiceError(error);
  }
});
window.addEventListener('atelier-account-changed', () => {
  practiceMoreRows = [];
  practiceMoreMessage = '';
  practiceMoreTenant = '';
});
