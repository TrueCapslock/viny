# Viny lists — how they work

> Authoritative reference for the list semantics as of v0.14.1. Anything
> in `prisma/schema.prisma`, the API routes under `src/app/api/`, and the
> UI surfaces under `src/app/` should agree with the rules below; if
> they don't, that file is the bug.

## TL;DR

There are three "list-shaped" things in Viny. They look similar but they
behave very differently:

| | Owner can see | Friend can see | Member can see | Owner can edit | Friend can edit | Member can edit |
|---|---|---|---|---|---|---|
| **Vinskapet** (default cellar) | ✅ | ✅ read-only | ✅ | ✅ | ❌ | ✅ |
| **Custom List** (private) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Shared List** (ad-hoc between friends) | ✅ | ❌¹ | ✅ | ✅ | ❌¹ | ✅ |

¹ "Friend" only counts if that friend is also a SharedListMember of the
specific SharedList. The legacy `POST /api/shared-lists` flow
auto-adds both parties as members, so practically a "Shared List friend"
*is* a member; a plain friend relationship does not grant any visibility
on its own.

---

## Background: what changed and why

Three versions shaped the current model:

- **v0.13.x and prior:** cellar wines lived on `Wine.userId` with
  `sharedListId IS NULL`; sharing was a parallel `ListShare` editor-row
  table that overrode the cell of `Wine.userId` you could edit.
- **v0.14.0:** the cellar became a per-user default `SharedList`
  (named **Vinskapet**). Cellar wines now live in
  `Wine.sharedListId = owner.defaultSharedListId`. Friend relationship
  alone grants *read* of the Vinskapet; `SharedListMember` membership
  grants *write*. `ListShare` was kept on disk for backwards compat
  but was no longer queried.
- **v0.14.1:** the legacy `ListShare` table (and `User.ownedShares` /
  `User.editorShares` relations) were dropped; `prisma/listShare` no
  longer exists in the Prisma client. Cellar storage is now exclusively
  per-user Vinskapet + `SharedListMember`.

So as of v0.14.1, anything that mutates a cellar wine goes through
`SharedListMember`. Anything that reads a cellar wine goes through
either `SharedListMember`, or `Friend` if the wine lives in that
friend's Vinskapet.

---

## The three list concepts

### Vinskapet — the per-user cellar

A **Vinskapet** is the default `SharedList` (named `"Vinskapet"`) that
every User owns exactly one of. The User→SharedList link is the
`User.defaultSharedListId` column (nullable + `@unique`).

There is exactly one Vinskapet per User, and every Vinskapet has at
least one `SharedListMember` row with `role="admin"` pointing at its
owner. The migration that introduced the column backfilled both the
SharedList and the admin membership for every existing user; the
register flow does the same for new users in a single
`prisma.$transaction` so the FK and the admin membership are
guaranteed to land together.

A wine is in a Vinskapet when, simultaneously:

- `Wine.userId = X` (X is the wine's owner),
- `Wine.inCellar = true` (the cellar flag),
- `Wine.sharedListId = X.defaultSharedListId` (the wine lives in X's
  Vinskapet SharedList).

The three rules are kept consistent by `POST /api/viner` (parks cellar
adds in the owner's Vinskapet at create time) and `PUT/PATCH
/api/viner/[id]` (flips `sharedListId` when `inCellar` toggles across
the Vinskapet boundary — see *How inCellar maps to Vinskapet* below).

### Custom List — the per-user private collection

A **Custom List** is a user-owned grouping container that references
wines the user has access to. Schema:

- `List(id, name, userId, …)` — one row per custom list, `userId` is
  the owner.
- `ListWine(listId, wineId, addedAt)` — many-to-many join.

A wine can be referenced by any number of Custom Lists regardless of
whether it's in a Vinskapet or in an explicit Shared List. Custom
Lists are **strictly owner-private**: a friend has no read or write
access to your Custom Lists. They live independently of the Vinskapet
and of any Shared List.

Concretely:

- `GET /api/lists` returns only `List.userId = caller`.
- `POST /api/lists {name, addWineId}` creates a list; if `addWineId`
  is given and `canAccessWine(addWineId, caller)` returns the wine, the
  join row is created.
- `POST /api/viner/[id]/lists {listId}` adds a wine you can access to
  one of your own lists.
- `DELETE /api/viner/[id]/lists/{listId}` removes the join.

Custom List membership doesn't change `Wine.sharedListId`. Adding a
wine to a Custom List is purely a reference; the wine's ownership and
edit permissions still derive from `Wine.sharedListId` (or lack
thereof).

### Shared List — the ad-hoc explicit sharing

A **Shared List** is a `SharedList` that isn't a Vinskapet and
therefore has two-or-more `SharedListMember` rows for separate users.
These are created by:

- The legacy `POST /api/shared-lists {friendUserId, mode}` flow that
  creates a brand-new `SharedList` with both users as members and
  transfers a subset of wines (`userId IN (...) AND sharedListId IS
  NULL`) into it. After v0.14.0 there are typically few or no such
  wines, because cellar wines have already been routed into
  Vinskapets and Custom List wines are owner-only — see the
  *Caveats* section below for the practical impact.

Either side of a Shared List sees it through `GET /api/viner?userId=X`,
which surfaces wines in any Shared List where both viewer and owner
are members.

---

## Storage model

```
┌─────────────────────────────────────────────────────────────────┐
│                              User                                │
│  defaultSharedListId?    ──────────────┐                          │
│  other relations…                     │  (1)                      │
└─────────────────────────────────────┼──────────────────────────┘
                                      │
                                      ▼
                            ┌────────────────────┐
                            │   SharedList       │
                            │   name = "Vinskapet"│ ← "your" cellar
                            │   id               │
                            └────┬──────────┬────┘
                                 │          │
                  (2) members:   │          │ wines:
                                 ▼          ▼
                  ┌─────────────────────┐  ┌─────────────────────┐
                  │  SharedListMember   │  │       Wine          │
                  │  userId  role       │  │  userId              │
                  │  (one row per       │  │  sharedListId? ◀─────┘
                  │   access grant)     │  │  inCellar            │
                  └─────────────────────┘  │  …                  │
                                          └──────────┬──────────┘
                                                     │
                                                     │ (n:n via)
                                                     ▼
                                          ┌─────────────────────┐
                                          │    List (private)   │
                                          └──────────┬──────────┘
                                                     ▼
                                          ┌─────────────────────┐
                                          │     ListWine        │
                                          └─────────────────────┘
```

- **(1)** `User.defaultSharedListId` — nullable `@unique` FK to
  SharedList; ON DELETE SET NULL.
- **(2)** `SharedListMember(userId, sharedListId, role)` with
  `@@unique([sharedListId, userId])` — owner always has admin role.

`Wine.sharedListId` is NOT a custom-list pointer. Custom lists are
joined via `ListWine`; a wine's `sharedListId` either points at the
owner's Vinskapet (cellar), points at some explicit SharedList (ad-hoc
sharing), or is `NULL` (the wine is just a record, possibly referenced
by Custom Lists).

---

## Read permissions

Read access is decided by `canAccessWine` (in
`src/app/api/viner/[id]/route.ts`, mirrored in `/api/lists`,
`/api/viner/[id]/lists`, and the detail page). For a wine `W` with
`W.userId = X` and a viewer `Y`:

| Y vs X relationship | W.sharedListId == X.defaultSharedListId (W in X's Vinskapet) | W.sharedListId set, not X's Vinskapet (W in some Other SharedList) | W.sharedListId NULL (custom-list wine) |
|---|---|---|---|
| **Y == X (owner)** | ✅ | ✅ | ✅ |
| **Y is X's accepted Friend** | ✅ read-only | ❌ | ❌ |
| **Y is SharedListMember of W.sharedListId** | ✅ | ✅ | ❌ |

The friend rule's "W.sharedListId == X.defaultSharedListId" clause is
load-bearing — without it, a friend viewing X's profile would see
*every* wine X owns, including the ones tucked into an explicit
SharedList that wasn't meant for them. The clause scopes friend
read-access to **only** wines parked in X's Vinskapet.

Custom-list wines (W.sharedListId NULL) are not visible to anyone
except the owner. They are not visible on `/venner/[id]`, not visible
via `GET /api/viner?userId=X` from a friend's account, not visible on
any shared SharedList. That's a hard rule and a friend cannot see them
under any circumstance.

The friend-view GET filter in `src/app/api/viner/route.ts` reflects
this:

```ts
const wines = await prisma.wine.findMany({
  where: {
    OR: [
      // Own custom-list wines (gated on own view only).
      ...(isOwnView ? [{ userId: ownerId, sharedListId: null }] : []),
      // Owner's Vinskapet wines — visible to self, members, and friends.
      ...(owner.defaultSharedListId
        ? [{ userId: ownerId, sharedListId: owner.defaultSharedListId }]
        : []),
      // Explicit shared lists where both viewer and owner are members.
      { sharedListId: { in: coMemberedSharedLists.map((sl) => sl.id) } },
    ],
  },
  …
})
```

The `coMemberedSharedLists` clause fetches every `SharedList` that has
both `userId = viewer` and `userId = owner` in its `SharedListMember`
table. In practice this catches Vinskapets that the viewer has been
invited to contribute to (since adding the viewer as a member of the
owner's Vinskapet already implies viewer-side membership) PLUS any
explicit ad-hoc SharedList. The dedicated Vinskapet clause above is a
belt-and-suspenders because friends without membership also have
read-access there.

---

## Write permissions

Write (CellarToggle, PUT/PATCH/DELETE on a wine, posts on a friend's
behalf) is decided by `canEditWine` and owner/member checks in:

- `src/app/api/viner/route.ts` POST
- `src/app/api/viner/[id]/route.ts` PUT/PATCH/DELETE
- `src/app/api/viner/[id]/page.tsx` (hides the CellarToggle UI when
  `canEdit=false`)
- `src/app/api/smaking/route.ts` POST (tasting notes)
- `src/app/api/lists/route.ts` and `src/app/api/viner/[id]/lists/route.ts`
  (custom-list membership)

For a wine `W` with `W.userId = X` and an editor `Y`:

- Y == X → ✅
- W.sharedListId is set AND Y is a `SharedListMember` of that
  `sharedListId` → ✅
- Otherwise → ❌

The "if W.sharedListId is set AND Y is a member" branch covers every
write path. Custom-list wines (W.sharedListId null) are owner-only —
no friend or member can edit a custom-list wine, because there's no
SharedList the friend/member is on that would grant that permission.

`POST /api/viner?userId=X` creates a wine *on someone's behalf*. The
gate is "caller is a SharedListMember of X's Vinskapet". The cellared
wine is then parked in X's Vinskapet (`Wine.sharedListId =
X.defaultSharedListId`), so:

- A friend (without membership) who tries to POST a cellar wine on
  X's behalf gets `403 Ikke tilgang`.
- A member succeeds and the wine now lives in X's Vinskapet with the
  editor being the byline (because `Wine.userId = X`, not the
  editor). The wine's owner is still X.

This asymmetry — "member can add wines to X's Vinskapet but the
member doesn't own them" — is the explicit semantic of the
"if users have shared list they all add to that list, if you are just
friends then you can see their list but you dont add wine to it"
directive that shaped v0.14.0.

---

## Sharing flows

### Sharing your Vinskapet with a friend (and revoking)

Sequence for User A → User B:

1. **Become friends.** A and B must have a `Friend` row with
   `status="accepted"` (this is set up by `POST /api/friends` followed
   by `PUT /api/friends/[id]` to accept).
2. **A invites B to the Vinskapet.** `POST /api/friends/share
   {friendUserId: B.id}`. The route:
   - Validates the friendship.
   - Reads A's Vinskapet (`A.defaultSharedListId`).
   - Inserts a `SharedListMember(sharedListId = A.defaultSharedListId,
     userId = B.id, role = "member")` row, returning `409` if the
     row already exists.
3. **B is now a member with write access.** From this point on, B can
   POST to `/api/viner?userId=A`, PATCH `/api/viner/[id]`'s CellarToggle
   metadata through the wine's Vinskapet, etc.
4. **A revokes.** `DELETE /api/friends/share {friendUserId: B.id}`. The
   route simply drops the membership row.

Before step 2, B has read-only access to A's Vinskapet (friend rule).
After step 2, B has write access. After step 4, B drops back to
read-only. After step 4 plus an actual friendship delete, B has no
visibility into A's wines.

### Sharing an ad-hoc Shared List (the legacy flow)

Even after v0.14.1, the explicit bidirectional `POST /api/shared-lists`
route still works:

- `POST /api/shared-lists {friendUserId: B.id, mode: "mine"|"theirs"|"merge"}`
  creates a brand-new SharedList, adds both A and B as `SharedListMember`
  rows (A admin, B member), and then transfers matching wines into the
  new list.

The transferred wines are filtered by `userId IN (..., ...) AND
sharedListId IS NULL`. After v0.14.0 the only wines this catches are
custom-list wines with `inCellar=false, sharedListId=NULL`. Cellar
wines already live in each user's Vinskapet, so this flow is
essentially "create a SharedList shell, optionally transfer orphan
custom-list wines". The flow is preserved for compatibility but is
not the primary collaboration model anymore.

### Sharing a Custom List (you cannot)

Custom Lists are strictly owner-private. There is no API that adds
another user as a viewer of a Custom List. If you want someone else
to see a wine, the only paths are:

1. Add the wine to your Vinskapet (then they see it via the friend
   rule, read-only), or
2. Add the wine to an explicit Shared List you've both joined (then
   they see it via the co-membered clause).

---

## How inCellar maps to Vinskapet

The `inCellar` boolean and the Vinskapet residency live in lockstep:

| Mutation | Old `Wine.sharedListId` | New `Wine.sharedListId` | `Wine.inCellar` |
|---|---|---|---|
| **POST `/api/viner` with `inCellar=true`** | — (new) | `owner.defaultSharedListId` | true |
| **POST `/api/viner` with `inCellar=false`** | — (new) | NULL | false |
| **PATCH `/api/viner/[id]` `inCellar=true`** | NULL **or** `owner.defaultSharedListId` | `owner.defaultSharedListId` | true |
| **PATCH `/api/viner/[id]` `inCellar=true`** | some other SharedList | *unchanged* | true |
| **PATCH `/api/viner/[id]` `inCellar=false`** | `owner.defaultSharedListId` | NULL | false |
| **PATCH `/api/viner/[id]` `inCellar=false`** | some other SharedList | *unchanged* | false |

This contract is enforced by `resolveCellarSharedListUpdate` in
`src/app/api/viner/[id]/route.ts`:

```ts
if (inCellar) {
  // Move into the Vinskapet only if currently unshared or already in the
  // Vinskapet. Don't touch wines in an explicit SharedList.
  if (existing.sharedListId === null || existing.sharedListId === vinskapId) {
    return { sharedListId: vinskapId }
  }
  return null
} else {
  // Pull out of the Vinskapet only if currently parked there.
  if (vinskapId !== null && existing.sharedListId === vinskapId) {
    return { sharedListId: null }
  }
  return null
}
```

The "don't touch wines in an explicit SharedList" rule means a wine
that lives in a friend-to-friend shared list keeps its `sharedListId`
intact across cellaring toggles. That's intentional: someone could
share a wine across two friends via the legacy flow, then decide to
also keep it on their physical shelf, and the two facts are kept
orthogonal.

---

## API endpoints

### Viner

| Method + path | Auth | Effect |
|---|---|---|
| `GET /api/viner` | caller | Returns wines: own Vinskapet + own custom-list wines + shared lists I'm in. |
| `GET /api/viner?userId=X` | caller (must be a friend of X) | Returns X's Vinskapet wines + co-membered SharedList wines. |
| `POST /api/viner` | caller | Creates a wine owned by caller; if `inCellar=true`, parks in caller's Vinskapet. |
| `POST /api/viner?userId=X` | caller (must be a SharedListMember of X's Vinskapet) | Creates a wine owned by X; if `inCellar=true`, parks in X's Vinskapet. |
| `GET /api/viner/[id]` | owner / SharedListMember / friend (Vinskapet only) | Returns the wine + tastings + sharedList metadata. |
| `PUT /api/viner/[id]` | owner / SharedListMember | Edits metadata, flips `sharedListId` on inCellar boundary-cross. |
| `PATCH /api/viner/[id]` | owner / SharedListMember | Toggles inCellar + flips `sharedListId` on boundary-cross. |
| `DELETE /api/viner/[id]` | owner / SharedListMember | Deletes the wine. |

### Custom lists

| Method + path | Auth | Effect |
|---|---|---|
| `GET /api/lists` | caller | Returns caller's Custom Lists. |
| `POST /api/lists {name, addWineId?}` | caller | Creates a Custom List owned by caller; optionally adds a wine. |
| `GET /api/lists/[id]` | caller | Returns a Custom List with wine references. |
| `PUT /api/lists/[id]` | caller | Updates name. |
| `DELETE /api/lists/[id]` | caller | Deletes the Custom List. |
| `GET /api/viner/[id]/lists` | caller | Lists which of caller's Custom Lists contain this wine. |
| `POST /api/viner/[id]/lists {listId}` | caller (must own the list) | Adds wine to a Custom List. |
| `DELETE /api/viner/[id]/lists/{listId}` | caller (must own the list) | Removes wine from a Custom List. |

### Friends + sharing

| Method + path | Auth | Effect |
|---|---|---|
| `GET /api/friends` | caller | Returns accepted friends, with `canEdit` (= am I a member of friend's Vinskapet) and `sharedList` (= do we share any explicit SharedList). |
| `POST /api/friends {email}` | caller | Sends a friend request. |
| `PUT /api/friends/[id]` | the addressee | Accepts a friend request. |
| `DELETE /api/friends/[id]` | either party | Removes the friendship. |
| `POST /api/friends/share {friendUserId}` | caller (must be friend of target) | Adds target as `SharedListMember` of caller's Vinskapet. |
| `DELETE /api/friends/share {friendUserId}` | caller | Removes target as `SharedListMember`. |
| `POST /api/shared-lists {friendUserId, mode}` | caller (must be friend of target) | Creates a brand-new SharedList with both users as members; transfers matching orphan wines. |

### Cellar toggle (UI)

The `CellarToggle` component (`src/app/_components/cellar-toggle.tsx`)
is just a small wrapper around `PATCH /api/viner/[id] {inCellar,
quantity}`. The visibility of the button itself is decided in
`/app/viner/[id]/page.tsx`:

- `canEdit === isOwner || isMember(sharedListId)` → render button.
- Otherwise → no button. The friend viewer sees the wine but cannot
  toggle the cellar.

---

## UI surfaces

### `/` — your wines list (your Vinskapet + your Custom Lists)

Renders the result of `GET /api/viner` sorted by `createdAt desc`.
Wines display chips (country/region/type), tasting count, and — if
`wine.inCellar` — a small cellar badge. Tab filters `"Alle"`,
`"Vinskapet"`, `"Custom"` filter the rendered set on the client:

- Alle: everything.
- Vinskapet: `wine.inCellar === true`.
- Custom: wines that aren't in any Vinskapet (custom-list wines and
  explicit shared-list wines that the viewer belongs to).

This view is caller-only.

### `/venner` — friends index

Renders `GET /api/friends`. Each accepted friend is shown with their
name, an avatar, and two boolean flags from the API:

- `canEdit` — you are a `SharedListMember` of *their* Vinskapet.
  Behind this: `await prisma.sharedListMember.findMany({where:
  {sharedListId: me.defaultSharedListId, userId: …}})`.
- `sharedList` — you and the friend share any explicit `SharedList`.

A "Del liste" button under each friend triggers the Vinskapet-share
POST unless you're already a member; a "..." or similar handles
un-share.

### `/venner/[id]` — friend's wines view

Renders `GET /api/viner?userId={id}`. Because of the friend filter
described above, only the friend's Vinskapet wines (and any
co-membered explicit Shared Lists) appear — never their custom-list
wines.

The detail-page back-button on these cards uses the `from=...` URL
query param carried through `WineCard.from`, so navigating into a
wine and back round-trips to `/venner/[id]` rather than `/`.

### `/lister` — your Custom Lists index

Renders `GET /api/lists`. A small form (`<input placeholder="Ny
vinliste…"> + "Opprett"`) POSTs to `/api/lists` and navigates into
the new detail page.

### `/lister/[id]` — your Custom List detail

Renders a list of the wines reachable through the `ListWine` join.
Empty state shows "Ingen lister ennå" until the user adds a wine.

### `/viner/[id]` — wine detail page

Header photo + identity + Detaljer + Smaksnotater. Two action pills
straddle the hero:

- **CellarToggle** (left, when `canEdit === true`): toggles `inCellar`,
  flipped into the Vinskapet as needed.
- **AddToListButton** (right, always visible to viewers who have
  access to the wine): opens the Custom Lists dialog — the viewer
  can pick one of *their own* Custom Lists to add the wine to.
  Reading-and-writing is asymmetric: a friend can read a Vinskapet
  wine but cannot add it to a friend's Custom List (Custom Lists are
  owner-private).

### `/viner/ny` — new wine form

Form fields (name, producer, vintage, varietal, region, country,
type, notes) plus an inCellar toggle. Save POSTs to `/api/viner`,
which parks the wine in the caller's Vinskapet exactly when
`inCellar === true`.

---

## Permission matrix (one-pager)

| Action | Owner A | Friend (not member) | Member of A's Vinskapet |
|---|---|---|---|
| See `GET /api/viner?userId=A` Vinskapet wines | ✅ | ✅ | ✅ |
| See `GET /api/viner?userId=A` custom-list wines | ✅ | ❌ | ❌ |
| Add wine to A's Vinskapet (POST with `?userId=A`) | ✅ | ❌ | ✅ |
| Toggle cellar on a wine (PATCH) | ✅ | ❌ | ✅ |
| Edit wine metadata (PUT) | ✅ | ❌ | ✅ |
| Delete a wine (DELETE) | ✅ | ❌ | ✅ |
| Add tasting note (POST /api/smaking on A's wine) | ✅ | ❌ | ✅ (member) |
| Add wine to A's Custom List | ❌ — Custom Lists are owner-private across the board | ❌ | ❌ |
| See the CellarToggle UI on `/viner/[id]` | ✅ | ❌ | ✅ |
| See the AddToListButton UI on `/viner/[id]` | ✅ (own lists) | ✅ (own lists — friend can curate *their own* lists using wines they have access to) | ✅ (own lists) |
| Add my Vinskapet wine to my own Custom List | ✅ | ✅ — friend can add *my* Vinskapet wines into *their* Custom Lists via `POST /api/viner/[id]/lists` | ✅ |

The last row is the "asymmetric reference" pattern: a friend who has
read-access to my Vinskapet wines can pin some of them onto *their
own* Custom Lists without owning them. The wine's `Wine.userId` still
points at me.

---

## What you can and can't do today

Things that **work**:

- Per-user Vinskapet with auto-created default SharedList on register.
- Friend sees the Vinskapet wines for the friend view at `/venner/[id]`.
  Custom-list wines are correctly hidden from the friend view.
- `POST /api/friends/share` adds/remove a friend as a SharedListMember
  of your Vinskapet; the friend gains write access.
- CellarToggle hides for non-editor viewers.
- The detail-page back-button respects the originating list (carries
  through `WineCard.from`).
- The v0.14.0 friend-view contract is pinned by
  `e2e/vinskapet.spec.ts`.

Things that **do not exist** (and were deliberately not added in
v0.14.x):

- **Custom-list sharing.** A Custom List is owner-private full stop.
  No "share my Custom List with a friend" API exists. If you want a
  friend to see a curated set of wines, the supported path is to
  put them in your Vinskapet and share that.
- **Removing a single wine from a friend's Vinskapet.** A member can
  toggle `inCellar=false` or `PATCH sharedListId` but the wine record
  still exists, owned by the Vinskapet's owner.
- **Multi-list deletion of a Shared List.** Once a Shared List is
  created via `/api/shared-lists`, there's no symmetric "leave this
  Shared List" route; the work-around is to delete individual wines
  from the list (which the SharedListMember can do per the edit
  rules above).
- **Vinskapet rename.** A long-standing TODO is letting users rename
  their Vinskapet. Currently the `name="Vinskapet"` is hard-coded in
  the register migration and never edited.

Things that **work but are cumbersome**:

- The legacy `/api/shared-lists` flow under v0.14.x transfers only
  custom-list wines (the cellar wines have already been routed into
  each user's Vinskapet at create time). This was the right migration
  step but it makes the "merge" mode of `/api/shared-lists` mostly
  empty. The flow itself stays available for backward compatibility
  but a future cleanup may decide to retire it.

---

## Where to look in the code

- `prisma/schema.prisma` — User.defaultSharedListId, the absence of
  ListShare, SharedList/SharedListMember/Wine/List/ListWine/Tasting
  shapes.
- `prisma/migrations/20260703235530_add_default_shared_list` —
  the per-user-Vinskapet backfill + the legacy-ListShare replay.
- `prisma/migrations/20260704002304_drop_list_share` — drops the
  legacy table.
- `src/app/api/register/route.ts` — creates Vinskapet in the same
  transaction as the new User.
- `src/app/api/viner/route.ts` — GET filter (friend visibility of
  Vinskapet) + POST cellar-park.
- `src/app/api/viner/[id]/route.ts` — `canAccessWine`, `canEditWine`,
  `resolveCellarSharedListUpdate`.
- `src/app/api/friends/share/route.ts` — `SharedListMember` add/remove
  on your Vinskapet.
- `src/app/api/friends/route.ts` — derives `canEdit` per friend via
  membership lookup against your Vinskapet (the legacy ListShare
  derivation this replaced in v0.14.0).
- `src/app/api/lists/route.ts`, `src/app/api/lists/[id]/route.ts`,
  `src/app/api/viner/[id]/lists/route.ts` — Custom Lists.
- `src/app/api/shared-lists/route.ts` — the legacy bidirectional
  SharedList flow.
- `src/app/_components/cellar-toggle.tsx`,
  `src/app/_components/add-to-list-button.tsx`,
  `src/app/_components/wine-card.tsx` — the UI primitives that route
  through these APIs.
- `e2e/vinskapet.spec.ts` — the smoke-test that pins the friend-view
  contract (Vinskapet visible, custom-list wines hidden).

If anything in this document disagrees with what those files actually
do, the files are the truth and the doc is wrong — open an issue or
patch the doc.
