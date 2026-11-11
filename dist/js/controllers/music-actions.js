/** UI orchestration with tenant isolation. A late response from another workspace
 * must never overwrite this user's results; page navigation cancels the job. */
'use strict';
let musicGeneration = 0,
  musicAbort,
  musicCityChoice = null,
  musicCityOptions = [],
  musicCityTimer;
ModuleRegistry.registerView('musique', 'musique', 'Musique & petites scènes', musicView);
async function musicSearch(kind, page = 1) {
  const access = ModuleRegistry.canOpen('musique');
  if (!access.ok) throw Error('Activez le module musique pour rechercher.');
  musicAbort?.abort();
  const generation = ++musicGeneration,
    workspace = tenant,
    profile = structuredClone(musicProfile()),
    controller = new AbortController();
  musicAbort = controller;
  Object.assign(musicResults, {
    tenant: workspace,
    rows: [],
    busy: true,
    error: '',
    page: 0,
    kind,
    total: 0,
    checkedAt: '',
    coverage: '',
  });
  render();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    await musicLoadCatalog();
    const radius = profile.scope.startsWith('km')
      ? await RadiusService.context(profile.city, RadiusService.km(profile.scope))
      : null;
    const params = musicSearchParams(profile, kind, page, radius);
    let data;
    if (window.ATELIER_SERVER || !window.ATELIER_MUSIC_ENDPOINT)
      data = await musicPortableSearch(params, controller.signal);
    else {
      const url = new URL(window.ATELIER_MUSIC_ENDPOINT, location.origin);
      url.search = params.toString();
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      data = await response.json();
      if (!response.ok) throw Error(data.message || 'Recherche musicale indisponible.');
    }
    if (generation !== musicGeneration || workspace !== tenant || location.hash !== '#musique')
      return;
    if (!Array.isArray(data.rows)) throw Error('Réponse musicale invalide.');
    const rows = radius ? RadiusService.filter(data.rows, radius) : data.rows;
    Object.assign(musicResults, data, { rows, tenant: workspace, kind, profile });
  } catch (e) {
    if (generation === musicGeneration && workspace === tenant)
      musicResults.error =
        e.name === 'AbortError' ? 'La recherche a expiré. Réessayez.' : e.message;
  } finally {
    clearTimeout(timeout);
    if (generation === musicGeneration && workspace === tenant) {
      musicResults.busy = false;
      if (location.hash === '#musique') render();
    }
  }
}
document.addEventListener('submit', async (e) => {
  if (!['music-profile', 'music-search'].includes(e.target.id)) return;
  e.preventDefault();
  try {
    bookingWritable();
    const values = Object.fromEntries(new FormData(e.target));
    if (e.target.id === 'music-profile') {
      const p = musicValidateProfile(values);
      state.music = p;
      save();
      Object.assign(musicResults, { rows: [], page: 0 });
      render();
      notice('Projet musical enregistré.');
    } else {
      const previous = musicProfile(),
        typed = document.getElementById('music-city').value.trim(),
        city = musicCityChoice || previous.city;
      if (values.scope !== 'france' && (!city || typed !== city.nom))
        throw Error('Sélectionnez la ville proposée avant la recherche.');
      state.music = musicValidateProfile({
        ...previous,
        style: values.style,
        scope: values.scope,
        city: values.scope === 'france' ? previous.city : city,
      });
      save();
      await musicSearch(values.kind);
    }
  } catch (error) {
    notice(error.message);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'music-city') return;
  musicCityChoice = null;
  clearTimeout(musicCityTimer);
  const input = e.target,
    value = input.value,
    workspace = tenant;
  const holder = document.getElementById('music-cities');
  if (holder) holder.innerHTML = '';
  musicCityTimer = setTimeout(async () => {
    try {
      const result = await CityService.suggest(value);
      if (tenant !== workspace || !input.isConnected || input.value !== value) return;
      musicCityOptions = result.cities || [];
      const h = document.getElementById('music-cities');
      if (h)
        h.innerHTML = musicCityOptions
          .slice(0, 6)
          .map(
            (c, i) =>
              `<button type="button" data-music-city="${i}">${esc(c.nom)} · ${esc(c.departement?.nom || c.code)}</button>`,
          )
          .join('');
    } catch {
      if (holder?.isConnected) holder.textContent = 'Villes indisponibles. Réessayez.';
    }
  }, 220);
});
document.addEventListener('click', async (e) => {
  try {
    const city = e.target.closest('[data-music-city]');
    if (city) {
      musicCityChoice = musicCityOptions[Number(city.dataset.musicCity)];
      document.getElementById('music-city').value = musicCityChoice.nom;
      document.getElementById('music-cities').innerHTML = '';
      return;
    }
    if (e.target.closest('[data-music-more]')) {
      await musicSearch(musicResults.kind, musicResults.page + 1);
      return;
    }
    const proposal = e.target.closest('[data-music-proposal]');
    if (proposal) {
      const row =
        musicResults.tenant === tenant &&
        musicResults.rows.find((r) => r.id === proposal.dataset.musicProposal);
      if (!row || musicFit(row, musicProfile()) !== 'documented')
        throw Error('Choisissez une piste documentée.');
      const show = musicRepertoireProject(),
        contact = musicContact(row);
      ModuleRegistry.toggle('candidatures', true);
      save();
      openEditor('request', '', {
        contactId: contact.id,
        show,
        place: contact.place,
        contact: contact.name,
        next: 'Vérifier le calendrier de programmation et les conditions d’accueil',
        notes:
          'Proposition musicale à préparer. Source : ' + row.source + '\n' + musicProfile().notes,
      });
      return;
    }
    const keep = e.target.closest('[data-music-contact]');
    if (keep) {
      const row =
        musicResults.tenant === tenant &&
        musicResults.rows.find((r) => r.id === keep.dataset.musicContact);
      if (!row || ['blocked', 'large'].includes(musicFit(row, musicProfile())))
        throw Error('Cette piste doit être requalifiée.');
      const contact = musicContact(row);
      save();
      openEditor('contact', contact.id);
      return;
    }
    if (e.target.closest('[data-music-draft]')) {
      const p = musicProfile();
      if (!p.title) throw Error('Renseignez d’abord le nom de votre projet musical.');
      const style = musicCatalog.styles.find((s) => s.id === p.style)?.label;
      await navigator.clipboard.writeText(
        `Bonjour,\n\nNous souhaitons échanger autour de l’accueil de ${p.title}, projet ${style}, en formule ${p.format === 'acoustique' ? 'acoustique' : 'amplifiée'}, avec ${p.members} musicien(s) et un concert de ${p.duration} minutes.\n${p.listen ? 'Écoute : ' + p.listen + '\n' : ''}${p.notes ? 'Besoins et formule : ' + p.notes + '\n' : ''}\nVotre programmation accueille-t-elle ce type de proposition ? Nous aimerions connaître votre calendrier de programmation, les conditions d’accueil et le budget possible.\n\nAu plaisir d’échanger.`,
      );
      notice('Présentation copiée. Adaptez-la au lieu avant de l’envoyer.');
    }
  } catch (error) {
    notice(error.message);
  }
});
window.addEventListener('hashchange', () => {
  if (location.hash !== '#musique') {
    musicAbort?.abort();
    musicGeneration++;
    musicResults.busy = false;
    musicCityChoice = null;
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id !== 'troupe') return;
  musicAbort?.abort();
  musicGeneration++;
  musicResults.busy = false;
  musicCityChoice = null;
});
