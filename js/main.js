(function () {
  const C = window.WEDDING;
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* No zooming. iPhones ignore the viewport setting, so a second finger is stopped here,
     along with Ctrl or Cmd + scroll, trackpad pinch and the zoom shortcuts. One finger
     still scrolls and swipes as normal. */
  const stopZoom = (e) => {
    if (e.cancelable) e.preventDefault();
  };
  const blockers = { passive: false, capture: true };
  ["gesturestart", "gesturechange", "gestureend"].forEach((name) =>
    document.addEventListener(name, stopZoom, blockers)
  );
  ["touchstart", "touchmove"].forEach((name) =>
    document.addEventListener(
      name,
      (e) => {
        if (e.touches.length > 1 || (e.scale && e.scale !== 1)) stopZoom(e);
      },
      blockers
    )
  );
  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
  });

  /* No right-click menu or developer tool shortcuts. This only deters casual visitors:
     browsers still offer these tools from their own menus, so nothing private may ever be
     placed in this page. Text fields keep their menu for pasting, and the QR code keeps
     it so that a long press can save the image. */
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest?.("input, textarea, .gift__qr")) e.preventDefault();
  });
  window.addEventListener("keydown", (e) => {
    const command = e.ctrlKey || e.metaKey;
    const devTools =
      e.key === "F12" ||
      (command && (e.shiftKey || e.altKey) && ["KeyI", "KeyJ", "KeyC"].includes(e.code)) ||
      (command && !e.shiftKey && e.code === "KeyU") ||
      (e.metaKey && e.altKey && e.code === "KeyU");
    if (devTools) e.preventDefault();
  });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- Dates ----------
     The wedding date is read as plain numbers, so a guest in another time
     zone still sees the correct day. */
  const [year, month, day] = C.date.split("-").map(Number);
  const dateUTC = new Date(Date.UTC(year, month - 1, day));
  const fmt = (options) =>
    new Intl.DateTimeFormat("en", { timeZone: "UTC", ...options }).format(dateUTC);
  const weekday = fmt({ weekday: "long" });
  const nepali = C.nepaliDate;
  const longDate = `${weekday}, ${nepali.month} ${nepali.day}, ${nepali.year}`;
  const weddingMoment = new Date(`${C.date}T${C.time}:00${C.utcOffset}`);

  /* ---------- Simple text ---------- */
  const names = `${C.partner1} & ${C.partner2}`;
  document.title = `${names} | Wedding Invitation`;
  document.querySelectorAll("[data-text]").forEach((node) => {
    node.textContent = C[node.dataset.text];
  });
  document.querySelectorAll("[data-names]").forEach((node) => (node.textContent = names));
  document.querySelectorAll("[data-long-date]").forEach((node) => (node.textContent = longDate));

  /* ---------- Guest name: share links like  yoursite.com/?name=Pawan%20Gurung ---------- */
  const guestParam = (new URLSearchParams(location.search).get("name") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  /* "Dear" and the name, written on the envelope only when the link carries a
     name. A long name is written smaller, and the very longest wrap. */
  if (guestParam) {
    const envelopeName = $("envelope-name");
    envelopeName.textContent = `Dear\n${guestParam}`;
    envelopeName.hidden = false;
    const fitEnvelopeName = () => {
      envelopeName.style.removeProperty("--name-fit");
      envelopeName.style.whiteSpace = "pre";
      envelopeName.style.maxWidth = "none";
      const room = envelopeName.parentElement.offsetWidth * 0.5;
      const fit = Math.min(1, room / envelopeName.offsetWidth);
      envelopeName.style.removeProperty("max-width");
      envelopeName.style.setProperty("--name-fit", Math.max(fit, 0.75));
      if (fit < 0.75) envelopeName.style.whiteSpace = "pre-line";
    };
    fitEnvelopeName();
    if (document.fonts && document.fonts.load) {
      document.fonts.load('1em "Dawning of a New Day"').then(fitEnvelopeName, () => {});
    }
  }

  /* ---------- Envelope ---------- */
  $("cover-photo").src = C.coverPhoto;
  $("hero-photo").src = C.heroPhoto;
  /* ---------- Background music ----------
     Starts on the tap that opens the envelope, because browsers only allow
     sound after a tap. The volume is faded with Web Audio where possible,
     since iPhones ignore audio.volume.
     A page cannot read or change the device volume, so the music is made gentle
     at the source: the song's loud parts are evened out, its brightness is
     softened, and the level is kept low, so it stays calm with the device on full. */
  const MUSIC_VOLUME = Number(C.musicVolume) || 0.18;
  const FADE_ON_OPEN = 6; // seconds
  const FADE_ON_UNMUTE = 3;
  const FADE_ON_MUTE = 1;

  let audio = null;
  let musicContext = null;
  let musicGain = null;
  let faderReady = false;
  let wantMusic = false;
  let fadeTimer = 0;
  let stopTimer = 0;
  let fade = { from: 0, to: 0, start: 0, seconds: 0 };

  // Starts and ends slowly, so no fade has an audible edge.
  const smoothCurve = (progress) => progress * progress * (3 - 2 * progress);

  // Worked out here because iPhones do not report a fading level reliably.
  function levelAt(time) {
    const progress = fade.seconds ? Math.min((time - fade.start) / fade.seconds, 1) : 1;
    return fade.from + (fade.to - fade.from) * smoothCurve(Math.max(progress, 0));
  }

  function setMusic(playing) {
    const btn = $("music-btn");
    btn.classList.toggle("is-playing", playing);
    btn.setAttribute("aria-pressed", String(playing));
    btn.setAttribute("aria-label", playing ? "Mute music" : "Play music");
  }

  function connectFader() {
    if (faderReady) return;
    faderReady = true;
    const Context = window.AudioContext || window.webkitAudioContext;
    // Web Audio plays silence for pages opened directly from a file.
    if (!Context || location.protocol === "file:") return;
    try {
      musicContext = new Context();
      musicGain = musicContext.createGain();
      musicGain.gain.value = 0;
      const soften = musicContext.createBiquadFilter();
      soften.type = "highshelf";
      soften.frequency.value = 5000;
      soften.gain.value = -3;
      const evenOut = musicContext.createDynamicsCompressor();
      evenOut.threshold.value = -30;
      evenOut.knee.value = 24;
      evenOut.ratio.value = 4;
      evenOut.attack.value = 0.03;
      evenOut.release.value = 0.6;
      musicContext.createMediaElementSource(audio).connect(soften);
      soften.connect(evenOut);
      evenOut.connect(musicGain);
      musicGain.connect(musicContext.destination);
    } catch (err) {
      console.error(err);
      musicContext = null;
      musicGain = null;
    }
  }

  function fadeTo(volume, seconds) {
    if (musicGain) {
      const now = musicContext.currentTime;
      const level = musicGain.gain;
      const from = levelAt(now);
      const steps = Math.ceil(seconds * 30);
      level.cancelScheduledValues(now);
      level.setValueAtTime(from, now);
      for (let step = 1; step <= steps; step++) {
        const progress = step / steps;
        level.linearRampToValueAtTime(from + (volume - from) * smoothCurve(progress), now + seconds * progress);
      }
      fade = { from, to: volume, start: now, seconds };
      return;
    }
    clearInterval(fadeTimer);
    const from = audio.volume;
    const started = performance.now();
    fadeTimer = setInterval(() => {
      const progress = Math.min((performance.now() - started) / (seconds * 1000), 1);
      audio.volume = from + (volume - from) * smoothCurve(progress);
      if (progress === 1) clearInterval(fadeTimer);
    }, 50);
  }

  function silence() {
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(musicContext.currentTime);
      musicGain.gain.setValueAtTime(0, musicContext.currentTime);
      fade = { from: 0, to: 0, start: 0, seconds: 0 };
    } else {
      clearInterval(fadeTimer);
      audio.volume = 0;
    }
  }

  function playMusic(fadeSeconds) {
    if (!audio) return;
    wantMusic = true;
    clearTimeout(stopTimer);
    connectFader();
    if (musicContext) musicContext.resume();
    if (audio.paused) silence();
    audio
      .play()
      .then(() => {
        if (!wantMusic) return;
        setMusic(true);
        fadeTo(MUSIC_VOLUME, fadeSeconds);
      })
      .catch((err) => {
        console.error(err);
        wantMusic = false;
        setMusic(false);
      });
  }

  function muteMusic() {
    wantMusic = false;
    setMusic(false);
    fadeTo(0, FADE_ON_MUTE);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => audio.pause(), FADE_ON_MUTE * 1000);
  }

  if (C.music) {
    audio = new Audio(C.music);
    audio.loop = true;
    audio.preload = "none";
    $("music-btn").addEventListener("click", () => {
      if (wantMusic) muteMusic();
      else {
        playMusic(FADE_ON_UNMUTE);
        holdUntil = 0; // turning the music back on restarts the scroll straight away
      }
    });
    // Stop while the guest is in another tab or app, and carry on when they return.
    document.addEventListener("visibilitychange", () => {
      if (!wantMusic) return;
      if (document.hidden) audio.pause();
      else playMusic(FADE_ON_UNMUTE);
    });
  }

  /* ---------- Slow auto-scroll ----------
     Runs while the music plays and steps aside whenever a guest is doing anything.
     Reading a form or a sent message gets a longer wait than a quick scroll. */
  const SCROLL_START_AFTER = 4500; // milliseconds, once the invitation appears
  const RESUME_SHORT = 4000; // after scrolling, tapping, keys or moving the mouse
  const RESUME_LONG = 8000; // after a form, pop-up, the map or scrolling back up
  const ENGAGING_AREAS = "form, dialog, button, a, input, textarea, iframe, .gallery, .gift, .venue__map";
  let holdUntil = 0;

  function holdScroll(ms) {
    holdUntil = Math.max(holdUntil, performance.now() + ms);
  }

  /* True for as long as the guest is in the middle of something. */
  function guestIsBusy() {
    const canHover = window.matchMedia("(hover: hover)").matches;
    const selector =
      "dialog[open], form[data-sending]" +
      (canHover ? ", #wish-form:hover, .venue__map:hover, .gallery:hover, .gift:hover" : "");
    return (
      Boolean(document.querySelector(selector)) ||
      document.activeElement.matches("input, textarea, iframe") ||
      $("wish-message").value.trim() !== "" || // a wish they have started writing
      String(window.getSelection()).trim() !== "" // text they have selected to copy
    );
  }

  function startAutoScroll() {
    const speed = Number(C.autoScrollSpeed) || 0;
    if (!speed || reducedMotion) return;

    const holdFor = (ms) => () => holdScroll(ms);
    ["wheel", "touchstart", "touchmove", "keydown"].forEach((type) =>
      window.addEventListener(type, holdFor(RESUME_SHORT), { passive: true })
    );
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "mouse") holdScroll(RESUME_SHORT);
      },
      { passive: true }
    );
    window.addEventListener(
      "pointerdown",
      (e) => holdScroll(e.target.closest && e.target.closest(ENGAGING_AREAS) ? RESUME_LONG : RESUME_SHORT),
      { passive: true }
    );
    document.addEventListener("submit", holdFor(RESUME_LONG), true);
    document.addEventListener("focusout", holdFor(RESUME_LONG));
    document.addEventListener("copy", holdFor(RESUME_LONG));
    document.addEventListener("visibilitychange", holdFor(RESUME_SHORT));

    holdScroll(SCROLL_START_AFTER);

    let position = window.scrollY;
    let previous = performance.now();

    function step(now) {
      const elapsed = Math.min(now - previous, 100);
      previous = now;

      // A scroll that was not ours: the scrollbar, or going back up to reread.
      const moved = window.scrollY - position;
      if (Math.abs(moved) > 3) holdScroll(moved < 0 ? RESUME_LONG : RESUME_SHORT);

      // The wait restarts for as long as they stay busy, so the page never moves
      // right after a form finishes sending or a message appears.
      if (guestIsBusy()) holdScroll(RESUME_LONG);

      const musicAllows = !C.music || wantMusic;
      if (!musicAllows || now < holdUntil) {
        position = window.scrollY;
      } else {
        const bottom = document.documentElement.scrollHeight - window.innerHeight;
        position = Math.min(position + (speed * elapsed) / 1000, bottom);
        window.scrollTo(0, position);
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  let opened = false;
  function openInvitation() {
    if (opened) return;
    opened = true;
    const cover = $("cover");
    cover.classList.add("is-opening");
    playMusic(FADE_ON_OPEN);

    setTimeout(
      () => {
        document.body.classList.remove("is-sealed");
        $("sheet").inert = false;
        $("music-btn").hidden = !C.music;
        window.scrollTo(0, 0);
        startAutoScroll();
        cover.classList.add("is-gone");
        setTimeout(() => (cover.hidden = true), reducedMotion ? 0 : 800);
      },
      reducedMotion ? 0 : 2100
    );
  }
  $("envelope").addEventListener("click", openInvitation); // the seal sits inside it

  $("open-btn").addEventListener("click", openInvitation);

  /* ---------- Big date block, used in both sage cards ---------- */
  function dateBlock() {
    const wrap = el("div", "datebox");
    wrap.append(
      el("span", "datebox__side", weekday),
      el("span", "datebox__day", String(nepali.day)),
      el("span", "datebox__side", `${nepali.month} ${nepali.year}`)
    );
    return wrap;
  }

  /* ---------- Ceremony info ---------- */
  C.families.forEach((family, i) => {
    if (i > 0) $("families").append(el("span", "families__rule"));
    const block = el("div", "family");
    block.append(el("p", "family__label", family.label));
    family.names.forEach((name) => block.append(el("p", "family__name", name)));
    $("families").append(block);
  });

  $("ceremony-date").append(dateBlock());
  const service = C.events[0];
  const serviceItem = el("article", "event");
  serviceItem.append(
    el("h3", "event__title", service.title),
    el("p", "event__time", service.time),
    el("p", "event__venue", service.venue),
    el("p", "event__address", service.address)
  );
  $("events").append(serviceItem);

  /* ---------- Photo gallery: a 3D carousel you can swipe ---------- */
  let current = Math.min(2, C.album.length - 1);

  const slides = C.album.map((src, i) => {
    const button = el("button", "gallery__item");
    button.type = "button";
    const img = el("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    button.append(img);
    button.addEventListener("click", () => {
      if (swiped || i === current) return;
      current = i;
      layoutGallery();
    });
    $("gallery-stage").append(button);
    return button;
  });

  const dots = C.album.map((src, i) => {
    const dot = el("button", "gallery__dot");
    dot.type = "button";
    dot.setAttribute("aria-label", `Show photo ${i + 1} of ${C.album.length}`);
    dot.addEventListener("click", () => {
      current = i;
      layoutGallery();
    });
    $("gallery-dots").append(dot);
    return dot;
  });

  function layoutGallery() {
    const n = slides.length;
    slides.forEach((slide, i) => {
      let offset = (i - current + n) % n;
      if (offset > n / 2) offset -= n;
      const far = Math.abs(offset);
      slide.style.transform =
        `translateX(${offset * 58}%) translateZ(${far * -140}px) ` +
        `rotateY(${offset * -38}deg) scale(${1 - far * 0.1})`;
      slide.style.opacity = far > 2 ? 0 : 1 - far * 0.22;
      slide.style.zIndex = 10 - far;
      slide.style.visibility = far > 2 ? "hidden" : "visible";
      slide.tabIndex = far === 1 ? 0 : -1;
      slide.classList.toggle("is-current", far === 0);
      slide.setAttribute("aria-label", far === 0 ? `Photo ${i + 1}` : `Show photo ${i + 1}`);
    });
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    scheduleAutoSlide(); // any change, including a guest's own, restarts the wait
  }

  /* Auto-slide: 0.8s to move, then about 3 seconds to look at each photo.
     It only runs while the gallery is on screen and nobody is using it. */
  const AUTO_SLIDE_MS = 3800;
  const gallerySection = $("gallery-stage").closest(".gallery");
  let autoSlideTimer = 0;
  let galleryOnScreen = false;
  let galleryBusy = false;

  function scheduleAutoSlide() {
    clearTimeout(autoSlideTimer);
    if (reducedMotion || !galleryOnScreen || galleryBusy || document.hidden || slides.length < 2) return;
    autoSlideTimer = setTimeout(() => step(1), AUTO_SLIDE_MS);
  }

  function setGalleryBusy(busy) {
    galleryBusy = busy;
    scheduleAutoSlide();
  }

  new IntersectionObserver(
    ([entry]) => {
      galleryOnScreen = entry.isIntersecting;
      scheduleAutoSlide();
    },
    { threshold: 0.4 }
  ).observe(gallerySection);

  document.addEventListener("visibilitychange", scheduleAutoSlide);
  // The side photos spill past the edge, so keep the section from being scrolled
  // to them. Not overflow: clip, which stops lazy images past the edge loading.
  gallerySection.addEventListener("scroll", () => {
    gallerySection.scrollLeft = 0;
  });
  gallerySection.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") setGalleryBusy(true);
  });
  gallerySection.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") setGalleryBusy(false);
  });
  gallerySection.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") setGalleryBusy(true);
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") setGalleryBusy(false);
  });
  window.addEventListener("pointercancel", (e) => {
    if (e.pointerType !== "mouse") setGalleryBusy(false);
  });
  gallerySection.addEventListener("focusin", (e) => {
    if (e.target.matches(":focus-visible")) setGalleryBusy(true);
  });
  gallerySection.addEventListener("focusout", () => setGalleryBusy(false));

  const step = (by) => {
    current = (current + by + slides.length) % slides.length;
    layoutGallery();
  };
  $("gallery-prev").addEventListener("click", () => step(-1));
  $("gallery-next").addEventListener("click", () => step(1));

  let swipeStart = null;
  let swiped = false;
  const stage = $("gallery-stage");
  stage.addEventListener("pointerdown", (e) => {
    swipeStart = e.clientX;
    swiped = false;
  });
  stage.addEventListener("pointerup", (e) => {
    if (swipeStart === null) return;
    const moved = e.clientX - swipeStart;
    swipeStart = null;
    if (Math.abs(moved) > 40) {
      swiped = true;
      step(moved < 0 ? 1 : -1);
      setTimeout(() => (swiped = false), 50);
    }
  });
  stage.addEventListener("pointercancel", () => (swipeStart = null));

  layoutGallery();

  /* ---------- Countdown ---------- */
  (function buildCountdown() {
    const box = $("countdown");
    const parts = {};
    ["Days", "Hours", "Min", "Sec"].forEach((unit) => {
      const cell = el("div", "countdown__cell");
      parts[unit] = el("span", "countdown__num", "0");
      cell.append(parts[unit], el("span", "countdown__unit", unit));
      box.append(cell);
    });

    let timer;
    function tick() {
      const left = weddingMoment - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        box.replaceChildren(el("p", "countdown__done", "Today we say “I do”, and forever after."));
        return;
      }
      const s = Math.floor(left / 1000);
      parts.Days.textContent = Math.floor(s / 86400);
      parts.Hours.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      parts.Min.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      parts.Sec.textContent = String(s % 60).padStart(2, "0");
    }
    timer = setInterval(tick, 1000);
    tick();
  })();

  /* ---------- Calendar ---------- */
  const HEART =
    '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C4 15 1.500 11.500 1.500 7.500 1.500 4.500 4 2 7 2c2 0 3.800 1 5 2.800C13.200 3 15 2 17 2c3 0 5.500 2.500 5.500 5.500 0 4-2.500 7.500-10.500 13.500z"/></svg>';

  (function buildCalendar() {
    const cal = $("calendar");
    cal.append(el("p", "calendar__month", `${nepali.month} ${nepali.year}`));
    const grid = el("div", "calendar__grid");
    // The Nepali week starts on Sunday.
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d) =>
      grid.append(el("span", "calendar__dow", d))
    );
    // Works back from the wedding day's weekday to the weekday of the 1st.
    const firstWeekday = (((dateUTC.getUTCDay() - (nepali.day - 1)) % 7) + 7) % 7;
    for (let i = 0; i < firstWeekday; i++) grid.append(el("span"));
    for (let d = 1; d <= nepali.daysInMonth; d++) {
      const isWedding = d === nepali.day;
      const cell = el("span", isWedding ? "calendar__day is-wedding" : "calendar__day");
      if (isWedding) {
        cell.innerHTML = HEART;
        cell.setAttribute("aria-label", `${d}, our wedding day`);
      }
      cell.append(el("span", "", String(d)));
      grid.append(cell);
    }
    cal.append(grid);
  })();

  /* ---------- Add to calendar ---------- */
  (function buildCalendarLink() {
    const stamp = (date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const end = new Date(weddingMoment.getTime() + (C.calendarHours || 6) * 3600000);
    const location = `${C.events[0].venue}, ${C.events[0].address}`; // where the day begins
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${names}'s Wedding`,
      dates: `${stamp(weddingMoment)}/${stamp(end)}`,
      details: `Join us to celebrate the wedding of ${C.partner1Full} & ${C.partner2Full}.`,
      location,
    });
    $("add-calendar").href = `https://calendar.google.com/calendar/render?${params}`;
  })();

  /* ---------- Venue and map ---------- */
  const mapsDirections = (q) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  const mapsEmbed = (q) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  const mapsWalkEmbed = (from, to) =>
    `https://www.google.com/maps?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&dirflg=w&z=18&output=embed`;
  const venueText = (event) => `${event.venue}, ${event.address}`;

  $("venue-address").textContent = venueText(C.events[0]);

  // One tab per place to show: the venue, and where to park if that is elsewhere.
  const mapped = C.events.filter((event) => event.mapQuery);
  const places = mapped.flatMap((event) => {
    const venue = {
      label: mapped.length > 1 ? event.title : "Venue",
      text: venueText(event),
      mapTitle: `Map to ${event.venue}`,
      mapQuery: event.mapQuery,
    };
    if (!event.parking) return [venue];
    return [
      {
        label: "Parking",
        text: event.parking.note,
        mapTitle: `Map to the parking area for ${event.venue}`,
        mapQuery: event.parking.mapQuery,
        mapLink: event.parking.mapLink,
        embed: mapsWalkEmbed(event.parking.walkFrom, event.parking.mapQuery),
      },
      venue,
    ];
  });
  function showMap(place, button) {
    $("map-tabs")
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    $("venue-address").textContent = place.text;
    const frame = document.createElement("iframe");
    frame.title = place.mapTitle;
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin"; // keeps ?name= out of what Google receives
    frame.src = place.embed || mapsEmbed(place.mapQuery);
    $("map-frame").replaceChildren(frame);
    $("map-frame").classList.toggle("venue__map--route", Boolean(place.embed));
    $("map-directions").href = place.mapLink || mapsDirections(place.mapQuery);
    $("map-directions").hidden = false;
  }
  if (places.length) {
    places.forEach((place) => {
      const button = el("button", "tab", place.label);
      button.type = "button";
      button.addEventListener("click", () => showMap(place, button));
      $("map-tabs").append(button);
    });
    // Open on the first tab.
    $("map-tabs").querySelector("button").click();
    if (places.length === 1) $("map-tabs").hidden = true;
  } else {
    $("map-frame").append(
      el("p", "venue__empty", "The map will appear here once your venue is added to js/config.js.")
    );
  }

  /* ---------- Schedule ---------- */
  const ICONS = {
    rings: '<circle cx="9" cy="14" r="5.5"/><circle cx="15" cy="14" r="5.5"/><path d="M7.5 6 9 4l1.5 2L9 8.500z"/>',
    camera: '<path d="M3 8.500h4l1.500-2.500h7L17 8.500h4V19H3z"/><circle cx="12" cy="13.500" r="3.500"/>',
    toast: '<path d="M4 4h6l-.6 6a2.400 2.400 0 0 1-4.800 0zM7 12.500V20M4.500 20h5M14 4h6l-.6 6a2.400 2.400 0 0 1-4.800 0zM17 12.500V20M14.500 20h5"/>',
    dinner: '<circle cx="12" cy="12" r="5"/><path d="M3 4v5a2 2 0 0 0 2 2v9M5 4v4M21 4c-1.500 1-2 3-2 6v2h2zM21 12v8"/>',
    cake: '<path d="M5 20v-7h14v7M3 20h18M7.500 13V9.500h9V13M12 9.500V6M12 3.500v.5M5 16c1.500 1.500 3 1.500 4.500 0s3-1.500 4.500 0 3.500 1.500 5 0"/>',
    music: '<path d="M9 18V6l11-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="17.500" cy="16" r="2.500"/>',
    heart: '<path d="M12 20.500C3 14.500 3.500 7 8 6c2-.4 3.200.8 4 2.200C12.800 6.800 14 5.600 16 6c4.500 1 5 8.500-4 14.500z"/>',
  };
  $("timeline").style.gridTemplateRows = `repeat(${C.schedule.length}, auto)`;
  C.schedule.forEach((item, i) => {
    const row = el("li", "timeline__row");
    row.style.setProperty("--row", i + 1);
    const medal = el("span", "timeline__medal");
    medal.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[item.icon] || ICONS.heart}</svg>`;
    row.append(
      el("span", "timeline__time", item.time),
      medal,
      el("span", "timeline__title", item.title)
    );
    $("timeline").append(row);
  });

  /* ---------- Gift ---------- */
  /* Guests reading on a phone cannot scan their own screen, so they can save the code.
     No website can write to the photo library directly, so each device gets its best route:
     - iPhone and iPad: the share sheet, where "Save Image" puts it in Photos.
     - Android: a normal download, which appears in the Gallery.
     - Computers: a normal download.
     - Apps with their own browser (Messenger, Instagram...): downloads often do nothing
       there, so guests are told to press and hold the code instead. */
  function setUpQrSave(src) {
    const link = $("gift-save");
    const hint = $("gift-hint");
    const fileName = "anmol-rojina-qr-code.jpeg";
    const userAgent = navigator.userAgent;
    const isApple =
      /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Viber|; wv\)/i.test(userAgent);
    const showHint = () => {
      hint.textContent = "Press and hold the QR code, then choose to save the image.";
      hint.hidden = false;
    };
    let file = null;

    link.href = src;
    link.download = fileName;
    link.hidden = false;

    // Fetched ahead of time: Safari only allows sharing straight after the tap.
    if (isApple && !inAppBrowser && navigator.canShare) {
      fetch(src)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
        })
        .catch(() => {});
    }

    link.addEventListener("click", async (event) => {
      if (!isApple && !inAppBrowser) return; // the browser downloads it
      event.preventDefault();
      if (!file || !navigator.canShare({ files: [file] })) return showHint();
      try {
        await navigator.share({ files: [file] });
      } catch (err) {
        if (err.name !== "AbortError") showHint(); // AbortError: the guest closed the sheet
      }
    });
  }

  if (!C.gift) {
    $("gift-section").hidden = true;
  } else {
    $("gift-note").textContent = C.gift.message;
    if (C.gift.qrImage) {
      const qr = el("img");
      qr.src = C.gift.qrImage;
      qr.alt = "QR code to support the ceremony";
      $("gift-qr").append(qr);
      setUpQrSave(C.gift.qrImage);
    } else {
      $("gift-qr").append(el("p", "gift__empty", "Your QR code will appear here"));
    }
  }

  /* ---------- Pop-ups close on the X or a tap outside ---------- */
  document.querySelectorAll(".popup").forEach((dialog) => {
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ---------- Gentle fade-in on scroll ---------- */
  const revealed = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealed.forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06 }
    );
    revealed.forEach((node) => observer.observe(node));
  }

  /* ---------- Guest book and RSVP ---------- */
  window.Wishes.init(C, guestParam);
  window.Rsvp.init(C, guestParam);
})();
