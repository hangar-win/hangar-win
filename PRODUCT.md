# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday Windows users who do not know or want the terminal. They open the app to keep the programs on their PC up to date, occasionally to install something new or remove something they no longer use. They should never need to understand what winget, Chocolatey, or a package ID is to get the job done.

## Product Purpose

A desktop GUI that unifies WinGet, Chocolatey, Microsoft Store, and Scoop package management on Windows. The primary job is managing updates: open the app, see what is out of date, update everything or a chosen subset, and trust that it worked. Installing new apps and managing installed apps are secondary jobs. Success means a non-technical user keeps their PC current without opening a terminal.

## Positioning

One place for every package source on Windows: updates, installs, and removals from WinGet, Chocolatey, and MS Store in a single list, without the command line.

## Operating Context

- Windows 10/11 desktop app (Tauri shell, Vue 3 frontend); default window 800×600, resizable.
- Package operations shell out to winget / choco; they are long-running and can fail, hang on prompts, or require administrator rights.
- The app reports whether it is running as administrator; many install/uninstall operations need it.
- Some installers wait for terminal confirmation (license, Y/N); interactive mode exists to handle these.
- Chocolatey and Scoop are optional; they may not be installed on the user's machine.

## Capabilities and Constraints

- Views: Discover (search + popular), Library (installed / updates), Downloads (operation tracking), Package detail, Settings.
- Update one, selected, or all outdated packages; bulk update progress.
- Install, uninstall, change version.
- Filter by source (WinGet, Chocolatey, MS Store, Scoop) and status (needs update, all, current, other); Discover is browsable by hand-picked categories.
- Live console output for running commands, and interactive mode — must be preserved.
- Turkish and English (vue-i18n) — every string in both languages; must be preserved.
- Light and dark themes — both fully supported; must be preserved.
- Parametric theme system with an extension/theme store remains a product goal; theming must stay driven by CSS custom properties so themes can be added.
- Stack is fixed: Tauri 2, Vue 3 + TypeScript, Pinia, Tailwind CSS, shadcn-vue (reka-ui), lucide icons.

## Brand Commitments

- Name: "Hangar" (same in TR and EN). Repository: github.com/hangar-win/hangar-win. Logo asset: `src/assets/logo.png`, app icon `app-icon.svg`.

## Evidence on Hand

- `docs/screenshots/`: current UI (Service Ledger dark, Metro light; TR and EN) captured with sample data, used in README.
- No user testimonials, usage metrics, or download numbers exist; do not fabricate them.

## Product Principles

1. Updates first: the most common visit is "what needs updating?" — answer it immediately.
2. No terminal knowledge required: package IDs, sources, and command output are available but never required to act.
3. Long operations are always visible: the user can see what is running, what finished, and what failed, and why.
4. Safe by default: make admin requirements and destructive actions (uninstall) clear before they happen.
5. Bilingual and themeable without exceptions.
