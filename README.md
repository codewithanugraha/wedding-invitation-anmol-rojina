# Wedding Invitation

A simple HTML, CSS and JavaScript invitation with an opening envelope, 3D photo gallery, countdown, RSVP form, guest book and gift QR code. There is nothing to install or build.

## 1. Add your details

Open `js/config.js` and replace the sample text. Names, dates, venues, schedule, photos and gift details all live in that one file.

To preview it, double-click `index.html`.

**Time zone:** set `utcOffset` to the wedding venue's time zone so the countdown is correct for every guest.

**Photos:** copy your pictures into `assets/photos`, then list them in `coverPhoto`, `heroPhoto` and `album` in the config file, for example `"assets/photos/our-photo.jpg"`. Keep each photo under about 500 KB so the page loads quickly on phones.

**Link preview:** the text shown when the link is shared on WhatsApp or Facebook is near the top of `index.html`. Change it by hand. To add a preview picture once the site is live, put this line beside the others, using your own site's full address:

```html
<meta property="og:image" content="https://your-site.vercel.app/assets/photos/our-photo.jpg" />
```

## 2. Connect the guest book and RSVP (free)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in everything from `supabase-setup.sql`, and press **Run**.
3. Open the project's API settings and copy the **Project URL** and the **publishable** key (older projects call it the **anon** key).
4. Add both to Vercel under **Project**, **Settings**, **Environment Variables**, named `SUPABASE_URL` and `SUPABASE_KEY`, then redeploy.

The forms talk to the server functions in `api/`, so the key never reaches a guest's browser. **Never use the `secret` or `service_role` key.**

**Seeing who is coming:** open **Table Editor** and choose `rsvps`. Only you can read this table; guests can send a response but can't see anyone's.

**Added to an existing project?** Run `supabase-setup.sql` again. It is safe to repeat and keeps your existing wishes and responses.

**Removing a wish:** open **Table Editor**, choose `wishes`, and set `hidden` to `true` on that row. It disappears from the page within a minute. Deleting the row also works.

**Before you send the invitation out:** free Supabase projects can pause after about a week without activity. If the guest book says it could not be loaded, open your project in Supabase and restore it. Open the invitation yourself every few days until the wedding is over.

## 3. Publish

1. Sign in at [vercel.com](https://vercel.com) and import this repository. No build settings are needed.
2. Add the two environment variables from step 2.
3. Each push to `main` then publishes the site.

To test the forms on your computer, put the same values in `.env` and run `npx vercel dev`. A plain file server has no `api/` functions, so the forms show an error there.

## 4. Send personal links

Add a guest's name to the end of your link. The envelope then says "Dear Pawan Gurung", and the name is already filled in on the guest book and RSVP forms. Write `%20` for each space, because WhatsApp and other apps cut a link off at a real space:

```
https://your-site.vercel.app/?name=Pawan%20Gurung
```

## Good to know

- **Removing the gift section:** set `gift: null` in the config file.
- **QR code:** anyone with the link can see and save the QR code in the gift section.
- **Music:** only use a track you have the right to share. Browsers start sound only after a tap, so it begins when the guest opens the envelope. Change how loud it gets with `musicVolume` in `js/config.js`.
- **Auto-scroll:** the page starts scrolling slowly about 4.5 seconds after the invitation opens, while the music plays. It pauses when a guest scrolls, taps or types and carries on after 4 seconds of stillness, and it stops while the music is muted. Change the speed with `autoScrollSpeed` in `js/config.js`, or use `0` to turn it off.
- **Artwork:** the images in `assets/art` come from the licensed template, so keep your use within that licence.
# wedding-invitation-anmol-rojina
