# Shop Inventory & Business Management App

## Product Requirements Document (PRD) --- v1.0

**Prepared:** 21 November 2026\
**Status:** Discovery / Ready for scope confirmation\
**Working name:** ShopStock\
**Target:** Android-first mobile app, with a responsive web/admin option
as a later phase\
**Primary users:** Shop owner, staff, and (optionally) accountant /
business partner

------------------------------------------------------------------------

## 1. Product vision

Build a simple, reliable app that gives a shop owner one place to
maintain the complete shop inventory and day-to-day stock movement.

The app should let the owner: - Add, view, edit, archive, and delete
item listings. - Track available quantity, units, purchase cost, selling
price, and stock value. - Track batch/lot numbers and expiry dates where
applicable. - Record purchases from suppliers and sales to customers. -
Automatically update stock after every purchase, sale, return, or
adjustment. - Find low-stock, out-of-stock, and near-expiry items. -
Share item lists, stock reports, and selected records. - Review business
summaries and export data for backup/accounting.

**Product principle:** everyday operations must be quick enough to
complete at the counter, with minimal typing and clear confirmation
before destructive actions.

## 2. Assumptions and decisions to confirm

This PRD is intentionally shop-type neutral. The following are proposed
defaults, not confirmed facts:

  -----------------------------------------------------------------------
  Topic                               Proposed default
  ----------------------------------- -----------------------------------
  Platform                            Android-first; responsive web can
                                      follow

  Currency                            INR (₹)

  Language                            Hindi and English labels;
                                      English-first initial build

  Tax                                 Configurable tax fields; GST
                                      invoices only if required

  Connectivity                        Offline-friendly entry with sync
                                      when online

  Users                               Owner + staff roles

  Product expiry                      Optional per item; batch-wise for
                                      products with different expiry
                                      dates

  Barcode                             Manual entry first; camera scan as
                                      a convenience

  Customer/supplier data              Optional master records

  Billing hardware                    Not required for MVP
  -----------------------------------------------------------------------

Before development, confirm the shop category (e.g. grocery, pharmacy,
cosmetics, general store, hardware), number of products, number of
staff/devices, whether GST billing is needed, and whether the app must
work without internet. Pharmacy/food-specific compliance and workflows
should be scoped separately rather than assumed.

## 3. Goals and non-goals

### Goals

1.  Maintain an accurate live stock count.
2.  Know what was bought, sold, returned, adjusted, and when.
3.  Avoid selling expired stock by tracking expiry at batch level.
4.  Identify items to reorder before they run out.
5.  Make stock and sales information easy to share/export.
6.  Preserve a traceable history of important stock changes.

### Non-goals for the first release

-   Full accounting / profit-and-loss ledger.
-   Payroll, attendance, or employee HR.
-   E-commerce storefront and online payment gateway.
-   Multi-branch stock transfers (possible later phase).
-   Automated supplier ordering.
-   Regulatory workflows specific to pharmacy, food, or other regulated
    categories until shop type is known.

## 4. User roles and permissions

  -----------------------------------------------------------------------
  Role                                Permissions
  ----------------------------------- -----------------------------------
  Owner / Admin                       Full access; manage users,
                                      products, settings, reports,
                                      exports, and corrections

  Manager                             Products, purchases, sales, stock
                                      adjustments, reports; cannot remove
                                      owner or change ownership

  Staff / Cashier                     Search products, create sales, view
                                      permitted stock; no destructive
                                      admin actions

  Viewer / Accountant                 Read-only reports and transaction
                                      history; export only if granted
  -----------------------------------------------------------------------

Every user action that changes stock should record the actor and
timestamp. Staff permissions should be configurable.

## 5. Functional requirements

### 5.1 Dashboard

Show at a glance: - Total active products and total stock units. -
Estimated stock value (clearly indicate whether based on purchase cost
or selling price). - Today's sales amount and number of sales. - Today's
purchases amount. - Low-stock and out-of-stock counts. - Products
expiring soon and already expired. - Recent transactions and quick
actions: Add Item, New Sale, New Purchase, Stock Adjustment.

Date filters: Today, 7 days, 30 days, custom range.

### 5.2 Item / product catalogue

Each product should support: - Product name (required). - SKU / internal
item code (unique within the shop). - Barcode (optional; unique when
supplied). - Category and brand (optional). - Description / notes
(optional). - Unit of measure: piece, pack, box, kg, g, litre, ml,
metre, etc. - Purchase cost and selling price. - Tax rate / tax code
(optional, configurable). - Opening stock. - Minimum stock / reorder
threshold. - Product image (optional). - Active / archived status. -
Expiry tracking mode: none, product-level, or batch-level.

Actions: - Create, view, edit, search, filter, sort, archive, restore,
and delete. - Bulk import via CSV template. - Bulk update selected
fields, with confirmation and preview. - Duplicate warning for matching
SKU/barcode/name. - Product deletion must be blocked if it has
transaction history; archive it instead. Admin-only correction flow may
be provided with an audit record.

### 5.3 Stock and batch management

-   Maintain stock by product and, where relevant, by batch/lot.
-   Batch fields: batch number, quantity, purchase date, expiry date,
    supplier, and purchase cost.
-   Support stock-in, stock-out, return, damage, theft/loss, and manual
    adjustment.
-   Require a reason for manual adjustments.
-   Never allow negative stock by default; owner can explicitly enable
    it if business rules require.
-   For expiry-tracked products, show batch-level remaining quantity and
    expiry.
-   Recommend FEFO (First Expired, First Out) for picking stock with
    expiry dates.
-   Keep a stock movement ledger; do not silently overwrite previous
    quantities.
-   Support unit conversion only when conversion is explicitly
    configured (e.g. 1 box = 12 pieces).

### 5.4 Expiry management

-   Expiry date is optional for non-expiring products.
-   For products with different expiry dates, expiry belongs to each
    batch, not just the product master.
-   Configurable alerts, suggested defaults: 90, 30, 7, and 1 day before
    expiry.
-   Separate lists: Expired, Expiring soon, No expiry date (for products
    where expiry is expected).
-   Show product, batch, expiry date, remaining quantity, and estimated
    cost value.
-   Allow marking stock as expired / unsellable; this creates a stock
    movement and does not erase history.
-   Do not automatically delete expired stock. Require an authorised
    user to record a write-off/return/disposal.

### 5.5 Purchase records

Purchase entry fields: - Supplier (optional but recommended). - Supplier
invoice / bill number. - Purchase date and time. - Product lines,
quantities, unit cost, discount, tax (if applicable), batch number,
expiry date. - Additional charges (optional). - Payment status: unpaid,
partially paid, paid. - Payment method and notes (optional).

On saving a purchase: - Increase stock for the correct product/batch. -
Store purchase line items and totals. - Update weighted average cost
only if that costing method is selected; retain batch costs
regardless. - Prevent accidental duplicate supplier invoice entries with
a warning. - Support purchase return / supplier return as a separate
transaction that reduces stock.

### 5.6 Sales records

Sale entry fields: - Bill / invoice number (generated by the app,
configurable prefix). - Date and time. - Product lines, quantity,
selling price, discount, tax (if applicable). - Customer name / phone
(optional; avoid collecting unnecessary personal data). - Payment status
and method: cash, UPI, card, credit, split payment. - Notes.

On saving a sale: - Reduce stock from selected batch(es). - For
expiry-tracked products, use FEFO by default; allow authorised override
with a reason. - Warn/block if stock is insufficient. - Store a
transaction snapshot of product name, SKU, price, tax, and quantity so
later product edits do not rewrite old bills. - Support full/partial
sales returns and exchanges with stock movement records. - Allow bill
sharing as PDF or image and printing in a later phase.

### 5.7 Stock adjustments and returns

Adjustment reasons: opening balance correction, damage, expiry
write-off, theft/loss, found stock, counting correction, internal use,
and other. - Record before quantity, change, after quantity, reason,
actor, timestamp, and optional attachment. - Returns must link to the
original sale or purchase where possible. - Returned goods should be
classified as sellable, damaged, or quarantined before adding to
available stock.

### 5.8 Search, filters, and sharing

-   Global search by product name, SKU, barcode, and category.
-   Filters for category, low stock, out of stock, expired, expiring
    soon, and archived.
-   Share a single product or selected catalogue as CSV/PDF.
-   Share stock summary, sales summary, purchase summary, and expiry
    report.
-   Export should respect role permissions and show the date range /
    generation time.
-   Use the platform share sheet where available; never expose private
    shop data through public links by default.

### 5.9 Reports

MVP reports: - Current stock report (quantity by product/batch). - Stock
valuation at purchase cost. - Sales report by day/date range/product. -
Purchase report by day/date range/supplier. - Low-stock and reorder
report. - Expiry and expired-stock report. - Stock movement / adjustment
ledger. - Gross margin estimate only when cost data is sufficiently
complete; label assumptions clearly.

Export: CSV first; PDF for human-readable summaries. Excel-compatible
CSV should use stable column names and ISO date formats.

### 5.10 Notifications

-   Low-stock alerts when quantity reaches the configured threshold.
-   Expiry reminders based on configured lead times.
-   Optional daily summary for owner.
-   In-app notification centre first; push notifications after reliable
    account/device setup.
-   Avoid sending duplicate alerts for the same product/batch/threshold.

### 5.11 Settings and data portability

-   Shop name, address, contact details, logo, currency, timezone,
    invoice prefix.
-   Units, categories, tax configuration, low-stock defaults, expiry
    alert defaults.
-   CSV import with column mapping, preview, validation, and error
    report.
-   CSV export and full backup/restore process.
-   Account deletion and data export process should be documented.

## 6. Core user journeys

### Journey A --- Add a product

1.  Tap **Add Item**.
2.  Enter name, SKU/barcode (optional), category, unit, purchase cost,
    selling price, opening quantity, and reorder level.
3.  If expiry tracking is enabled, add the opening batch and expiry
    date.
4.  Review and save.
5.  Product appears in catalogue and dashboard counts update.

### Journey B --- Record a purchase

1.  Tap **New Purchase** and select supplier (or continue without one).
2.  Add product lines, quantities, costs, batch numbers, and expiry
    dates where applicable.
3.  Review totals and payment status.
4.  Save purchase.
5.  Stock increases and purchase appears in history.

### Journey C --- Record a sale

1.  Tap **New Sale**.
2.  Search or scan product; add quantity.
3.  App checks available stock and selects eligible batch using FEFO
    when configured.
4.  Select payment method and save.
5.  Stock decreases; bill and sale record are available to share.

### Journey D --- Review expiry

1.  Open **Expiry**.
2.  Filter Expired / 7 days / 30 days / 90 days.
3.  Open a batch to view remaining quantity and cost value.
4.  Record return, quarantine, or write-off with reason.
5.  Stock ledger records the action.

### Journey E --- Share stock list

1.  Open Products or Reports.
2.  Apply filters and select fields/date range.
3.  Choose CSV or PDF.
4.  Preview and share through the device share sheet.

## 7. Screens / navigation map

Suggested bottom navigation: 1. **Home** --- dashboard and alerts. 2.
**Products** --- catalogue, search, filters, product details. 3.
**Transactions** --- Sales, Purchases, Returns, Adjustments. 4.
**Reports** --- stock, sales, purchase, expiry, movement. 5. **More**
--- suppliers, customers, users, settings, backup.

Primary screens: - Login / shop setup. - Dashboard. - Product list and
product detail. - Add/edit product. - Batch list and batch detail. - New
sale / sale detail / return. - New purchase / purchase detail / purchase
return. - Stock adjustment. - Expiry dashboard. - Supplier and customer
list/detail. - Reports and export. - User/role management. - Settings,
import, backup and restore.

## 8. Data model (suggested)

Use relational data with transaction history. Suggested entities:

  -----------------------------------------------------------------------
  Entity                              Important fields
  ----------------------------------- -----------------------------------
  Shop                                id, name, timezone, currency,
                                      settings

  User                                id, shop_id, name, phone/email,
                                      role, status

  Category                            id, shop_id, name

  Product                             id, shop_id, name, SKU, barcode,
                                      category_id, unit, cost,
                                      selling_price, reorder_level,
                                      expiry_mode, status

  Batch                               id, product_id, batch_no,
                                      purchase_date, expiry_date,
                                      qty_received, qty_available,
                                      unit_cost, supplier_id

  Supplier                            id, shop_id, name, phone, address,
                                      notes

  Customer                            id, shop_id, name, phone, notes

  Sale                                id, shop_id, bill_no, datetime,
                                      customer_id, subtotal, discount,
                                      tax, total, payment_status

  SaleItem                            id, sale_id, product_id, batch_id,
                                      product_name_snapshot,
                                      SKU_snapshot, qty, unit_price,
                                      cost_snapshot, discount, tax

  Purchase                            id, shop_id, supplier_id,
                                      invoice_no, datetime, subtotal,
                                      discount, tax, total,
                                      payment_status

  PurchaseItem                        id, purchase_id, product_id,
                                      batch_id, qty, unit_cost, discount,
                                      tax

  StockMovement                       id, shop_id, product_id, batch_id,
                                      movement_type, qty_delta,
                                      before_qty, after_qty,
                                      reference_type, reference_id,
                                      reason, actor_id, created_at

  Payment                             id, shop_id, reference_type,
                                      reference_id, method, amount,
                                      datetime

  Notification                        id, shop_id, type, entity_id,
                                      due_at, status

  AuditLog                            id, shop_id, actor_id, action,
                                      entity_type, entity_id,
                                      before_json, after_json, created_at
  -----------------------------------------------------------------------

**Important data rules** - Store quantities as decimal values where
weight/volume units are supported; do not assume all products are
whole-number quantities. - Use integer minor currency units (paise) or a
fixed-precision decimal for money; never use floating-point arithmetic
for financial totals. - Use database transactions when saving a
sale/purchase and its stock movements. - Keep stock movements immutable;
corrections should create reversal/correction movements. - Enforce
shop-level data isolation on every query and API. - Use
soft-delete/archive for products referenced by historical
transactions. - Store timestamps consistently (UTC in backend) and
display in shop timezone. - Keep historical line-item snapshots so
catalogue edits do not change past transactions.

## 9. Suggested technical architecture

A practical implementation for a small-shop product:

### Option A --- React Native + managed backend (recommended for a fast MVP)

-   Mobile: React Native (Android first; iOS can follow).
-   Backend: Supabase (PostgreSQL, Auth, Row Level Security, Storage) or
    a Node.js API with PostgreSQL.
-   Offline/local persistence: SQLite-based local database and an
    explicit sync queue.
-   Notifications: local notifications first; push notifications later.
-   Exports: generate CSV on-device or server-side PDF.
-   Admin web: Next.js later, reusing API and business rules.

### Option B --- React Native + Node.js backend

-   Mobile: React Native.
-   API: Node.js + Express/NestJS.
-   Database: PostgreSQL.
-   Auth: secure session/token approach with refresh-token rotation.
-   Files: object storage for images/attachments.
-   Background jobs: expiry and low-stock alert generation.
-   Offline: local SQLite + retryable outbox/sync API.

Choose one backend approach; do not build both Supabase and a custom API
in the first release unless there is a concrete need.

### Architecture safeguards

-   The backend must be the source of truth for synced stock.
-   Stock-changing operations must be atomic and idempotent (retrying
    the same request must not create duplicate sales or purchases).
-   Use a unique request/idempotency key for transaction submission.
-   Resolve sync conflicts explicitly; never silently overwrite a newer
    stock count with an old offline value.
-   Add pagination and indexes for product search and transaction
    history.
-   Backups, restore tests, access control, and audit logs are release
    requirements, not optional polish.

## 10. MVP scope and phased roadmap

### Phase 0 --- Confirm business rules

-   Confirm shop category and compliance needs.
-   Decide single shop vs multiple branches.
-   Decide offline requirement and number of devices/users.
-   Decide whether invoices/GST are needed.
-   Confirm whether expiry is relevant for all, some, or no product
    categories.

### Phase 1 --- MVP (build first)

-   Login and shop setup.
-   Owner/staff roles (basic).
-   Product CRUD + categories + units.
-   Opening stock and stock ledger.
-   Purchase entry and purchase history.
-   Sales entry and sales history.
-   Automatic stock update with insufficient-stock warning.
-   Batch and expiry tracking for applicable products.
-   Low-stock and expiry lists.
-   Product search and filters.
-   CSV import/export and basic reports.
-   Backup/export.

### Phase 2 --- Operational improvements

-   Barcode scanning.
-   PDF bills and report sharing.
-   Supplier/customer balances and payment tracking.
-   Returns, exchanges, damaged stock and write-offs.
-   Push notifications and scheduled daily summary.
-   Better offline sync and multi-device support.
-   Hindi UI and configurable invoice templates.

### Phase 3 --- Advanced

-   Multi-branch stock and transfers.
-   Purchase suggestions based on sales velocity.
-   Profit/margin and category performance analytics.
-   Web dashboard.
-   Accounting/GST integration after requirements and professional
    review.
-   Supplier order workflow.

**MVP acceptance rule:** a shop owner can add products, record a
purchase, record a sale, see correct stock, identify low/expired stock,
and export/share the relevant records without needing a spreadsheet.

## 11. Non-functional requirements

  -----------------------------------------------------------------------
  Area                                Requirement
  ----------------------------------- -----------------------------------
  Usability                           Common sale/purchase flow should be
                                      short, readable, and usable
                                      one-handed

  Performance                         Product search should feel
                                      responsive for at least 5,000
                                      catalogue items; benchmark with
                                      real data

  Reliability                         No stock loss or duplicate
                                      transaction on retries

  Security                            Authentication, role-based access,
                                      shop-level isolation, secure
                                      transport, protected backups

  Privacy                             Collect only necessary
                                      customer/staff information;
                                      restrict report sharing

  Offline                             Clearly show offline/sync status;
                                      queue operations safely if offline
                                      mode is included

  Auditability                        Every stock change traceable to a
                                      transaction or adjustment

  Accessibility                       Adequate contrast, scalable text,
                                      labelled controls

  Maintainability                     Business logic separated from UI;
                                      automated tests for stock
                                      calculations

  Backup                              Regular backup and a tested restore
                                      procedure
  -----------------------------------------------------------------------

## 12. Business rules and edge cases to decide

-   Can a sale be saved when stock is insufficient?
-   Are negative stock and backdated transactions allowed?
-   Is expiry mandatory for selected categories?
-   How should a product with multiple batches be sold (FEFO or manual
    selection)?
-   What happens when goods are returned without the original bill?
-   Can a purchase invoice contain the same product in multiple batches?
-   How are discounts and taxes calculated (line-level vs bill-level)?
-   Are prices inclusive or exclusive of tax?
-   Is credit sale / customer due tracking required?
-   Should staff see purchase cost and profit?
-   Can one product have multiple barcodes or pack sizes?
-   How should stock be handled when units are converted?
-   Who can edit or cancel a completed sale/purchase?
-   Should old transactions be cancellable, or only reversed through a
    return/adjustment?

## 13. Testing checklist

-   Add/edit/archive product; prevent duplicate SKU/barcode.
-   Opening stock creates correct movement.
-   Purchase increases correct product and batch quantities exactly
    once.
-   Sale decreases stock correctly and cannot oversell by default.
-   FEFO selects earliest eligible expiry batch.
-   Expired batch is blocked/warned according to shop policy.
-   Purchase return and sales return create correct movements.
-   Adjustment requires reason and records actor.
-   Concurrent sales cannot oversell the same stock.
-   Offline retry does not duplicate transactions.
-   Sync conflict does not silently overwrite stock.
-   CSV import validates malformed rows and reports errors.
-   Export totals match transaction records.
-   Staff cannot access owner-only functions.
-   One shop cannot read another shop's data.
-   Backup can be restored and verified.

## 14. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Stock becomes inaccurate            Immutable movement ledger, atomic
                                      writes, reconciliation report

  Expiry data is incomplete           Batch-level entry, CSV import,
                                      reminders for missing expiry where
                                      expected

  Accidental deletion                 Archive-first design, confirmation,
                                      audit history

  Offline sync duplicates             Idempotency keys and server-side
                                      transaction validation

  Staff misuse                        Role permissions, PIN/biometric
                                      re-auth for sensitive actions if
                                      needed

  Scope grows too large               Strict MVP; postpone accounting,
                                      multi-branch, and advanced
                                      analytics

  Incorrect tax/compliance            Keep tax configurable; confirm
  assumptions                         requirements with qualified local
                                      professional
  -----------------------------------------------------------------------

## 15. Research notes and product references

The following established products are useful references for feature
patterns and validation. They are not endorsements, and their current
plans/pricing should be checked before choosing a vendor.

-   **Zoho Inventory** --- useful reference for item catalogue, stock
    tracking, purchase orders, sales orders, warehouses, and reporting.
    Official product overview: https://www.zoho.com/inventory/
-   **Vyapar** --- India-focused reference for small-business billing,
    inventory, purchase/sales records, and GST-oriented workflows.
    Official site: https://vyaparapp.in/
-   **myBillBook** --- India-focused reference for billing,
    stock/inventory, and business reports. Official site:
    https://mybillbook.in/
-   **TallyPrime** --- reference for established accounting and
    inventory workflows; likely more than an MVP needs. Official site:
    https://tallysolutions.com/
-   **GS1 India** --- reference for barcode/GTIN standards and product
    identification. Official site: https://www.gs1india.org/

### Research takeaways

1.  Keep catalogue, sales, purchases, stock movements, and reports as
    distinct but connected modules.
2.  Make expiry a batch-level feature; one product can have multiple
    batches and different expiry dates.
3.  Avoid treating a stock quantity field as the whole inventory system.
    A movement ledger is essential for traceability.
4.  Start with CSV import/export and basic reports; add barcode scanning
    and advanced billing after core stock accuracy works.
5.  Compare vendor products against the shop's real workflows before
    deciding whether to build custom or configure an existing solution.

## 16. Recommended first release decision

Build an Android-first, single-shop MVP with: - Product catalogue and
categories. - Purchase and sales entry. - Batch-aware stock and optional
expiry. - Low-stock / expiry dashboard. - Stock movement history. - CSV
import/export and shareable reports. - Owner and staff permissions. -
Reliable backup and restore.

Do not start with a full accounting suite, multi-branch inventory,
complex GST filing, or e-commerce. First prove that daily stock remains
correct.

## 17. Questions to finalise the scope

1.  What type of shop is it (grocery, general store, pharmacy,
    cosmetics, hardware, clothing, etc.)?
2.  Roughly how many different products/SKUs do you have?
3.  Will only you use the app, or will staff use it on multiple phones?
4.  Must it work when the internet is unavailable?
5.  Do you need GST invoices / barcode scanning / customer credit
    tracking?
6.  Is expiry tracking required for most products or only selected
    products?
7.  Do you want Android only, or Android + iPhone + web dashboard?

------------------------------------------------------------------------

**Document note:** This is a product requirements and
implementation-planning document, not legal, tax, or regulatory advice.
Confirm category-specific compliance, invoicing, tax, and data-retention
requirements before production use.


---

# PRD Update — Purchase Refill, Wholesale Sales, Billing & Due Payments
**Added:** 21 November 2026  
**Scope:** This update expands the original PRD. These requirements are part of the core product scope, not optional notes.

## 18. Purchase / Stock Refill Register (Detailed Purchase History)

The owner must be able to record every time stock is purchased or refilled, including repeat purchases of the same product on different dates and at different prices.

### Purchase entry fields
- Purchase date and time (default to current date/time; editable for backdated entry).
- Supplier / wholesaler name and contact (optional).
- Supplier invoice or reference number (optional).
- Product/item selection.
- Quantity purchased and unit (piece, box, kg, litre, etc.).
- Rate per unit / purchase cost.
- Line discount (optional).
- Tax and additional charges (optional, if applicable).
- Batch number and expiry date (when relevant).
- Payment made to supplier, payment method, and remaining supplier payable (optional for MVP; enable if the shop wants purchase-credit tracking).
- Notes and bill photo/attachment (optional).

### Required behaviour
1. Every saved purchase creates a separate, dated purchase record.
2. The app increases stock by the received quantity and creates a stock movement linked to that purchase.
3. The product detail page must show a **Purchase History** timeline, for example:
   - 05 Nov 2026 — 20 units — ₹2,000 — Supplier A
   - 12 Nov 2026 — 15 units — ₹1,650 — Supplier B
   - 21 Nov 2026 — 30 units — ₹3,300 — Supplier A
4. The user can open any purchase entry to see its full details, edit it subject to permissions, or cancel/reverse it with an audit trail.
5. Editing or reversing a purchase must recalculate stock through correction movements; it must not silently overwrite the stock ledger.
6. Product-level summaries should show total quantity purchased, total purchase value, last purchase date, and latest/average cost (clearly label the costing method).
7. A purchase can contain multiple products. Each product line must retain its own quantity, rate, discount, and batch details.
8. Support partial supplier payments and supplier outstanding balance if enabled.

## 19. Wholesale / Business-to-Business (B2B) Sales & Billing

The app must support selling products in bulk to another shopkeeper or business, not just retail sales to walk-in customers.

### Customer / shopkeeper master
Maintain optional business-customer details:
- Shop / business name (required for a saved business customer).
- Contact person.
- Phone number.
- Billing address and GSTIN (optional; only if applicable and verified).
- Notes and opening outstanding balance (optional, with an opening-balance date).
- Customer ledger showing invoices, payments, credit notes/returns, and outstanding amount.

The user must also be able to create a one-time customer during billing without first creating a permanent customer record.

### Create wholesale invoice
Invoice creation flow:
1. Select an existing shopkeeper/customer or add a new one.
2. Add one or more products from current inventory.
3. Enter quantity for each item; allow bulk quantities and configured units/pack sizes.
4. Show available stock and warn/block if the requested quantity exceeds stock.
5. Use the default selling price, but allow an authorised user to enter a customer-specific or negotiated rate.
6. Apply discount at line level and/or invoice level:
   - Fixed amount discount (₹).
   - Percentage discount (%).
   - Show the discount clearly on the invoice.
   - Validate that discounts cannot create an unintended negative payable.
7. Apply tax only when the shop's tax settings and applicable invoicing requirements have been configured.
8. Calculate and display subtotal, item discounts, invoice discount, tax, additional charges, rounding adjustment (if configured), and final grand total.
9. Add invoice date, due date (optional), invoice number, and notes.
10. Preview invoice before confirming.

### Invoice calculation
For each line:

`Line amount = Quantity × Unit selling price`

`Line net = Line amount − Line discount`

Then:

`Grand total = Sum of line net amounts − Invoice discount + Tax + Additional charges + Rounding`

The app must clearly show whether prices are tax-inclusive or tax-exclusive according to shop settings. Percentage and fixed discounts must be validated and rounded consistently using decimal-safe currency arithmetic.

### Payment collection and outstanding / due tracking
After the invoice total is calculated, the user must enter how much payment the customer has made.

Support:
- Full payment.
- Partial payment (any amount from ₹0 up to the amount due).
- Multiple payments against one invoice, made on different dates.
- Payment methods: Cash, UPI, bank transfer, card, cheque, or other configurable method.
- Payment date/time and optional transaction/reference number.
- Optional due date and payment notes.

The app calculates:

`Outstanding amount = Invoice grand total − Total payments received − Credit notes/adjustments`

Invoice/payment status:
- **Unpaid:** no payment received and balance is due.
- **Partially Paid:** some payment received, but balance remains.
- **Paid:** outstanding amount is zero.
- **Overdue:** outstanding amount remains after the due date (this can be an additional status/flag).

Example:
- Invoice grand total: ₹25,000
- Payment received today: ₹10,000
- Outstanding: ₹15,000
- Later payment received: ₹15,000
- Outstanding: ₹0 — status changes to **Paid**.

Do not allow payment received to exceed the invoice balance unless the app explicitly supports customer advance payments. If advances are supported, record them separately in the customer ledger.

### Invoice finalisation and download
After the user confirms the invoice:
- Generate a unique invoice number using a configurable prefix and sequence.
- Save the invoice and its item/price/discount/tax snapshots.
- Deduct the sold quantity from inventory exactly once.
- Record stock movements linked to the invoice and batch(es).
- Generate a downloadable, printable PDF invoice.
- Provide sharing through the phone's share sheet (WhatsApp, email, etc.).
- Allow the user to download/share the invoice again from Sales History.
- Show payment received, payment date(s), and balance due on the invoice/statement where appropriate.
- A later payment must update the invoice's payment status and customer ledger, but must not change the original invoice total.
- Once finalised, an invoice should not be silently edited. Use a controlled edit/cancel/credit-note workflow with an audit trail.

### Invoice PDF content
Suggested invoice fields:
- Shop name, logo, address, phone, and configured tax details.
- Invoice number, invoice date, and due date.
- Customer / shopkeeper name and billing details.
- Item description, SKU, quantity, unit, rate, discount, tax (if configured), and line total.
- Subtotal, discounts, taxes, additional charges, and grand total.
- Amount paid, payment method, and outstanding balance.
- Notes / terms and authorised signature area (optional).

GST/tax invoice formats and mandatory fields must be confirmed for the shop's actual registration and business type before production use.

## 20. Customer Ledger & Dues

For each business customer, provide a ledger view:
- Opening balance (if entered).
- All invoices and invoice dates.
- Payments received and payment dates.
- Returns / credit notes / adjustments.
- Running balance after every entry.
- Current total outstanding.
- Ageing buckets: not due, 1–30 days, 31–60 days, 61–90 days, and over 90 days (configurable).
- Customer statement export/share as PDF or CSV.

Dashboard cards:
- Total receivables (amount customers owe the shop).
- Total overdue amount.
- Customers with outstanding balances.
- Recent payments received.

The customer ledger must distinguish invoice value from payment receipts. Never mark an invoice as paid merely because a payment note was typed; a payment transaction must be saved.

## 21. Revised Main Navigation

Recommended navigation:
1. **Dashboard** — stock summary, sales, purchases, receivables, low stock and expiry alerts.
2. **Products** — catalogue, product details, batches and purchase history.
3. **Purchases** — stock refill entries, suppliers, supplier payments and purchase history.
4. **Sales & Invoices** — retail/wholesale sales, invoice creation, PDF download, payment collection and sales history.
5. **Customers** — shopkeepers, customer ledger, outstanding dues and statements.
6. **Reports / More** — inventory, expiry, sales, purchases, receivables, users, settings and backup.

If a five-tab mobile layout is preferred, combine Customers and Reports under **More**, while keeping New Sale and New Purchase as prominent quick actions.

## 22. Revised Data Model Additions

Add or extend these entities:

| Entity | Important fields |
|---|---|
| Customer | id, shop_id, business_name, contact_person, phone, billing_address, GSTIN_optional, notes, status |
| Supplier | id, shop_id, name, contact, phone, address, notes |
| Purchase | id, shop_id, supplier_id, invoice_no, purchase_datetime, subtotal, discount, tax, charges, grand_total, amount_paid, balance_due, payment_status |
| PurchaseItem | id, purchase_id, product_id, batch_id, qty, unit, unit_cost, discount, tax, line_total |
| SalesInvoice | id, shop_id, customer_id, invoice_no, invoice_datetime, due_date, subtotal, discount, tax, charges, grand_total, status |
| SalesInvoiceItem | id, invoice_id, product_id, batch_id, product_name_snapshot, SKU_snapshot, qty, unit, unit_price, discount, tax, line_total, cost_snapshot |
| Payment | id, shop_id, party_type, party_id, reference_type, reference_id, amount, method, paid_at, reference_no, notes |
| CustomerLedgerEntry | id, shop_id, customer_id, entry_type, reference_type, reference_id, debit, credit, balance_after, created_at |
| SupplierLedgerEntry | id, shop_id, supplier_id, entry_type, reference_type, reference_id, debit, credit, balance_after, created_at |
| CreditNote / Return | id, shop_id, invoice_id, customer_id, amount, reason, created_at |

Use a consistent ledger convention and document it (for example, customer invoice increases receivable; payment reduces receivable). The database should support multiple payments against one invoice and payments allocated across invoices if that is required later.

## 23. Revised MVP Acceptance Criteria

The MVP is not complete until all of the following work end-to-end:

1. Add a product and opening stock.
2. Purchase/refill the same product on multiple dates and retain each purchase as a separate history entry.
3. Open a product and see its complete purchase history and current stock.
4. Save a purchase containing multiple items and update stock exactly once.
5. Create a wholesale invoice for another shopkeeper with multiple products and bulk quantities.
6. Apply a percentage or fixed-amount discount and see the correct grand total.
7. Record full payment and verify the invoice becomes Paid.
8. Record partial payment and verify the correct outstanding balance remains.
9. Add a later payment and verify the outstanding balance reduces to zero and status becomes Paid.
10. Download and share a PDF invoice from the completed invoice and later from Sales History.
11. Verify stock is deducted exactly once when the invoice is finalised.
12. View a customer ledger and export a statement showing invoices, payments, and outstanding balance.
13. Cancel/reverse a transaction through an audited correction workflow without erasing history.
14. Verify concurrent or retried requests cannot create duplicate invoices, payments, or stock movements.

## 24. Updated MVP Priority

**Must-have for first usable release**
- Product catalogue and current stock.
- Dated purchase/refill records and per-product purchase history.
- Wholesale sales invoice with multiple products and bulk quantities.
- Fixed and percentage discounts.
- Full and partial payment recording.
- Automatic outstanding balance and Paid / Partially Paid / Unpaid status.
- PDF invoice generation and download/share.
- Stock movement ledger.
- Basic customer records and customer outstanding summary.
- Expiry and low-stock tracking for relevant products.
- CSV export and backup.

**Can follow after the first release**
- Customer-specific price lists and negotiated rates.
- Payment reminders by WhatsApp/SMS.
- Supplier credit and supplier payment ageing.
- GST/e-invoice integrations, after confirming legal applicability and technical requirements.
- Barcode scanning, multi-branch operations and advanced analytics.
