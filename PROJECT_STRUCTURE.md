# Project Structure

- Root: `A:\dev\plazacms`
- Excluded names: .next, node_modules
- Hidden: excluded

```
plazacms/
|-- admin/
|   |-- doc/
|   |-- public/
|   |   |-- data/
|   |   |   +-- products-template.csv
|   |   |-- file.svg
|   |   |-- globe.svg
|   |   |-- next.svg
|   |   |-- vercel.svg
|   |   +-- window.svg
|   |-- src/
|   |   |-- app/
|   |   |   |-- admin/
|   |   |   |   |-- attributes/
|   |   |   |   |   |-- AttributesManager.tsx
|   |   |   |   |   +-- page.tsx
|   |   |   |   |-- categories/
|   |   |   |   |   |-- CategoriesManager.tsx
|   |   |   |   |   +-- page.tsx
|   |   |   |   |-- change-password/
|   |   |   |   |   |-- ChangePasswordForm.tsx
|   |   |   |   |   +-- page.tsx
|   |   |   |   |-- media/
|   |   |   |   |   |-- BulkOperationsModal.tsx
|   |   |   |   |   |-- FolderModal.tsx
|   |   |   |   |   |-- MediaDetailsPanel.tsx
|   |   |   |   |   |-- MediaGrid.tsx
|   |   |   |   |   |-- MediaManager.tsx
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   +-- UploadModal.tsx
|   |   |   |   |-- orders/
|   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |-- edit/
|   |   |   |   |   |   |   |-- OrderEditor.tsx
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- OrderDetail.tsx
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- OrdersManager.tsx
|   |   |   |   |   +-- page.tsx
|   |   |   |   |-- products/
|   |   |   |   |   |-- [id]/
|   |   |   |   |   |   +-- edit/
|   |   |   |   |   |       +-- page.tsx
|   |   |   |   |   |-- add/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   |-- ProductActions.tsx
|   |   |   |   |   |-- ProductEditor.tsx
|   |   |   |   |   |-- ProductImportModal.tsx
|   |   |   |   |   |-- ProductsHeader.tsx
|   |   |   |   |   |-- ProductsTable.tsx
|   |   |   |   |   +-- ProductsToolbar.tsx
|   |   |   |   |-- settings/
|   |   |   |   |   |-- general/
|   |   |   |   |   |   |-- GeneralSettingsManager.tsx
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- locations/
|   |   |   |   |   |   |-- layout.tsx
|   |   |   |   |   |   |-- LocationSyncPanel.tsx
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- payments/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   +-- PaymentsManager.tsx
|   |   |   |   |   |-- tax/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- tax-classes/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   +-- TaxClassesManager.tsx
|   |   |   |   |   +-- layout.tsx
|   |   |   |   |-- shipping/
|   |   |   |   |   |-- calculator/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- gateways/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |-- edit/
|   |   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- create/
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- methods/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |-- edit/
|   |   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- create/
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- MethodCreateForm.tsx
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   +-- ShippingMethodsManager.tsx
|   |   |   |   |   |-- settings/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- zones/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |-- edit/
|   |   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- create/
|   |   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   |-- ShippingZonesManager.tsx
|   |   |   |   |   |   +-- ZoneCreateForm.tsx
|   |   |   |   |   +-- layout.tsx
|   |   |   |   |-- transactions/
|   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   +-- TransactionDetail.tsx
|   |   |   |   |   |-- refunds/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   +-- RefundsManager.tsx
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   +-- TransactionsManager.tsx
|   |   |   |   |-- users/
|   |   |   |   |   |-- [id]/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   |-- ConfirmDeleteForm.tsx
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   +-- UserEditor.tsx
|   |   |   |   |-- layout.tsx
|   |   |   |   +-- page.tsx
|   |   |   |-- api/
|   |   |   |   |-- account/
|   |   |   |   |   +-- change-password/
|   |   |   |   |       +-- route.ts
|   |   |   |   |-- admin/
|   |   |   |   |   |-- attributes/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |-- values/
|   |   |   |   |   |   |   |   |-- [valueId]/
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- categories/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- locations/
|   |   |   |   |   |   |-- all/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- cities/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- countries/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- states/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- sync/
|   |   |   |   |   |       |-- progress/
|   |   |   |   |   |       |   +-- [id]/
|   |   |   |   |   |       |       +-- route.ts
|   |   |   |   |   |       +-- route.ts
|   |   |   |   |   |-- media/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- bulk/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- folders/
|   |   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- upload/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- orders/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- payments/
|   |   |   |   |   |   |-- env-status/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- gateways/
|   |   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |   |-- methods/
|   |   |   |   |   |   |   |   |   |-- [methodId]/
|   |   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- paypal/
|   |   |   |   |   |       +-- refund/
|   |   |   |   |   |           +-- route.ts
|   |   |   |   |   |-- products/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |-- images/
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |-- media/
|   |   |   |   |   |   |   |   |-- [mediaId]/
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |-- reorder/
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |-- variants/
|   |   |   |   |   |   |   |   |-- [variantId]/
|   |   |   |   |   |   |   |   |   |-- images/
|   |   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |   |-- media/
|   |   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |-- bulk/
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   |-- generate/
|   |   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- bulk/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- export/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- import/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- settings/
|   |   |   |   |   |   |-- general/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- shipping/
|   |   |   |   |   |       +-- route.ts
|   |   |   |   |   |-- shipping/
|   |   |   |   |   |   |-- calculator/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- gateways/
|   |   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- methods/
|   |   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- summary/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- zones/
|   |   |   |   |   |       |-- [id]/
|   |   |   |   |   |       |   +-- route.ts
|   |   |   |   |   |       +-- route.ts
|   |   |   |   |   |-- tax-classes/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- transactions/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   |-- refunds/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   +-- users/
|   |   |   |   |       |-- [id]/
|   |   |   |   |       |   |-- addresses/
|   |   |   |   |       |   |   +-- route.ts
|   |   |   |   |       |   |-- password/
|   |   |   |   |       |   |   +-- route.ts
|   |   |   |   |       |   +-- route.ts
|   |   |   |   |       +-- route.ts
|   |   |   |   +-- auth/
|   |   |   |       +-- [...nextauth]/
|   |   |   |           +-- route.ts
|   |   |   |-- signin/
|   |   |   |   +-- page.tsx
|   |   |   |-- favicon.ico
|   |   |   |-- globals.css
|   |   |   |-- layout.tsx
|   |   |   +-- page.tsx
|   |   |-- components/
|   |   |   |-- ui/
|   |   |   |   |-- alert.tsx
|   |   |   |   |-- alert-dialog.tsx
|   |   |   |   |-- badge.tsx
|   |   |   |   |-- button.tsx
|   |   |   |   |-- card.tsx
|   |   |   |   |-- combobox.tsx
|   |   |   |   |-- command.tsx
|   |   |   |   |-- dialog.tsx
|   |   |   |   |-- dropdown-menu.tsx
|   |   |   |   |-- input.tsx
|   |   |   |   |-- label.tsx
|   |   |   |   |-- modern-overlay.tsx
|   |   |   |   |-- optimized-image.tsx
|   |   |   |   |-- popover.tsx
|   |   |   |   |-- progress.tsx
|   |   |   |   |-- README-modern-overlay.md
|   |   |   |   |-- select.tsx
|   |   |   |   |-- switch.tsx
|   |   |   |   |-- table.tsx
|   |   |   |   +-- textarea.tsx
|   |   |   |-- AdminFilterToolbar.tsx
|   |   |   |-- AdminHeader.tsx
|   |   |   |-- AdminSidebar.tsx
|   |   |   |-- MediaPicker.tsx
|   |   |   |-- MobileMenuButton.tsx
|   |   |   |-- ModernAdminLayout.tsx
|   |   |   |-- PageContainer.tsx
|   |   |   |-- TiptapEditor.tsx
|   |   |   +-- TiptapToolbar.tsx
|   |   |-- lib/
|   |   |   |-- auth.d.ts
|   |   |   |-- auth.ts
|   |   |   |-- db.ts
|   |   |   |-- design-system.ts
|   |   |   |-- location-importer.ts
|   |   |   |-- media-optimizer.ts
|   |   |   |-- r2-storage.ts
|   |   |   |-- tax-classes.ts
|   |   |   +-- utils.ts
|   |   |-- styles/
|   |   |   |-- quill-custom.css
|   |   |   +-- tiptap.css
|   |   +-- types/
|   |       +-- next-auth.d.ts
|   |-- components.json
|   |-- eslint.config.mjs
|   |-- middleware.ts
|   |-- next.config.ts
|   |-- next-env.d.ts
|   |-- package.json
|   |-- package-lock.json
|   |-- pnpm-lock.yaml
|   |-- postcss.config.mjs
|   |-- README.md
|   |-- tsconfig.json
|   +-- tsconfig.tsbuildinfo
|-- store/
|   |-- doc/
|   |-- public/
|   |   |-- file.svg
|   |   |-- globe.svg
|   |   |-- next.svg
|   |   |-- vercel.svg
|   |   +-- window.svg
|   |-- src/
|   |   |-- app/
|   |   |   |-- account/
|   |   |   |   |-- orders/
|   |   |   |   |   |-- [id]/
|   |   |   |   |   |   +-- page.tsx
|   |   |   |   |   +-- page.tsx
|   |   |   |   +-- page.tsx
|   |   |   |-- api/
|   |   |   |   |-- auth/
|   |   |   |   |   |-- [...nextauth]/
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   +-- register/
|   |   |   |   |       +-- route.ts
|   |   |   |   |-- cart/
|   |   |   |   |   |-- items/
|   |   |   |   |   |   |-- [id]/
|   |   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   +-- route.ts
|   |   |   |   |-- categories/
|   |   |   |   |   +-- route.ts
|   |   |   |   |-- checkout/
|   |   |   |   |   |-- payment-methods/
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   |-- place-order/
|   |   |   |   |   |   +-- route.ts
|   |   |   |   |   +-- shipping-options/
|   |   |   |   |       +-- route.ts
|   |   |   |   |-- countries/
|   |   |   |   |   +-- route.ts
|   |   |   |   |-- health/
|   |   |   |   |   +-- route.ts
|   |   |   |   |-- my/
|   |   |   |   |   +-- orders/
|   |   |   |   |       |-- [id]/
|   |   |   |   |       |   +-- route.ts
|   |   |   |   |       +-- route.ts
|   |   |   |   |-- orders/
|   |   |   |   |   +-- [id]/
|   |   |   |   |       +-- route.ts
|   |   |   |   |-- payments/
|   |   |   |   |   +-- paypal/
|   |   |   |   |       |-- capture/
|   |   |   |   |       |   +-- route.ts
|   |   |   |   |       |-- create-order/
|   |   |   |   |       |   +-- route.ts
|   |   |   |   |       +-- refund/
|   |   |   |   |           +-- route.ts
|   |   |   |   +-- products/
|   |   |   |       |-- [id]/
|   |   |   |       |   |-- variants/
|   |   |   |       |   |   +-- route.ts
|   |   |   |       |   +-- route.ts
|   |   |   |       |-- by-slug/
|   |   |   |       |   +-- [slug]/
|   |   |   |       |       +-- route.ts
|   |   |   |       +-- route.ts
|   |   |   |-- cart/
|   |   |   |   +-- page.tsx
|   |   |   |-- catalog/
|   |   |   |   +-- page.tsx
|   |   |   |-- checkout/
|   |   |   |   +-- page.tsx
|   |   |   |-- order/
|   |   |   |   +-- [id]/
|   |   |   |       +-- page.tsx
|   |   |   |-- product/
|   |   |   |   +-- [slug]/
|   |   |   |       |-- page.tsx
|   |   |   |       +-- VariantATC.tsx
|   |   |   |-- signin/
|   |   |   |   +-- page.tsx
|   |   |   |-- signup/
|   |   |   |   +-- page.tsx
|   |   |   |-- favicon.ico
|   |   |   |-- globals.css
|   |   |   |-- layout.tsx
|   |   |   +-- page.tsx
|   |   |-- components/
|   |   |   |-- AddToCart.tsx
|   |   |   |-- BottomBar.tsx
|   |   |   |-- CartDrawer.tsx
|   |   |   |-- CountrySelect.tsx
|   |   |   |-- Header.tsx
|   |   |   |-- ProductCard.tsx
|   |   |   |-- ProductGrid.tsx
|   |   |   |-- Providers.tsx
|   |   |   +-- VariantSelector.tsx
|   |   |-- lib/
|   |   |   |-- api.ts
|   |   |   |-- auth.ts
|   |   |   |-- cart.ts
|   |   |   |-- checkout.ts
|   |   |   |-- db.ts
|   |   |   +-- session.ts
|   |   +-- store/
|   |       +-- cart.ts
|   |-- eslint.config.mjs
|   |-- next.config.ts
|   |-- next-env.d.ts
|   |-- package.json
|   |-- pnpm-lock.yaml
|   |-- postcss.config.mjs
|   |-- README.md
|   +-- tsconfig.json
|-- tools/
|   |-- Export-ProjectStructure.bat
|   +-- Export-ProjectStructure.ps1
|-- backup-plazacms.bat
|-- backup-project.ps1
|-- BACKUP-README.md
+-- setup-auto-backup.ps1
```

_Generated: 2025-09-05 16:51:53_
