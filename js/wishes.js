/* Guest book. Reads and saves wishes through the site's server function, so
   the database key never reaches the browser. If config.js has no databaseApi
   it falls back to this browser's storage, so the page can still be tried out. */
window.Wishes = (function () {
  const MAX_NAME = 60;
  const MAX_MESSAGE = 500;
  const REFRESH_MS = 60000;
  const LOCAL_KEY = "wedding-wishes-demo";

  /* ---------- Storage back ends ---------- */

  function apiStore(base) {
    const endpoint = base.replace(/\/+$/, "") + "/wishes";

    async function request(options) {
      const res = await fetch(endpoint, {
        ...options,
        // Older phones and in-app browsers lack this timeout helper.
        signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
      });
      if (!res.ok) throw new Error("Guest book request failed: " + res.status);
      return res.json();
    }

    return {
      list: () => request(),
      add: (wish) =>
        request({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wish),
        }),
    };
  }

  function localStore() {
    function read() {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
      } catch {
        return [];
      }
    }
    return {
      list: async () => read(),
      add: async (wish) => {
        const saved = { id: Date.now(), created_at: new Date().toISOString(), ...wish };
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify([saved, ...read()]));
        } catch {
          /* Storage can be blocked in private windows. The wish still shows until refresh. */
        }
        return saved;
      },
    };
  }

  /* ---------- Page ---------- */

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
  }

  function init(config, guestName) {
    const form = document.getElementById("wish-form");
    const nameEl = document.getElementById("wish-name");
    const messageEl = document.getElementById("wish-message");
    const trap = document.getElementById("wish-website");
    const status = document.getElementById("wish-status");
    const submit = document.getElementById("wish-submit");
    const count = document.getElementById("wish-count");
    const listEl = document.getElementById("wish-list");

    const connected = Boolean(config.databaseApi);
    const store = connected ? apiStore(config.databaseApi) : localStore();
    document.getElementById("wish-demo").hidden = connected;

    let wishes = [];
    let hasLoaded = false;
    let loading = false;
    let sending = false;

    if (guestName) nameEl.value = guestName;

    function setStatus(text, isError) {
      status.textContent = text;
      status.classList.toggle("is-error", Boolean(isError));
    }

    function placeholder(text, withRetry) {
      const p = document.createElement("p");
      p.className = "wishes__empty";
      p.textContent = text;
      if (withRetry) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "link-btn";
        retry.textContent = "Try again";
        retry.addEventListener("click", () => load(true));
        p.append(" ", retry);
      }
      listEl.replaceChildren(p);
    }

    /* Guests' words are only ever set with textContent, so nothing they
       type can run as code on the page. */
    function render() {
      if (!wishes.length) return placeholder("Be the first to leave a wish 💜");

      listEl.replaceChildren(
        ...wishes.map((wish) => {
          const card = document.createElement("article");
          card.className = "wish";
          const message = document.createElement("p");
          message.className = "wish__message";
          message.textContent = wish.message;
          const meta = document.createElement("p");
          meta.className = "wish__meta";
          const who = document.createElement("strong");
          who.textContent = wish.name;
          const when = document.createElement("time");
          when.textContent = formatDate(wish.created_at);
          when.dateTime = wish.created_at;
          meta.append(who, when);
          card.append(message, meta);
          return card;
        })
      );
    }

    async function load(showProgress) {
      if (loading) return;
      loading = true;
      if (showProgress) placeholder("Loading wishes…");
      try {
        wishes = await store.list();
        hasLoaded = true;
        render();
      } catch (err) {
        console.error(err);
        // Keep wishes already on screen if a background refresh fails.
        if (!hasLoaded) placeholder("The guest book could not be loaded.", true);
      } finally {
        loading = false;
      }
    }

    /* Send stays off until there is a name and a wish. */
    function refreshSubmit() {
      submit.disabled = sending || !nameEl.value.trim() || !messageEl.value.trim();
    }

    messageEl.addEventListener("input", () => {
      count.textContent = `${messageEl.value.length} / ${MAX_MESSAGE}`;
    });

    // "change" as well: some phones send only that for autofill.
    ["input", "change"].forEach((type) =>
      form.addEventListener(type, () => {
        setStatus("");
        refreshSubmit();
      })
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      refreshSubmit();
      if (submit.disabled) return;

      const name = nameEl.value.trim().slice(0, MAX_NAME);
      const message = messageEl.value.trim().slice(0, MAX_MESSAGE);

      // A filled trap field means a bot: look successful and save nothing.
      if (trap.value) {
        form.reset();
        count.textContent = `0 / ${MAX_MESSAGE}`;
        refreshSubmit();
        return setStatus("Thank you for your wish!");
      }

      sending = true;
      refreshSubmit();
      setStatus("Sending…");
      try {
        const saved = await store.add({ name, message });
        wishes = [saved, ...wishes];
        hasLoaded = true;
        render();
        messageEl.value = "";
        count.textContent = `0 / ${MAX_MESSAGE}`;
        setStatus("Thank you for your wish!");
      } catch (err) {
        console.error(err);
        setStatus("Your wish could not be sent. Please try again.", true);
      } finally {
        sending = false;
        refreshSubmit();
      }
    });

    refreshSubmit();
    load(true);
    if (connected) {
      setInterval(() => {
        if (document.visibilityState === "visible") load(false);
      }, REFRESH_MS);
    }
  }

  return { init };
})();
