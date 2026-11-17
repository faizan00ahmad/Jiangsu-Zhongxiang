# Cart and payment: how to test it

Everything below runs in **sandbox**: no real money moves and nothing is sent to a bank. Each method has one small adapter in `src/lib/server/gateways.ts`; when the client has merchant accounts, a live adapter with the same shape replaces the sandbox one and the pages, orders and admin screens stay as they are.

## The customer flow

1. **Add to cart** from a model page, a model card or a quotation. The header cart shows the count.
2. **/cart**: quantities (5 per build, 10 per cart), remove, delivery estimate. Prices and factory stock are worked out again by the server each time.
3. **/checkout**: details (name, mobile, city), then payment: advance or full amount, method, terms, **Pay**. One order is created per bike and one payment attempt covers all of them.
4. **/pay/…**: the payment page for the chosen method (below), then a result page and a printable receipt (**/receipt/…**).
5. An unpaid order can be paid later from its page (**Complete payment**) while the reservation lasts. A failed attempt keeps the bikes reserved and offers another method.

## Test values

| Method | What to enter | Result |
|---|---|---|
| Card | `4242 4242 4242 4242` (Visa), `5555 5555 5555 4444` (Mastercard), `2205 0000 0000 0009` (PayPak); any future expiry; any 3-digit CVV; any name | Goes on to 3-D Secure |
| Card | `4000 0000 0000 0002` | Declined |
| Card | `4000 0000 0000 9995` | Insufficient funds |
| Card | any other number | Refused: "test payment page", so a real card number is never accepted by the sandbox |
| 3-D Secure / wallet approval | `123456` | Paid. Three wrong codes end the attempt |
| JazzCash / Easypaisa | `0300 1234567` (any other mobile number) | Asks for approval on the phone (2-minute window) |
| JazzCash / Easypaisa | a number ending `0000` | Not enough balance |
| JazzCash / Easypaisa | a number ending `9999` | Wallet not active |
| Bank transfer / Raast | any photo, screenshot or PDF up to 5 MB | Waits for staff in **Admin > Payments** |

## Demo helper buttons

While every gateway is in sandbox mode, each payment page shows a **Demo helpers** box so nobody has to type test values:

* **Card**: Visa, Mastercard and PayPak (work), a declined card and a no-funds card fill the form with one tap.
* **JazzCash / Easypaisa**: a demo number that works, an empty wallet and an inactive wallet.
* **Approval / 3-D Secure**: fills the code (123456).
* **Bank transfer**: attaches a generated demo receipt, no file needed.

The box disappears as soon as any gateway is switched to Live.

## What happens after

* **Card and wallets**: confirmed by the gateway. Every order of the checkout moves into the factory queue at once, the payment is marked verified, and the customer gets an SMS and email (`payment.received`).
* **Bank transfer**: the attempt goes to **review**. Staff open the receipt in **Admin > Payments** and **Approve** (orders move on, customer told) or **Reject** with a reason (customer told why and can pay again). While a transfer is in review the orders do not expire.
* **Advance or full**: the customer chooses. The balance at pickup is the price less what was paid online.

## What is never stored

Card numbers and CVV are used for one request and dropped. Only the brand and last four digits are kept, on the attempt and on the order. The test suite searches the data file and the message log to prove it. Bank receipts are kept in `admin pannel/data/uploads/receipts`, outside the public folder, and only the customer who sent one and staff with the Payments permission can open it.

## Admin switches (Admin > Integrations)

* JazzCash, Easypaisa and Card each have an on/off switch and a mode. **Live** is not available yet (no live connector is installed), so a method set to Live is hidden at checkout rather than failing at the last step.
* Bank transfer has its own switch and the company account details customers see: account title, bank, account number, IBAN, Raast ID and the instructions in English and Urdu. The values in a fresh install are placeholders.

## Running the checks

`npm run qa` runs every suite. `admin pannel/tests/payments.mjs` covers the cart, checkout, every method (success and each failure), the bank review, private receipts, switches and permissions.

Not covered by the automated tests: the 2-minute wallet approval timeout (it needs a wait of two minutes), and anything that needs a real merchant account.
