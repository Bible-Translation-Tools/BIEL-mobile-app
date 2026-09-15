# Force Offline Mode — revert checklist

Temporary developer toggle in **Menu → System Settings** that simulates no internet.

It is **session-only** (no DB, no persisted preference, no new packages). When removing it, use this checklist so nothing is left behind.

Grep for leftovers after removal:

```text
forceOffline|force-offline|ForceOffline|assertNetworkAvailable|isForceOffline|setForceOffline|offline\.title|offline\.subtitle
```

## 1. Delete the store

- [ ] Delete `src/stores/force-offline-store.ts`

## 2. Remove network gate

- [ ] `src/api/graphql/client.ts`
  - Remove `isForceOffline` import
  - Remove `NETWORK_UNAVAILABLE_MESSAGE`
  - Remove `assertNetworkAvailable()` and its call from `graphqlRequest`
- [ ] `src/api/services/content-fetch.ts`
  - Remove `assertNetworkAvailable` import
  - Remove `assertNetworkAvailable()` call from `fetchRenderedContent`

## 3. Remove UI

- [ ] `src/components/home/system-settings-menu.tsx`
  - Remove `Switch` import if unused
  - Remove `setForceOffline` / `useForceOffline` import
  - Remove `forceOffline` state usage
  - Remove the Force Offline Mode `Pressable` / switch block
  - Remove `offlineOption` style

## 4. Remove reactive hook wiring

These only exist so screens refresh when the toggle flips.

- [ ] `src/hooks/use-languages.ts`
  - Remove `useForceOffline` import
  - Remove `forceOffline` / `prevForceOfflineRef`
  - Restore catalog load to ignore force-offline reload
- [ ] `src/hooks/use-books.ts`
  - Remove `useForceOffline` import
  - Remove `forceOffline` from `refetch` deps
- [ ] `src/hooks/use-book-chapters.ts`
  - Remove `useForceOffline` import
  - Remove `forceOffline` cache-clear effect and dep usage
- [ ] `src/hooks/use-chapter-has-audio.ts`
  - Remove `useForceOffline` import
  - Remove `forceOffline` from effect deps

## 5. Remove copy

Delete the `settings.offline` block from each locale:

- [ ] `src/locales/en.json`
- [ ] `src/locales/es.json`
- [ ] `src/locales/fr.json`
- [ ] `src/locales/de.json`
- [ ] `src/locales/pt.json`
- [ ] `src/locales/ru.json`
- [ ] `src/locales/zh.json`
- [ ] `src/locales/vi.json`
- [ ] `src/locales/hi.json`
- [ ] `src/locales/id.json`

## 6. Keep (not toggle-specific)

Do **not** undo these when removing the toggle:

- Real offline architecture in [offline-mode.md](./offline-mode.md)
- Drawer `ScrollView` in `settings-drawer.tsx` (general layout)
- Downloads Library / local scripture & audio storage

## 7. Verify

- [ ] Grep shows no remaining force-offline symbols
- [ ] App boots; System Settings shows only theme options
- [ ] Languages / books / chapter content still load online
- [ ] Downloaded content still works without network
