# Wedding Invitation

A simple HTML, CSS and JavaScript invitation with an opening envelope, 3D photo gallery, countdown, RSVP form, guest book and gift QR code. There is nothing to install or build.

## 1. Add your details

Open `js/config.js` and replace the sample text. Names, dates, venues, schedule, photos and gift details all live in that one file.

To preview it, double-click `index.html`.

**Time zone:** set `utcOffset` to the wedding venue's time zone so the countdown is correct for every guest.

**Photos:** copy your pictures into `assets/photos`, then list them in `coverPhoto`, `heroPhoto` and `album` in the config file, for example `"assets/photos/our-photo.jpg"`. Keep each photo under about 500 KB so the page loads quickly on phones.

**Link preview:** the text shown when the link is shared on WhatsApp or Facebook is near the top of `index.html`. Change it by hand. To add a preview picture once the site is live, put this line beside the others, using your own site's full address:

```html
<meta property="og:image" content="https://your-site.netlify.app/assets/photos/our-photo.jpg" />
```

## 2. Connect the guest book and RSVP (free)

Until you do this, wishes are saved only in the browser they were written in, the page shows a "Demo mode" note, and the RSVP button stays hidden.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in everything from `supabase-setup.sql`, and press **Run**.
3. Open the project's API settings and copy the **Project URL** and the **publishable** key (older projects call it the **anon** key).
4. Paste both into `supabaseUrl` and `supabaseKey` at the bottom of `js/config.js`.

The publishable key is designed to be public, and the database rules limit guests to reading visible wishes and adding new ones. **Never use the `secret` or `service_role` key here.**

**Seeing who is coming:** open **Table Editor** and choose `rsvps`. Only you can read this table; guests can send a response but can't see anyone's.

**Added to an existing project?** Run `supabase-setup.sql` again. It is safe to repeat and keeps your existing wishes and responses.

**Removing a wish:** open **Table Editor**, choose `wishes`, and set `hidden` to `true` on that row. It disappears from the page within a minute. Deleting the row also works.

**Before you send the invitation out:** free Supabase projects can pause after about a week without activity. If the guest book says it could not be loaded, open your project in Supabase and restore it. Open the invitation yourself every few days until the wedding is over.

## 3. Publish

**Netlify, the easiest option**

1. Sign in at [netlify.com](https://www.netlify.com).
2. Go to **Add new project**, then **Deploy manually**.
3. Drag this whole folder onto the page.

To update the site later, drag the folder in again.

**GitHub Pages**

1. Create a repository on GitHub and upload these files.
2. Go to **Settings**, then **Pages**, and choose **Deploy from a branch**.
3. Pick `main` and `/ (root)`, then save.

Everything you upload to a public repository can be read by anyone, including anything in `js/config.js`.

## 4. Send personal links

Add a guest's name to the end of your link. The envelope then says "Dear Pawan Gurung", and the name is already filled in on the guest book and RSVP forms. Write `%20` for each space, because WhatsApp and other apps cut a link off at a real space:

```
https://your-site.netlify.app/?name=Pawan%20Gurung
```

## Good to know

- **Removing the gift section:** set `gift: null` in the config file.
- **QR code:** anyone with the link can see and save the QR code in the gift section.
- **Music:** only use a track you have the right to share. Browsers start sound only after a tap, so it begins when the guest opens the envelope. Change how loud it gets with `musicVolume` in `js/config.js`.
- **Auto-scroll:** the page starts scrolling slowly about 4.5 seconds after the invitation opens, while the music plays. It pauses when a guest scrolls, taps or types and carries on after 4 seconds of stillness, and it stops while the music is muted. Change the speed with `autoScrollSpeed` in `js/config.js`, or use `0` to turn it off.
- **Artwork:** `floral-corner.webp`, `floral-spray.webp`, `seal.webp`, `paper-texture.webp` and `pavilion.svg` in `assets/art` were created for this project. Anything else you add there needs to be yours to use.
# wedding-invitation-anmol-rojina
