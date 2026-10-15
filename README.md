# Zhongxiang EV Pakistan — 巴基斯坦电动车在线选配与跨境销售平台

Online EV configurator, ordering, dual inventory and cross-border tracking for Pakistani customers, plus a back office for the Jiangsu Zhongxiang team. Built from `网站要求，website requirements.pdf`, with the same stack and motion language as the Edusoft site (Next.js 16, React 19, Tailwind 4, Framer Motion, GSAP, Lenis).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000   ·   admin: http://localhost:3000/admin
npm run build && npm start   # production
```

Data lives in `data/db.json` (created and seeded on first run; delete it to reset). Uploaded model photos go to `data/uploads/`.

### Demo logins (seed data — change or remove before going live)

| Where | Login | Password | Role |
|---|---|---|---|
| Customer site `/login` | `03001234567` | `Demo@2026` | Customer with sample orders at different stages |
| Admin `/admin/login` | `admin` | `Admin@2026` | 超级管理员 Super admin |
| Admin | `operator` | `Operator@2026` | 国内运营 Domestic operator |
| Admin | `dealer.lahore` | `Dealer@2026` | 巴基斯坦车行 Dealership (Gulberg, Lahore only) |

## Languages

- **Customer site: English ⇄ اردو (Urdu)** — per the PDF ("全程英文/乌尔都语展示 … 零中文残留"). One-click switch top-right, remembered in a cookie; Urdu renders right-to-left in Nastaliq. Every prompt, error, empty state and toast exists in both languages (`src/i18n/site.ts`).
- **Admin back office: 中文 ⇄ English** — Chinese by default for domestic staff (`src/i18n/admin.ts`). Customer-facing content (model taglines, option names, dealer names, home copy) is edited bilingually (EN + UR) in the admin.

## Requirement → where it is

| PDF requirement | Implementation |
|---|---|
| Tesla-style home, full-screen carousel, no ads/pop-ups | `/` — `components/home/HomeHero.tsx` (auto-advancing model slides, drive-in animation) |
| 10 export model covers, click to configure | Home model grid + `/customize` (2-Wheel / 3-Wheel filter, specs, base price) |
| 4 fixed core entries | Bar under the hero + navbar: Vehicle Customize, Inventory Query, My Orders, Logistics Tracking |
| Language switch top-right, remembered | `components/LangSwitch.tsx` (cookie `zx_lang`) |
| Configurator: model, colour (live repaint), wheels, GPS, battery S/M/L, LCD/LED/Analog, cruise, reverse, side-stand cut-off, Bluetooth speaker | `/customize/[slug]` — `components/customize/Configurator.tsx`; vehicle renders in `components/vehicle/Vehicle.tsx` |
| Live price on every click, reset, save setup | Same page — sticky price bar; saves to the account (or this device for guests) |
| Bilingual configuration list, PKR, base + add-ons = total | `/quote/[id]` — English and Urdu on every line |
| Quote preview, local save, screenshot share | Save as image (PNG), Print / PDF, Share (Web Share API, link fallback) |
| Quote history, modify, order again | `/account` |
| Dual inventory: China factory (In / Low / Out Of Stock) + Pakistan dealers by city/region | `/inventory` |
| Prepayment locks order & capacity; contact, phone, city/dealer pickup | `/checkout/[quoteId]` → `/orders/[id]` (deposit panel). Ordering reserves a factory unit; unpaid orders expire after the lock window and release it |
| 8 cross-border nodes, current node, transit time, ETA | `components/orders/Timeline.tsx` on the order page and the public `/tracking` lookup (order no. + mobile) |
| Admin: models & config (add/edit, images, base price, option prices, on/off) | `/admin/models`, `/admin/options` |
| Admin: dual inventory + low-stock alerts | `/admin/inventory`, dashboard alerts |
| Admin: orders (verify deposit, manual status sync, export, filter) | `/admin/orders`, `/admin/orders/[id]`, CSV export (Excel-ready UTF-8) |
| Admin: logistics (tracking no., node updates, synced to site) | `/admin/logistics` board + order page |
| Admin: users, tiered permissions | `/admin/users`, `/admin/admins` (super / operator / dealer) |
| Admin: statistics (sales, popular configs, order summary) | `/admin` dashboard |
| Admin: custom deposit %, order lock, anti-malicious-hold | `/admin/settings` (deposit %, lock hours, max unpaid orders per customer, low-stock threshold) |

## Product catalogue (from zxjtmco.com)

All 28 ZXTec products, their factory spec tables and 216 photos were captured from https://www.zxjtmco.com into:

- `src/data/zx-catalog.json` — names, series, specs, photo paths (source of the seed data)
- `public/products/<model>/` — `thumb` (white cut-out), `color-N` (studio photo per paint), `gallery-N`, `banner`

The seed lists the **10-model Pakistan line-up** from the requirement (5 scooters + 3 motorcycles = 2-wheel commuter/sport, ZX-X-COOL = 3-wheel passenger, ZX-JL = 3-wheel cargo). The other 18 (EEC scooters, light scooters, e-bicycles) are imported but unlisted — switch them on in 车型管理. Models with factory colour photos show the real photo of each paint in the configurator; models without them use the live-repainting render plus a real photo inset.

Still to confirm with the factory:
- **Prices** are placeholders derived from motor power — set real PKR prices in the admin.
- **R-XFX, LB-R6, ZX-X-COOL, ZX-JL** have no published spec table; typical figures are used and flagged on the site and in the admin.
- **Image rights** — the photos belong to the manufacturer; confirm you're authorised to use them before launch.

To refresh the catalogue later, re-run the extractor (kept outside the project) or edit models directly in the admin.

## Before going live

1. **Photos** — the factory catalogue photos are in place; any model can be given a different main photo in 车型管理 → 展示图.
2. **Payment gateway** — `src/app/api/orders/[id]/pay/route.ts` is a sandbox stand-in (clearly labelled on the page). Plug in the JazzCash / Easypaisa / bank merchant API there once merchant accounts exist.
3. **Model names, prices, stock, dealers** — the seed values are placeholders; edit them in the admin.
4. **Change every demo password** and set `SESSION_SECRET` (a long random string).

## Deploying on Alibaba Cloud (阿里云国际版)

Runs as a standard Node.js app (Node 20.9+) on an ECS instance:

```bash
npm ci && npm run build
SESSION_SECRET=<long-random> DATA_DIR=/var/lib/zx-ev PORT=3000 npm start
```

Put Nginx (or SLB) in front for HTTPS, keep `DATA_DIR` on a persistent disk and back it up. The JSON store in `src/lib/server/db.ts` is built for a single instance; when you need several instances, swap that one module for ApsaraDB (MySQL/PostgreSQL) — everything else talks to it through `getDb()` / `mutate()`.
