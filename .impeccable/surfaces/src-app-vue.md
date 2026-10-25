---
version: 1
slug: "src-app-vue"
primary_target: "src/App.vue"
related_targets: ["src/templates"]
---

## Scope

Whole desktop app (Operate). Two user-selectable templates, each with its own layout over shared stores and logic; a full theme editor (tokens per template and mode, radius, type scale, density, font preset; JSON export/import). Default template: Bakım Defteri. First screen: Paketlerim (installed apps, updates flagged).

## Audience and task

Everyday Windows users who never open a terminal. Most frequent job: see what is out of date and update it. Secondary: install, uninstall, change version. Constraints: TR + EN, light + dark, themeable, console + interactive mode preserved, admin state visible.

## Direction contract

THESIS: Two worlds over one engine. Bakım Defteri treats the installed list as a car service booklet: a ruled record where a completed update earns a violet stamp and an outstanding one shows an empty dashed box. Metro Yönlendirme treats each source as a transit line and each update as a journey between two version stations. Both refuse the category default of shadcn cards with badge clusters and pagination.

OWN-WORLD: Ledger: petrol booklet-cover rail (#123C3F), cool paper ground (#F5F7F6), pale form tint (#E3EEEC) for header bands, ruled 1px rows, record numbers, tracked small-caps labels, violet stamp ink (#4A3AA6) used only for completed updates, amber dashed due boxes, one ink per source. Metro: dark signage band (#2B2E33) with Bahnschrift labels, white ground, line inks (WinGet #00A651, Chocolatey #E2231A, Store #7B2D8E), roundels and station rings, "Buradasınız" marker on the installed version.

STORY: The user opens the app, sees at once how many apps need maintenance, updates all or one, watches progress in place, and understands any failure from its row without a modal.

FIRST VIEWPORT: Ledger: 232px cover rail (nav with counts, admin notice, interactive switch) left; header "Paketlerim" with counts and primary "N güncellemeyi yap" top-right; filter row (status segments, source select, search); full-height ruled table; operations dock at the bottom opening the console drawer. Metro: signage band across the top (nav as signs, global actions, admin state); line sections per source with roundel headers; rows showing version journeys; operations as a station timeline panel.

FORM: Assigned direction 3 of 7 (service booklet) built as template one; user also chose my rank-1 pick (Metro wayfinding) as template two. seed: seed:c12648ba18e793f2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
