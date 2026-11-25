/* Guest book. Reads and saves wishes through the site's server function, so
   the database key never reaches the browser. If config.js has no databaseApi
   it falls back to this browser's storage, so the page can still be tried out. */
window.Wishes = (function () {
  /* A guest's name: letters in any language (Nepali included), spaces and
     . ' - & , ( ). Up to 40 characters, no word over 20 letters, no letter
     four times in a row, and a dot only before a space ("Rev. David"), so
     links, numbers and junk are turned away. js/wishes.js and api/wishes.js
     share this rule. */
  const MAX_NAME = 40;
  function nameProblem(name) {
    if (!name) return "Please enter your name.";
    if (name.length > MAX_NAME) return "Please keep your name under " + MAX_NAME + " characters.";
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'\u2019&,()-]*$/u.test(name)) return "Please use letters only in your name.";
    if (name.split(" ").some((word) => word.length > 20) || /(\p{L})\1{3}|\.\S/u.test(name))
      return "That doesn't look like a name. Please check it.";
    return "";
  }
  const MAX_MESSAGE = 60; // about two lines on a phone; api/wishes.js has the same limit
  const REFRESH_MS = 60000;
  const PAGE_SIZE = 10; // api/wishes.js sends the same number
  const LOCAL_KEY = "wedding-wishes-demo";

  /* Newest first. Wishes sent in the same instant are ordered by id. */
  function isOlder(a, b) {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at;
    return Number(a.id) < Number(b.id);
  }

  /* ---------- Storage back ends ---------- */

  function apiStore(base) {
    const endpoint = base.replace(/\/+$/, "") + "/wishes";

    async function request(options, query) {
      const res = await fetch(endpoint + (query ? "?" + query : ""), {
        ...options,
        // Older phones and in-app browsers lack this timeout helper.
        signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
      });
      if (!res.ok) throw new Error("Guest book request failed: " + res.status);
      return res.json();
    }

    return {
      // With a wish, the page after it; without, the newest page.
      list: (after) =>
        request(
          undefined,
          after && new URLSearchParams({ before: after.created_at, id: String(after.id) })
        ),
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
      list: async (after) => {
        const older = read().filter((wish) => !after || isOlder(wish, after));
        return { wishes: older.slice(0, PAGE_SIZE), more: older.length > PAGE_SIZE };
      },
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

  function init(config) {
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
    let more = false; // whether older wishes are still to be fetched
    let hasLoaded = false;
    let loading = false;
    let loadingMore = false;
    let moreFailed = false;
    let sending = false;

    // Fetches the next page as the end of the list scrolls near.
    const nearEnd =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) loadMore();
            },
            { root: listEl, rootMargin: "0px 0px 160px 0px" }
          )
        : null;


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
      nearEnd?.disconnect();
      if (!wishes.length) return placeholder("Be the first to leave a wish 💚");

      const cards = wishes.map((wish) => {
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
      });

      if (more) cards.push(moreRow());
      listEl.replaceChildren(...cards);
    }

    /* The last row while older wishes remain: it loads them when scrolled to,
       or offers a button if that failed or the browser can't watch scrolling. */
    function moreRow() {
      const row = document.createElement("p");
      row.className = "wishes__more";
      if (moreFailed || !nearEnd) {
        if (moreFailed) row.append("Older wishes could not be loaded. ");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "link-btn";
        button.textContent = moreFailed ? "Try again" : "Show older wishes";
        button.addEventListener("click", () => {
          moreFailed = false;
          loadMore();
        });
        row.append(button);
      } else {
        row.textContent = "Loading more wishes…";
        nearEnd.observe(row);
      }
      return row;
    }

    async function loadMore() {
      if (!more || loadingMore || !wishes.length) return;
      loadingMore = true;
      try {
        const page = await store.list(wishes[wishes.length - 1]);
        const shown = new Set(wishes.map((wish) => String(wish.id)));
        wishes = wishes.concat(page.wishes.filter((wish) => !shown.has(String(wish.id))));
        more = page.more;
      } catch (err) {
        console.error(err);
        moreFailed = true;
      } finally {
        loadingMore = false;
        render();
      }
    }

    async function load(showProgress) {
      if (loading) return;
      loading = true;
      if (showProgress) placeholder("Loading wishes…");
      try {
        const page = await store.list();
        if (!hasLoaded || !page.more) {
          wishes = page.wishes;
          more = page.more;
        } else {
          // A refresh replaces the newest page and keeps the older wishes
          // already scrolled to, so the list doesn't jump back.
          const oldest = page.wishes[page.wishes.length - 1];
          const kept = wishes.filter((wish) => isOlder(wish, oldest));
          wishes = page.wishes.concat(kept);
          if (!kept.length) more = true;
        }
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

    // A wish is one short passage, so line breaks become spaces, including pasted ones.
    messageEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
    messageEl.addEventListener("input", () => {
      if (/[\r\n]/.test(messageEl.value)) {
        messageEl.value = messageEl.value.replace(/\s*[\r\n]+\s*/g, " ").slice(0, MAX_MESSAGE);
      }
      count.textContent = `${messageEl.value.length} / ${MAX_MESSAGE}`;
    });

    // "change" as well: some phones send only that for autofill.
    ["input", "change"].forEach((type) =>
      form.addEventListener(type, () => {
        setStatus("");
        nameEl.removeAttribute("aria-invalid");
        refreshSubmit();
      })
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      refreshSubmit();
      if (submit.disabled) return;

      const name = nameEl.value.trim().replace(/\s+/g, " ");
      const problem = nameProblem(name);
      if (problem) {
        nameEl.setAttribute("aria-invalid", "true");
        nameEl.focus();
        return setStatus(problem, true);
      }
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
