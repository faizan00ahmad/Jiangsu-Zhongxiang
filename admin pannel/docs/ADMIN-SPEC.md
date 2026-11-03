# Admin panel: what is built, against the proposal

Source: *Financial Proposal for Enterprise EV Customization & Cross-Border Supply Chain Platform* (EduSoft → Evolta Bikes), Enterprise column, plus the six features added later.
Status: **Done** = built and tested. **Admin only** = the admin screen works and saves, but the customer site does not use it yet. **Not built** = nothing yet.

## Folder layout

```
admin pannel/
  data/       db.json (the live data), uploads/, outbox/ (every sandbox email/SMS, one file per day)
  backups/    daily-*.json (automatic, 14 days), manual-*, migration-*, restore-*
  exports/    reserved for generated exports
  docs/       this file, DEMO-LOGINS.md, QA-REPORT.md, SYNC-CHECK.md
  tests/      node scripts, run with `npm run qa`
```

## Foundation

| Item | Status |
|---|---|
| Data store moved into `admin pannel/data`; old `data/db.json` carried over | Done |
| Non-destructive upgrade v2 → v3 with a backup first; idempotent top-up on every start | Done |
| Roles and permissions: module × view/create/edit/delete/export, custom roles, dealer scope | Done |
| Audit log of every change; viewer with filters; Excel/CSV export | Done |
| Backups: create, download, restore (current data saved first) | Done |
| Encrypted storage of integration keys, shown masked | Done |
| Sandbox notifications: event → template → outbox (email / SMS) | Done |
| App cache with tags, cleared on every save, manual clear | Done |
| Admin UI kit: sortable/filterable/paged table with column chooser, bulk actions, Excel + CSV export, dialogs, EN/UR fields, image upload, Markdown editor | Done |
| Chinese / English admin, Ctrl+K jump box, alert bell, profile and password change | Done |

## Proposal features

| Proposal item | Admin | Customer site |
|---|---|---|
| Admin panel: users, data, profiles | Done (customers with order/quote/wishlist history; admins; roles) | n/a |
| Editable home banner (HD carousel) | Done: schedule, per-language text, wide photo or model | Done: the hero reads these banners |
| Page management system | Done | Done: `/p/<slug>` |
| Return / Privacy / T&C | Done | Done: `/returns` `/privacy` `/terms` |
| Manage navigation | Done (header and footer) | Done |
| Blog | Done (draft/published/scheduled, SEO) | Done: `/blog` |
| Category creation (unlimited) | Done | Done: home series tabs |
| Manage product-brand / Brand page | Done (brands, brand assignment per model) | Admin only |
| Vehicle customisation engine, real-time PKR quote | Existing, plus the **solar panel** option | Done |
| 360° view of each bike | Done: Models screen takes a full turntable set (upload one lap of photos, reorder, clear) | Done for the 10 live models: drag, swipe, arrow keys or auto-turn on the model page. Built from the factory's real 3 to 5 angle photos (left/right mirrored), stepping between angles. A full set of 12+ photos turns smoothly. Not yet on the 18 unlisted models |
| Payment gateways (2) with prepayment locking | Settings and sandbox mode done | Done: the pay panel offers JazzCash / Easypaisa only while their switch is on (refused server-side too); still sandbox until real accounts |
| Coupon code | Done (percent/fixed, limits, models, dates) | Done: field at checkout, re-checked when the order is placed, deposit worked out on the discounted total, use returned on cancel or expiry |
| Multiple currency | Done (rates, enable, PKR protected) | Done: header switcher shows an approximate figure beside PKR on cards, configurator, checkout and orders. Charging and quotations stay in PKR |
| Shipping calculator / zone routing | Zones done | Done: checkout shows the delivery estimate and extra days for the chosen city; stored on the order; not part of the price or advance |
| 8-node logistics tracking | Done (board, stage changes notify the customer) | Done |
| Customer order update | Done (email/SMS templates per event) | Done (sandbox until real accounts) |
| Export orders to Excel | Done (real .xlsx, CSV) | n/a |
| Estimated invoice download/print | Done: printable invoice per order | Done (quote page) |
| Customer profile with historical quotes | Done | Done |
| Wishlist | Customer wishlist visible in admin | Done: heart on model cards, the model page and similar models; saved list on My Account |
| Product rating / reviews | Done (moderation) | Done: stars and form on the model page, held for approval, one per customer per model, average from approved reviews |
| Similar products, category featured banner | Admin fields done | Similar products done (picked models first, then same type). Category featured banner not built |
| Advanced filtration, multiple sorting, compare | Compare exists | Sorting (price, range, speed), name search and wheel filter done |
| Live chat | Done (inbox, reply, close) | Done (widget) |
| Dealership locator / individual store page | Done (hours, map, photo) | Done: `/dealers/<id>` |
| Enquiry page (multiple) | Done (4 forms, status, assignee) | Done: `/enquiry` |
| Auto email / order notifications | Done (templates, outbox) | Sandbox until SMTP/SMS connected |
| Social login (Google/Facebook) | Keys and switches done | Not built |
| SMS & Meta integration | Done (keys, Pixel, WhatsApp button) | Pixel and WhatsApp work |
| SEO, sitemap, webmaster tools | Done (default SEO, per-page SEO, sitemap.xml, robots.txt, verification tags, GA) | Done |
| W3C validation, PageSpeed | Site health check (HTML/SEO basics) and links to the official tools | n/a |
| Cache management | Done | n/a |
| Webmail | Outbox (sandbox mailbox) | n/a |
| Product views | Counter stored; shown on dashboard | Counts blog views and model page visits (once per tab session) |

## The six extra features

| Feature | Admin | Customer site |
|---|---|---|
| 1. Pickup store chosen after ordering | Assign/change on the order; alert for orders with no store | Done: checkout asks for the city only; the order page lists every open store with stock status; locked once the vehicle is on its last leg |
| 2. Test drive booking | Done: bookings table, confirm/complete/no-show/cancel/reschedule, store hours and capacity, export; dealers see only their store | Done: `/test-drive` with live free slots |
| 3. Direct contact hub | Done (Settings > Company) | Done: `/contact`, footer |
| 4. Social deep links | Done (Settings > Social) | Done: footer, contact page; phones try the native app first |
| 5. Agent / distributor portal | Done: pipeline New → Reviewing → Approved/Rejected, notes, assignee, export | Done: `/partner` |
| 6. Solar panel add-on | Done: tiers, prices, extra range, per-model hide | Done: configurator, quote, order, invoice |

## Known limits

- Real payments, email, SMS, WhatsApp and Google/Facebook sign-in need the client's accounts. Until then they run in sandbox mode.
- The file store suits one server (Alibaba Cloud ECS). It is not for several servers behind a load balancer.
- Data on Vercel is temporary; use the Alibaba Cloud server for real data.
