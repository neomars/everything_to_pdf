'use strict';

const $ = (id) => document.getElementById(id);
const jobs = new Map();

const LABEL = { pending: 'En attente', running: 'Conversion…', done: 'Terminé', error: 'Erreur', skipped: 'Ignoré' };
const ICON = { pending: '…', running: '⟳', done: '✓', error: '✗', skipped: '–' };

function render(job) {
  jobs.set(job.id, job);
  let li = document.querySelector(`li[data-id="${job.id}"]`);
  if (!li) {
    li = document.createElement('li');
    li.dataset.id = job.id;
    $('list').appendChild(li);
  }
  li.className = job.status;
  li.replaceChildren();

  const icon = document.createElement('span');
  icon.className = 'status-icon';
  icon.textContent = ICON[job.status];

  const text = document.createElement('div');
  text.className = 'text';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = job.name;
  name.title = job.source;
  const detail = document.createElement('div');
  detail.className = 'detail';
  detail.textContent = job.status === 'done' ? job.output : job.message || LABEL[job.status];
  text.append(name, detail);

  li.append(icon, text);

  if (job.status === 'done') {
    const open = document.createElement('button');
    open.className = 'link';
    open.textContent = 'Ouvrir';
    open.onclick = () => window.api.openItem(job.output);
    const show = document.createElement('button');
    show.className = 'link';
    show.textContent = 'Dossier';
    show.onclick = () => window.api.showItem(job.output);
    li.append(open, show);
  }
  updateSummary();
}

function updateSummary() {
  const all = [...jobs.values()];
  $('results').hidden = all.length === 0;
  const count = (s) => all.filter((j) => j.status === s).length;
  const left = count('pending') + count('running');
  const parts = [`${count('done')} / ${all.length} converti(s)`];
  if (count('error')) parts.push(`${count('error')} erreur(s)`);
  if (left) parts.push(`${left} en cours`);
  $('summary').textContent = parts.join(' · ');
}

window.api.onJob((job) => {
  if (job.idle) return;
  render(job);
});

// Glisser-déposer
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => {
  e.preventDefault();
  drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => {
  e.preventDefault();
  drop.classList.remove('over');
}));
// Les fichiers déposés sont récupérés dans preload.js (un FileList ne traverse pas contextBridge) ;
// la page ne gère que la mise en évidence de la zone.

$('pick-files').onclick = () => window.api.pickFiles();
$('pick-folder').onclick = () => window.api.pickFolder();
$('clear').onclick = () => {
  for (const [id, job] of jobs) {
    if (job.status !== 'pending' && job.status !== 'running') {
      jobs.delete(id);
      document.querySelector(`li[data-id="${id}"]`)?.remove();
    }
  }
  updateSummary();
};
$('get-lo').onclick = (e) => {
  e.preventDefault();
  window.api.openExternal('https://www.libreoffice.org/download/download-libreoffice/');
};

window.api.libreOfficeAvailable().then((ok) => { $('banner').hidden = ok; });
