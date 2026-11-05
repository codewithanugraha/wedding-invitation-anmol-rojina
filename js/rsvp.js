/* RSVP form. Responses go through the site's server function to the "rsvps"
   table. Guests can send a response but cannot read anyone else's: only you can,
   in the Supabase Table Editor. Without databaseApi the button stays hidden. */
window.Rsvp = (function () {
  function init(config, guestName) {
    if (!config.databaseApi) return;

    const endpoint = config.databaseApi.replace(/\/+$/, "") + "/rsvp";
    const dialog = document.getElementById("rsvp-dialog");
    const form = document.getElementById("rsvp-form");
    const nameEl = document.getElementById("rsvp-name");
    const trap = document.getElementById("rsvp-website");
    const status = document.getElementById("rsvp-status");
    const submit = document.getElementById("rsvp-submit");
    const done = document.getElementById("rsvp-done");
    const doneText = document.getElementById("rsvp-done-text");

    let sending = false;

    document.getElementById("rsvp-cta").hidden = false;
    if (guestName) nameEl.value = guestName;

    function setStatus(text, isError) {
      status.textContent = text;
      status.classList.toggle("is-error", Boolean(isError));
    }

    /* Confirm stays off until there is a name and a choice. */
    function refreshSubmit() {
      submit.disabled = sending || !nameEl.value.trim() || !form.elements.attending.value;
    }

    function showThanks(attending) {
      doneText.textContent = attending
        ? "Thank you! We look forward to celebrating with you."
        : "Thank you for letting us know. You will be missed.";
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }

    // "change" as well: some phones send only that for radio buttons and autofill.
    ["input", "change"].forEach((type) =>
      form.addEventListener(type, () => {
        setStatus("");
        refreshSubmit();
      })
    );

    document.getElementById("rsvp-open").addEventListener("click", () => {
      // Opening again after a response starts a fresh form.
      if (!done.hidden) {
        form.elements.attending.forEach((option) => (option.checked = false));
        done.hidden = true;
        form.hidden = false;
      }
      setStatus("");
      refreshSubmit();
      dialog.showModal();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      refreshSubmit();
      if (submit.disabled) return;

      const name = nameEl.value.trim().slice(0, 60);
      const attending = form.elements.attending.value === "yes";

      // A filled trap field means a bot: look successful and save nothing.
      if (trap.value) return showThanks(attending);

      sending = true;
      refreshSubmit();
      setStatus("Sending…");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, attending }),
          // Older phones and in-app browsers lack this timeout helper.
          signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
        });
        if (!res.ok) throw new Error("RSVP request failed: " + res.status);
        setStatus("");
        showThanks(attending);
      } catch (err) {
        console.error(err);
        setStatus("Your response could not be sent. Please try again.", true);
      } finally {
        sending = false;
        refreshSubmit();
      }
    });
  }

  return { init };
})();
