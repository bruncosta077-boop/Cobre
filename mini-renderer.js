
const $ = (s) => document.querySelector(s);
const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
$('#t').innerHTML = PLAY;
mini.onState((s) => {
  $('#ti').textContent = s.title; $('#ar').textContent = s.artist;
  $('#c').style.backgroundImage = s.cover ? `url("${s.cover}")` : '';
  $('#t').innerHTML = s.playing ? PAUSE : PLAY;
  $('#p div').style.width = (s.dur ? s.pos / s.dur * 100 : 0) + '%';
  $('#vl').value = Math.round(s.volume ?? 80);
  if (s.acc) { document.documentElement.style.setProperty('--cu', s.acc); document.documentElement.style.setProperty('--cu2', s.acc2 || s.acc); }
});
$('#pv').onclick = () => mini.cmd('prev'); $('#t').onclick = () => mini.cmd('toggle'); $('#nx').onclick = () => mini.cmd('next');
$('#op').onclick = () => mini.show(); $('#x').onclick = () => mini.close();
$('#vb').onclick = () => { $('#vp').hidden = !$('#vp').hidden; $('#vb').setAttribute('aria-label', $('#vp').hidden ? 'Mostrar volume' : 'Ocultar volume'); };
$('#vl').oninput = (e) => mini.volume(+e.target.value);
$('#resize').onpointerdown = (e) => { e.preventDefault(); const sx=e.screenX, sy=e.screenY, w=innerWidth, h=innerHeight; $('#resize').setPointerCapture(e.pointerId); const move=(m)=>mini.resize(w+m.screenX-sx,h+m.screenY-sy); const done=()=>{ $('#resize').removeEventListener('pointermove',move); $('#resize').removeEventListener('pointerup',done); }; $('#resize').addEventListener('pointermove',move); $('#resize').addEventListener('pointerup',done); };
