# Demo logins

These accounts exist in the demo data so every role can be tried. They appear as one-tap buttons on the sign-in pages.
**Before the real launch:** set `NEXT_PUBLIC_DEMO_LOGINS=off` (hides the buttons) and change or disable these accounts in Admin > Admins and Customers.

## Admin panel: `/admin/login`

| Role | Username | Password | What it can do |
|---|---|---|---|
| Super admin | `admin` | `Admin@2026` | Everything, including roles, integrations, backups, audit log |
| Operations | `operator` | `Operator@2026` | Day-to-day: catalogue, orders, logistics, customers, content. Not roles, settings, integrations, backups |
| Content editor | `content.editor` | `Content@2026` | Banners, pages, navigation, blog, brands, categories, templates, SEO, health check |
| Customer support | `support.agent` | `Support@2026` | Enquiries, reviews, live chat, test drives, partner applications; read-only orders and customers |
| Dealer: Gulberg, Lahore | `dealer.lahore` | `Dealer@2026` | Only this store's orders, stock and test drives; last two delivery steps |
| Dealer: Shahrah-e-Faisal, Karachi | `dealer.karachi` | `Dealer@2026` | Same, for the Karachi store |

## Customer site: `/login`

| Customer | Phone | Password | Notes |
|---|---|---|---|
| Ahmed Raza (Lahore) | `03001234567` | `Demo@2026` | Returning customer with orders at several steps |
| Sara Khan (Karachi) | `03111234567` | `Demo@2026` | New customer, no orders: try the whole ordering flow |
| Bilal Hussain (Islamabad) | `03211234567` | `Demo@2026` | New customer: try test drive booking and the pickup-store choice |

Accounts are added only when missing, so editing or disabling one in the admin is never undone by a restart.
