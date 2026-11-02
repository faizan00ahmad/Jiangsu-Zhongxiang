# QA report

Run: `npm run qa` (needs the site running). Last run: 387 checks, all passing.

| Suite | Checks | What it proves |
|---|---|---|
| `foundation.mjs` | 56 | Database upgraded to v3 inside `admin pannel/data`, backup written, every admin screen opens |
| `demo-logins.mjs` | 74 | All 6 admin and 3 customer demo logins sign in; each role reaches only its screens; dealers see only their own store; wrong passwords refused |
| `features.mjs` | 160 | Solar add-on, pickup store flow, test drive booking, contact and social, partner portal, enquiry, CMS pages, blog, sitemap, robots, banners, maintenance, chat, roles, backups, exports, encryption, coupons and currency rules |
| `commerce.mjs` | 97 | Coupons (every rule, usage returned on cancel), currency switcher, reviews and moderation, wishlist, shipping estimate, payment methods, model views, similar models, sorting |
| `qa.mjs` (earlier work) | 1,100+ | Every bike's quote prices, orders, deposits and cancellation (run before this phase) |

Also: `tsc --noEmit` clean, ESLint 0 errors.

## Defects found and fixed during this phase

1. **Dashboard crashed (500) for every role**: a function was passed from a server page to a client chart. Fixed by passing a plain prefix.
2. **Dealer role could read and reply to every customer's chat**: removed the permission, stripped it from existing data, and enforced "no chat for store-scoped roles" in the API and the page.
3. **Customers without an email got no test drive message**: only an email template existed. SMS versions added for test drive, partner and enquiry events.
4. **Tests were not rerunnable** (leftover users, slots, rate-limit memory): tests now use unique names, free the slots they take and use random source addresses. `tests/cleanup.mjs` removes test records (run with the server stopped).
5. **Charging time showed the range figure** (e.g. "90 h") in the factory import: fixed earlier, repaired in stored data.

## Not yet verified

- Every admin screen at phone width and in both languages was not walked through by eye; the dashboard, login, test drive page and several others were.
- Urdu layout of the new pages (pickup panel, test drive, partner, contact, enquiry) was not reviewed visually.
- Restoring a backup was not run against the live demo data.
- Accessibility pass (keyboard order, focus) on the new dialogs is not done beyond the built-in dialog handling.
