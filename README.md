# rera-website

Marketing site and live product catalogue for **Rera Hair Fashion Group** — a salon and
barber equipment wholesaler in Skopje, North Macedonia, running two hair salons and a
wholesale showroom.

Live at **[rera.mk](https://rera.mk)**.

## What it is

A static, four-language site with no framework and no build step. The catalogue page reads
live stock from Firestore, which is populated by the client's separate stock-management app —
showroom staff publish a product by adding it there, not by touching this repo.

Product enquiries open a dialog offering **WhatsApp or Viber**, with the product name
pre-filled, because a good share of customers here use only one of the two.

## Stack

- Vanilla JavaScript (ES5 style, single IIFE, no bundler)
- Hand-written HTML and CSS (Grid/Flexbox, custom properties)
- Firebase Firestore — catalogue data
- Firebase Storage — product images
- Firebase Hosting — deploy, redirects, cache headers
- schema.org JSON-LD — Organization, two HairSalon, one Store

## Layout

```
index.html          Home — hero, studio, catalogue teaser, locations, contact
products.html       Catalogue — live Firestore grid + category filters
404.html            Branded not-found page
assets/css/         Single stylesheet
assets/js/main.js   All behaviour (10 init* modules)
assets/js/i18n.js   EN / MK / SQ / TR dictionaries (100 keys each)
assets/js/firebase-config.js   Public Firebase web config
firebase.json       Hosting config, cache headers
```

## Running locally

No install step. Serve the directory over HTTP — opening `index.html` from the filesystem
will not work, because `main.js` loads the Firebase SDK via dynamic `import()`.

```bash
python -m http.server 8765
# then open http://localhost:8765
```

The catalogue reads the live Firestore project, so products appear locally without extra setup.

## Deploying

```bash
firebase deploy --only hosting
```

`_source/` (4K video originals) and `.firebase/` are excluded from both git and the deploy.

## Localisation

Copy lives in `assets/js/i18n.js`, keyed by language. Markup binds it with `data-i18n`
(text) and `data-i18n-html` (markup allowed). Language persists in `localStorage` and is
reflected in a `?lang=` query param. Product names come from Firestore and are not translated —
they are the client's own stock records.

## A note on the Firebase config

`assets/js/firebase-config.js` is committed on purpose. Firebase web config is a public
identifier, not a credential — it already ships to every visitor of the live site. Access is
governed by Firestore security rules: unauthenticated readers see only the `categories`
collection and a sanitised `public_products` mirror (name, category, image). Raw `products`
records, which carry price, stock quantity and SKU, are staff-only and never reach the web
client.
