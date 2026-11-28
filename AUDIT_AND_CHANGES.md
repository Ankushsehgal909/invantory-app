# ShopStock Backend & Web Dashboard Audit Report

**Reference PRD:** [Shop_Inventory_App_PRD_README (1).md](file:///Users/psiborg/Documents/projects/invantory-app/Shop_Inventory_App_PRD_README%20%281%29.md)  
**Scope:** `backend/`, `web-dashboard/`, and `shared/`  
**Build Status:** `npm run build --workspace=backend` (`tsc`) and `npm run build --workspace=web-dashboard` (`tsc && vite build`) both pass, **but** `npm run test --workspace=backend` and `npm run test --workspace=web-dashboard` both fail because **0 test files exist**.

---

## Executive Summary

The codebase has a solid foundational structure (Prisma schema, Express routes, React + Vite dashboard, shared Zod validators/types), **but it is not production-ready**. There are **critical data-integrity bugs** (currency unit mismatches, stock desynchronization on batch/FEFO sales and adjustments, missing `shopId` filters, corrupt ledger writes), **broken web-to-backend API wiring** (multiple 404 endpoints and a missing `/suppliers/:id` route), **missing MVP PRD features** (PDF invoice generation, creating sales/purchases from web dashboard, real backup/restore, idempotency enforcement), and **zero automated tests**.

---

## 1. Critical Bugs & Data Integrity Issues (Backend)

### 1.1 Mixed Currency Units (Major vs. Minor/Paise) in Sales & Purchases
- **PRD Rule (§8, §19):** Use integer minor currency units (paise) consistently; never mix units.
- **Findings:**
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L185-L275): `SalesInvoice` header totals (`subtotal`, `discount`, `tax`, `grandTotal`, `amountPaid`, `balanceDue`) are computed directly from input values without `toMinorUnits(...)`, whereas `SalesInvoiceItem` fields (`unitPrice`, `discount`, `tax`, `lineTotal`) call `toMinorUnits(...)`.
  - Worse, `costSnapshot` calls `toMinorUnits(product.purchaseCost)` even though `product.purchaseCost` is already stored in minor units in DB—multiplying it by 100 twice (10,000x).
  - Same mismatch in [`backend/src/routes/purchase.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/purchase.ts#L170-L212): `Purchase` header totals are not passed through `toMinorUnits(...)`, while `PurchaseItem` fields and `Batch.unitCost` are.
- **Required Change:** Standardize API input/output currency conventions (accept major units and convert once at the boundary, or accept minor units everywhere) and make header totals, line items, payments, and ledger entries use the exact same minor-unit values.

### 1.2 Stock Desynchronization on Batch / FEFO Sales & Adjustments
- **PRD Rule (§5.3, §8, §23):** Maintain accurate live stock; every stock change must update both batch and product stock atomically.
- **Findings:**
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L299-L333) (FEFO batch allocation) and [`sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L365-L396) (explicit `batchId`): `batch.quantityAvailable` is decremented, **but `product.currentStock` is never updated**.
  - In [`backend/src/routes/stock.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/stock.ts#L129-L184): When adjusting a specific `batchId`, `qtyBefore` is set to `batch.quantityAvailable`, and then line 183 sets `product.currentStock = qtyAfter`—overwriting the entire product's total stock with that single batch's new quantity instead of incrementing/decrementing `product.currentStock` by `quantityDelta`.
  - Also in [`stock.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/stock.ts#L167): `referenceId: ''` is passed to an `@db.ObjectId` field before updating it, which fails MongoDB ObjectId validation in Prisma.
- **Required Change:** Update both `batch.quantityAvailable` and `product.currentStock` (`{ increment: delta }`) on all batch sales/adjustments, and generate a valid `ObjectId` (or omit `referenceId` if optional) before creating `StockMovement`.

### 1.3 Corrupt Ledger Entries & Missing Customer Balance Updates
- **PRD Rule (§20, §22, §23):** Accurate customer/supplier ledgers with running balances.
- **Findings:**
  - In [`backend/src/routes/product.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/product.ts#L251-L260): Creating a product with `openingStock > 0` writes a **`CustomerLedgerEntry`** with `customerId: created.id` (a `Product` ID!). Opening stock should only create a `StockMovement`, never a `CustomerLedgerEntry`.
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L438): `CustomerLedgerEntry.balanceAfter` is set to `toMinorUnits(grandTotal)` instead of the customer's actual running balance.
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L643-L689) (`POST /sales/:id/payments`): Creates a `Payment` and `CustomerLedgerEntry`, **but never decrements `customer.currentBalance`**.
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L603-L608) (`POST /sales/:id/cancel`): Decrements `customer.currentBalance` by `invoice.grandTotal` even if part of it was already paid, and does not create a `CustomerLedgerEntry` or `CreditNote`.
- **Required Change:** Remove the bogus `CustomerLedgerEntry` from `product.ts`, compute `balanceAfter` from the customer's/supplier's actual `currentBalance`, decrement `customer.currentBalance` on `/sales/:id/payments`, and handle partial payments/refunds properly on invoice cancellation.

### 1.4 Missing Shop-Level Isolation & Global Unique Index Bugs
- **PRD Rule (§8, §13):** Enforce shop-level data isolation on every query and API; SKU and barcode must be unique *within the shop*.
- **Findings:**
  - In [`backend/src/routes/sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L180) and [`sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L208): `prisma.product.findMany` / `tx.product.findUnique` query by `id` without `shopId`. Same for `tx.batch.findUnique({ where: { id: item.batchId } })` in [`sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L224) and `tx.product` / `tx.batch` in `purchase.ts`.
  - In [`backend/prisma/schema.prisma`](file:///Users/psiborg/Documents/projects/invantory-app/backend/prisma/schema.prisma#L272): `barcode String? @unique` is a **global** unique constraint across all shops (and in MongoDB, a non-sparse unique index on `null` blocks creating more than one product without a barcode).
- **Required Change:** Add `shopId` to every `findFirst` / `findMany` / `update` / `delete` inside transactions, and change `barcode` uniqueness in `schema.prisma` to `@@unique([shopId, barcode])` (or sparse/partial index) instead of global `@unique`.

### 1.5 Idempotency & Invoice Number Concurrency
- **PRD Rule (§9, §23):** Retried or concurrent requests must not create duplicate invoices, payments, or stock movements.
- **Findings:**
  - `idempotencyMiddleware` is defined in [`backend/src/middleware/auth.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/middleware/auth.ts#L287), **but is never mounted** in `backend/src/index.ts` or any route. Even if mounted, it uses an in-memory `global.idempotencyKeys` object (lost on restart, not shop-scoped, not atomic).
  - Invoice number generation in [`sales.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/sales.ts#L159-L170) and [`purchase.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/purchase.ts#L152-L163) reads the latest invoice outside the transaction and increments it—concurrent requests will collide on `@@unique([shopId, invoiceNumber])`.
- **Required Change:** Persist idempotency keys in MongoDB (scoped by `shopId` + route + key) on stock/payment-mutating `POST` routes, and use an atomic counter collection (e.g., `ShopSequence`) for invoice/purchase numbers.

---

## 2. Broken Web Dashboard ↔ Backend API Wiring

The following calls in [`web-dashboard/src/services/api.ts`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/services/api.ts) and page components hit **non-existent backend endpoints (404)** or **missing frontend routes**:

| Frontend Location | Call / Route | Backend Status | Required Fix |
|---|---|---|---|
| [`App.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/App.tsx#L71) & [`Layout.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/layouts/Layout.tsx#L71) | `/suppliers/:id` (`SupplierDetail.tsx` exists) | Route missing in `App.tsx` | Add `<Route path="/suppliers/:id" element={<SupplierDetail />} />` in `App.tsx` |
| [`Layout.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/layouts/Layout.tsx#L59) | Batch notification navigates to `/products/${entityId}?tab=batches` | `entityId` is `batchId`, not `productId` | Include `productId` in notification metadata or resolve batch -> product |
| [`SaleDetail.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/SaleDetail.tsx#L59) | `DELETE /api/v1/sales/:id` (`deleteSalesInvoice`) | **404** — route does not exist | Use `POST /api/v1/sales/:id/cancel` (PRD forbids silent deletion of finalized invoices) |
| [`SaleDetail.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/SaleDetail.tsx#L72) | `GET /api/v1/sales/:id/export` (`exportSalesInvoice`) | **404** — route does not exist | Implement PDF invoice generation endpoint `GET /api/v1/sales/:id/export` |
| [`PurchaseDetail.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/PurchaseDetail.tsx#L70) | `GET /api/v1/purchases/:id/export` (`exportPurchase`) | **404** — route does not exist | Implement `GET /api/v1/purchases/:id/export` (PDF/CSV) |
| [`Customers.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/Customers.tsx#L67) | `GET /api/v1/import-export/export/customers` | **404** — route does not exist | Add `/export/customers` in `backend/src/routes/importExport.ts` |
| [`Suppliers.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/Suppliers.tsx#L67) | `GET /api/v1/import-export/export/suppliers` | **404** — route does not exist | Add `/export/suppliers` in `backend/src/routes/importExport.ts` |
| [`Reports.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/Reports.tsx#L102) | `GET /api/v1/reports/ledger` (`getLedgerReport`) | **404** — route does not exist | Implement `GET /api/v1/reports/ledger` in `backend/src/routes/report.ts` |

---

## 3. Missing PRD MVP Features

Cross-checking against PRD §18–§24 (Revised MVP Acceptance Criteria):

1. **Create Sale / Wholesale Invoice UI on Web Dashboard:** [`Sales.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/Sales.tsx) only lists/filters sales—there is no UI to create a new wholesale invoice (`createSale` in `api.ts` is unused).
2. **Create Purchase / Stock Refill UI on Web Dashboard:** [`Purchases.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/src/pages/Purchases.tsx) only lists/filters purchases—there is no UI to record a new purchase (`createPurchase` in `api.ts` is unused).
3. **PDF Invoice Generation (§19, §23):** No PDF generator exists on the backend for sales invoices or customer statements.
4. **Backup & Restore (§5.11, §11):** [`backend/src/routes/importExport.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/routes/importExport.ts#L421-L439) (`/backup` and `/restore`) and [`backend/src/jobs/index.ts`](file:///Users/psiborg/Documents/projects/invantory-app/backend/src/jobs/index.ts#L397) are placeholders that only log a message and return `{ success: true }`.
5. **Automated Test Suite (§11, §13):** `backend/` and `web-dashboard/` have **0 test files** (`vitest run` exits with code 1). All 16 PRD §13 scenarios (FEFO, oversell prevention, concurrent sales, idempotency, shop isolation, CSV import validation, ledger math) are untested.

---

## 4. Minor / Code-Quality Items

- **Web Dashboard Vite Warning:** [`web-dashboard/postcss.config.js`](file:///Users/psiborg/Documents/projects/invantory-app/web-dashboard/postcss.config.js) uses ESM syntax without `"type": "module"` in `web-dashboard/package.json`, causing a Node warning during `vite build`.
- **Bundle Size:** `web-dashboard` production bundle emits a single `538.30 kB` JS chunk (`vite build` warns > 500 kB); route-level `React.lazy()` code-splitting is recommended.
- **Database Note:** PRD §9 suggests PostgreSQL + Prisma/RLS, whereas the implementation uses MongoDB (`provider = "mongodb"` in `schema.prisma`). That's fine if intentional, but requires MongoDB replica set for `prisma.$transaction(...)` to work.

---

## 5. Recommended Action Plan (Priority Order)

1. **P0 — Fix Financial & Stock Integrity:**
   - Unify major/minor currency units in `sales.ts` and `purchase.ts` (fix `costSnapshot` double-multiplication).
   - Fix `product.currentStock` updates on batch/FEFO sales (`sales.ts`) and batch adjustments (`stock.ts`).
   - Fix `product.ts` opening-stock bogus `CustomerLedgerEntry`, fix `balanceAfter` math, and decrement `customer.currentBalance` on `/sales/:id/payments`.
   - Enforce `shopId` in all transaction queries and fix `barcode` unique index in `schema.prisma`.
   - Implement persistent idempotency key middleware and atomic invoice/purchase sequence counters.
2. **P1 — Fix Broken Web/Backend Contracts:**
   - Add `<Route path="/suppliers/:id" element={<SupplierDetail />} />` in `web-dashboard/src/App.tsx`.
   - Fix `SaleDetail.tsx` (`cancelSale` instead of missing `deleteSalesInvoice`).
   - Implement `/sales/:id/export` (PDF), `/purchases/:id/export`, `/import-export/export/customers`, `/import-export/export/suppliers`, and `/reports/ledger`.
3. **P2 — Complete MVP UI & Tests:**
   - Add Create Sale / Invoice and Record Purchase forms/pages in `web-dashboard`.
   - Implement real JSON/ZIP backup & restore in `importExport.ts`.
   - Add Vitest integration tests covering PRD §13 (stock math, FEFO, idempotency, shop isolation, RBAC).

---

## 6. Mobile App (`mobile-app/`) Audit

**Typecheck & Bundle Status:** `npx --workspace=mobile-app tsc --noEmit` and `react-native bundle` pass on React Native `0.88.1`, **but** `mobile-app` has **0 test files** (`jest`), and most core user journeys are either **stubbed (`TODO`)** or **broken against the backend API**.

### 6.1 Runtime Crash / Critical API Bugs
1. **`crypto.randomUUID()` in React Native Hermes ([`mobile-app/src/services/api.ts`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/services/api.ts#L22)):**
   - The request interceptor sets `config.headers['X-Idempotency-Key'] = crypto.randomUUID()` on all mutations (`POST`/`PUT`/`PATCH`/`DELETE`).
   - React Native's Hermes engine does **not** expose `crypto.randomUUID()` globally without a polyfill, causing every mutation request to throw at runtime.
   - **Fix:** Generate UUIDs with a pure-JS/RN-safe helper (or `uuid` + `react-native-get-random-values`).
2. **Wrong Delete Endpoints ([`CustomersScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/CustomersScreen.tsx#L26), [`SalesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/SalesScreen.tsx#L34), [`PurchasesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/PurchasesScreen.tsx#L34)):**
   - All three screens call **`apiHelpers.deleteProduct(id)`** inside their `deleteMutation` instead of deleting/cancelling a customer, sale, or purchase!
   - **Fix:** Wire `CustomersScreen` to `DELETE /customers/:id`, `SalesScreen` to `POST /sales/:id/cancel`, and `PurchasesScreen` to `POST /purchases/:id/cancel`.
3. **100x Currency Display Bug (All Screens):**
   - [`DashboardScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/DashboardScreen.tsx), [`ProductsScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/ProductsScreen.tsx#L6), [`ProductDetailScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/ProductDetailScreen.tsx#L6), [`PurchasesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/PurchasesScreen.tsx#L6), [`SalesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/SalesScreen.tsx#L6), [`CustomersScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/CustomersScreen.tsx#L6), and [`ReportsScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/ReportsScreen.tsx#L6) all import `formatCurrencyMajor as formatCurrency` (which does not divide minor units by 100), while the backend stores and returns minor units (paise).
   - **Fix:** Switch to `formatCurrency` from `@shopstock/shared/utils` (which converts minor units → major units) once backend currency units are unified.

### 6.2 Backend Data Contract Mismatches
- **[`SalesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/SalesScreen.tsx#L31):** Reads `response?.sales ?? []`, whereas `GET /api/v1/sales` returns `data: { invoices }` — so the Sales list is **always empty**. Also reads `item.saleNumber`, `item.saleDate`, `item.totalAmount`, `item.customer?.name` instead of backend fields `invoiceNumber`, `invoiceDate`, `grandTotal`, `customer?.businessName`, and uses lowercase statuses (`draft`, `completed`) instead of `InvoiceStatus` (`DRAFT`, `FINALIZED`, `CANCELLED`, `REFUNDED`).
- **[`PurchasesScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/PurchasesScreen.tsx#L74):** Reads `item.purchaseNumber` and `item.totalAmount` instead of `invoiceNumber` and `grandTotal`, and uses lowercase statuses (`ordered`, `received`) instead of `InvoiceStatus`.
- **[`ProductsScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/ProductsScreen.tsx#L80):** Reads `item.totalStock` instead of `currentStock`.
- **[`CustomersScreen.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/screens/CustomersScreen.tsx#L62):** Reads `item.name` instead of `item.businessName`.
- **Hardcoded Dev API URL ([`mobile-app/src/services/api.ts`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/services/api.ts#L4)):** `API_URL` uses `http://10.0.2.2:4000/api/v1` in `__DEV__`, which works for Android emulator but **fails on iOS Simulator** (`localhost:4000`) and physical devices.

### 6.3 Broken Navigation & Unreachable Screens
- **Missing Detail Screens in [`App.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/App.tsx#L97-L107):**
  - `PurchasesScreen.tsx:66` navigates to `'PurchaseDetail'` (not registered).
  - `SalesScreen.tsx:66` navigates to `'SaleDetail'` (not registered).
  - `CustomersScreen.tsx:55` navigates to `'CustomerDetail'` (not registered).
- **Unreachable `SettingsScreen`:** `Settings` is registered in `App.tsx`, but no tab or header button navigates to it.
- **Ignored `{ new: true }` Params:** `DashboardScreen.tsx` navigates to `Products`, `Purchases`, and `Sales` with `{ new: true }`, but none of those screens read `route.params?.new` to open their creation modal.

### 6.4 Stubbed Forms & Missing PRD Mobile Features
1. **All Create/Edit Forms Are Stubs (`TODO`):**
   - `ProductsScreen.tsx:184`, `ProductDetailScreen.tsx:301`, `PurchasesScreen.tsx:184`, `SalesScreen.tsx:184`, and `CustomersScreen.tsx:186` all have `onSubmit` set to `// TODO: Implement create/update`—they close the modal without calling any API.
2. **Barcode Scanner Unused:** [`BarcodeScanner.tsx`](file:///Users/psiborg/Documents/projects/invantory-app/mobile-app/src/components/BarcodeScanner.tsx) is never imported or wired into `ProductsScreen` or `SalesScreen`.
3. **No Offline SQLite / Sync Queue (PRD §2, §9, §11):** No local persistence or outbox sync queue exists; `SettingsScreen.tsx:288` only shows a placeholder `Alert.alert('Sync', 'Syncing data...')`.
4. **Missing PRD Screens/Flows:** No Suppliers list/detail screen, no Stock Adjustment screen, no Expiry Dashboard screen, no Customer Ledger/Payment collection UI, no PDF/CSV share-sheet export, and **0 Jest tests**.

### 6.5 Mobile Priority Fix Order
1. **P0:** Fix `crypto.randomUUID()` in `mobile-app/src/services/api.ts`, fix `deleteMutation` endpoints in `CustomersScreen`/`SalesScreen`/`PurchasesScreen`, and fix field-name mismatches (`invoices`, `invoiceNumber`, `grandTotal`, `currentStock`, `businessName`, `formatCurrency`).
2. **P1:** Wire real `create`/`update` API mutations in all 5 form modals, add `PurchaseDetail`, `SaleDetail`, `CustomerDetail`, and a Settings navigation trigger in `App.tsx` / `DashboardScreen.tsx`, and wire `BarcodeScanner` into product/sale flows.
3. **P2:** Add Suppliers, Stock Adjustments, Expiry Dashboard, PDF/CSV share sheet, offline SQLite sync queue, and Jest tests.
