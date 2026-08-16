BUILD SPEC: Yardbook Field Intake PWA

Build a single-page, offline-first Progressive Web App (PWA) for a landscape
business owner to replace pen-and-paper customer intake while out at properties.
No build step, no framework, no server — pure static HTML/CSS/JS so it can be
hosted on any static host and installed to an Android home screen. All data lives
on the device (IndexedDB). This is a real, working app — not a stub.

PROJECT LOCATION: the current directory. Create files here.

DELIVERABLES (plain static files, no bundler):
  index.html       — the full app (intake form + saved-list view + export view)
  styles.css       — mobile-first, clean, large touch targets, dark+light safe
  app.js           — all logic: IndexedDB storage, photo capture, export, UI
  manifest.webmanifest — PWA manifest (name, icons, display:standalone, theme)
  sw.js            — service worker: precache app shell + offline-first caching
  icons/icon-192.png, icons/icon-512.png — simple app icons (generate simple ones)
  README.md        — 5 lines: what it is, how to run locally, how to install on Android

FUNCTIONAL REQUIREMENTS:

1. OFFLINE-FIRST
   - Register the service worker so the app loads with no connection.
   - Every entry (including photos) saves to IndexedDB on the device. If the user
     closes the app mid-field, the data stays. No network calls anywhere.

2. THREE DATA SECTIONS on one form (like a paper intake sheet):
   a) CUSTOMER: name, phone, email, street address, city, state, zip, best time to call.
   b) PROPERTY: property address (auto-fill from customer address button), lawn
      condition, lawn size (small/medium/large or sq ft), number of flower beds,
      walkways (none/some/lots), driveway (none/gravel/asphalt/paver), fences,
      obstacles/notes (textarea).
   c) JOB: job type (dropdown: mow, cleanup, mulch, hedge/trim, flower bed install,
      leaf removal, snow, full care package, estimate, other), job date, job status
      (dropdown: lead/estimate/scheduled/quoted), price quote (optional), notes.

3. PHOTOS
   - A camera/photo capture control (mobile <input type="file" accept="image/*"
     capture="environment"> with fallback to gallery). Multiple photos per intake.
   - Photos stored in IndexedDB as blobs; thumbnail previews shown; delete allowed.
   - Photos must survive offline (no external hosting).

4. SAVE + LIST
   - "Save Intake" button writes the whole thing to IndexedDB with a timestamp.
   - A "Saved Intakes" list view shows all entries (tap to open/view). Searchable
     by customer name. Each entry can be deleted.

5. EXPORT (for entering into Yardbook later)
   - Per-entry "Copy Summary" button: copies a clean, human-readable text summary
     of customer + property + job + photos to the clipboard (formatted for pasting
     into Yardbook notes).
   - Per-entry "Download CSV" button: downloads a CSV row of the intake.
   - "Export All CSV" button on the list view: downloads all intakes as one CSV.
   - Show a small toast/confirmation when copied/downloaded.

6. UX
   - Large, thumb-friendly tap targets (min ~44px), readable in sunlight (high
     contrast). Simple wizard-style sections with headers, or one scrolling form —
     your call, but keep it dead simple to use one-handed in the field.
   - Clear success feedback after saving.
   - Header shows app name "Field Intake" and links to the Saved list.

Use modern but widely-supported JS (ES modules not required; a single app.js with
plain functions is fine). IndexedDB via a small promise wrapper. Keep the code
clean and commented. Do not use external CDNs (offline requirement) — everything
must be self-contained. Make icons simple solid-color PNGs.

VERIFY before finishing: the files exist and app.js references match index.html;
confirm the service worker is registered and the manifest is linked. Do not run a
browser. Report the file list you created and a one-paragraph summary.
