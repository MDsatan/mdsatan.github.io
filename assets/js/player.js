/* Minimal transport for the SoundCloud widget.
 *
 * The stock embed carries SoundCloud's branding (orange progress bar,
 * photographic waveform, Share button, Privacy policy badge) which fights the
 * monochrome design. So the iframe is rendered off-screen and the Widget API
 * drives a hairline card that matches the rest of the page.
 *
 * Degrades gracefully: without the API (or with the iframe blocked) the card
 * is replaced by a plain link to the track. */
(function () {
  'use strict';

  var root = document.getElementById('player');
  if (!root) return;

  var frame = document.getElementById('player-frame');
  var btn = document.getElementById('player-btn');
  var titleEl = document.getElementById('player-title');
  var stateEl = document.getElementById('player-state');
  var posEl = document.getElementById('player-pos');
  var durEl = document.getElementById('player-dur');
  var fillEl = document.getElementById('player-fill');
  var permalink = root.getAttribute('data-permalink') || 'https://soundcloud.com/';

  function fallback() {
    var p = document.createElement('p');
    p.className = 'player-fallback';
    var a = document.createElement('a');
    a.href = permalink;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Listen on SoundCloud ↗';
    p.appendChild(a);
    root.parentNode.replaceChild(p, root);
  }

  function fmt(ms) {
    if (!ms || ms < 0 || !isFinite(ms)) return '--:--';
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // The API script may still be loading (or blocked). Poll briefly.
  var waited = 0;
  (function waitForApi() {
    if (window.SC && window.SC.Widget) return init();
    waited += 200;
    if (waited > 8000) return fallback();
    setTimeout(waitForApi, 200);
  })();

  function init() {
    var widget;
    try {
      widget = window.SC.Widget(frame);
    } catch (e) {
      return fallback();
    }

    var playing = false;
    var poll = null;
    var duration = 0;

    function tick() {
      widget.getPosition(function (ms) {
        if (posEl) posEl.textContent = fmt(ms);
        if (fillEl && duration) {
          fillEl.style.width = Math.min(100, (ms / duration) * 100).toFixed(2) + '%';
        }
      });
    }

    function startPoll() {
      if (poll) return;
      tick();
      poll = setInterval(tick, 250);
    }

    function stopPoll() {
      if (!poll) return;
      clearInterval(poll);
      poll = null;
    }

    function setPlaying(next) {
      playing = next;
      root.classList.toggle('is-playing', playing);
      if (btn) btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      if (stateEl) stateEl.textContent = playing ? 'Playing' : 'Paused';
      if (playing) startPoll(); else stopPoll();
    }

    widget.bind(window.SC.Widget.Events.READY, function () {
      if (stateEl) stateEl.textContent = 'Ready';
      widget.getDuration(function (ms) {
        duration = ms;
        if (durEl) durEl.textContent = fmt(ms);
      });
      widget.getCurrentSound(function (sound) {
        if (sound && sound.title && titleEl) titleEl.textContent = sound.title;
      });
    });

    widget.bind(window.SC.Widget.Events.PLAY, function () { setPlaying(true); });
    widget.bind(window.SC.Widget.Events.PAUSE, function () { setPlaying(false); });
    widget.bind(window.SC.Widget.Events.FINISH, function () {
      setPlaying(false);
      if (fillEl) fillEl.style.width = '0%';
      if (posEl) posEl.textContent = '0:00';
    });

    if (btn) {
      btn.addEventListener('click', function () {
        if (playing) widget.pause(); else widget.play();
      });
    }
  }
})();