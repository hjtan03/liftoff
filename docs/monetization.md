# Tips and ads

Both are off until configured. They are set by environment variables in
Vercel (Project → Settings → Environment Variables, for Production), read
at build time, so each change needs a redeploy. `src/monetization.ts`
reads and checks them; a value that doesn't look right leaves the feature
off.

## Tips

1. Make a page on Ko-fi or Buy Me a Coffee.
2. Set `VITE_TIP_URL` to its https address and redeploy.

A "Tip the crew ☕" link then appears at the foot of the flight report and
the archive, next to the privacy link. Payment happens on that site.

## Ads (AdSense)

Ads only ever appear below the flight report and the archive, never during
a stage.

1. Apply at adsense.google.com with `dailyliftoff.app`. The privacy policy
   is at `/privacy.html` (`public/privacy.html`); before ads go live,
   replace its "Liftoff does not show ads today" paragraph with a plain
   statement that it does.
2. In AdSense, open Privacy & messaging and create the European regulations
   message. Google requires a certified consent tool to serve personalized
   ads in the EEA, UK and Switzerland, and this one is free and loads with
   the ad script.
3. Once approved, put the line AdSense gives you in `public/ads.txt`.
4. Create two display ad units (responsive), one for the report and one for
   the archive, and set:
   - `VITE_ADSENSE_CLIENT` = `ca-pub-…`
   - `VITE_ADSENSE_SLOT_REPORT` = the report unit's id
   - `VITE_ADSENSE_SLOT_ARCHIVE` = the archive unit's id
5. Redeploy. Each placement shows only when the client and its own unit are
   both set, so one can be turned on without the other.
