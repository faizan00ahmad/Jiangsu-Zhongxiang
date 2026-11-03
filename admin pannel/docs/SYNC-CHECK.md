# Sync check: change in the admin, effect on the site

Each row was changed through the admin API and checked on the public site (or the customer's own pages), then reverted. All rows passed in `tests/features.mjs` and `tests/demo-logins.mjs`.

| Admin change | Where it must show | Result |
|---|---|---|
| Create / disable / expire a home banner | Home hero | Pass |
| Create a page, then unpublish, republish, delete | `/p/<slug>`, sitemap | Pass (404 when off, back when on) |
| Reserved or duplicate page slug | Refused | Pass |
| Add / remove a footer link | Footer on every page | Pass |
| Unsafe link (`javascript:`) | Refused | Pass |
| Contact email, phone, address, hours, map | `/contact`, footer | Pass |
| Social profile links | `/contact`, footer; bad link dropped | Pass |
| WhatsApp number | Floating WhatsApp button | Pass |
| Meta Pixel ID | Pixel script on the site | Pass |
| Maintenance mode | Visitors see a notice, staff still see the site | Pass |
| Solar tier price and extra range | New quote total, range, quote lines | Pass |
| Hide solar on a model | Option ignored for that model | Pass |
| Store assigned by staff | Order record, dealer visibility, customer message | Pass |
| Stage change | Customer message queued | Pass |
| Test drive confirm / cancel | Slot capacity, customer message | Pass |
| Store test drive hours | Slots offered on the site | Pass |
| Partner status → Approved | Applicant message | Pass |
| Chat reply | Visitor's chat window, unread count | Pass |
| Custom role | Menu and page access, API 403 | Pass |
| Integration secret | Encrypted in the data file, masked in the admin | Pass |
| Coupon created, disabled, expired, model-limited, usage-limited | Checkout discount, order total and deposit, use count returned on cancel | Pass |
| Currency enabled / disabled | Header switcher options | Pass |
| Review approved / rejected | Model page and average | Pass |
| Zone charge changed or zone disabled | Checkout estimate, order record | Pass |
| JazzCash / Easypaisa switched off | Order pay panel; payment refused server-side | Pass |
| Related model picked | Similar models on the model page | Pass |
| 360° turntable set uploaded, cleared, or given an unsafe link | Model page viewer frames and smooth/steps mode | Pass |
| Backup / restore | File written, download, traversal refused | Pass (restore of a real file not run, to protect the demo data) |

Still not built: social login (needs the client's Google and Facebook app keys), brand page and category featured banner on the site.
