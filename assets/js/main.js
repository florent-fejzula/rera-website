(function () {
  'use strict';

  var WHATSAPP_PHONE = '38978500737';
  var VIBER_PHONE = '+38978500737';
  var FOUNDED_YEAR = 1996;

  // Hero background clips, played in order and looped. Add the second file
  // here to start the rotation — with a single entry the hero just loops it.
  var HERO_CLIPS = [
    'assets/video/hero-01-barbershop.mp4',
    'assets/video/hero-02-salon.mp4'
  ];
  var FLAG_CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
  function flagUrl(flagCode) { return FLAG_CDN + flagCode + '.svg'; }
  var LANG_KEY = 'rera-lang';
  var SUPPORTED = (window.RERA_I18N && window.RERA_I18N.languages.map(function (l) { return l.code; })) || ['en'];
  var DICT = (window.RERA_I18N && window.RERA_I18N.translations) || {};

  var FIREBASE_SDK_VERSION = '12.17.1';
  var catalogue = { categories: [], products: [], loading: false, loaded: false, error: null };
  var activeLang = 'en';

  var currentFilter = 'all';
  // Element that opened the contact-choice modal, so focus returns to it on close.
  var contactModalTrigger = null;

  function detectInitialFilter() {
    try {
      var params = new URLSearchParams(window.location.search);
      var cat = params.get('cat');
      if (cat) return cat;
    } catch (e) {}
    return 'all';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Fetches the public-safe catalogue (name/category/image only — no price,
  // no stock) from Firestore. Runs once; renderCategoryFilters/renderProducts
  // re-render from the cached result on every language switch.
  function loadCatalogue() {
    var grid = document.getElementById('products-grid');
    if (!grid || catalogue.loading || catalogue.loaded) return;
    catalogue.loading = true;

    var base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_SDK_VERSION + '/';
    Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js')])
      .then(function (mods) {
        var appMod = mods[0], fsMod = mods[1];
        var app = appMod.initializeApp(window.RERA_FIREBASE_CONFIG);
        var db = fsMod.getFirestore(app);

        var catQuery = fsMod.query(fsMod.collection(db, 'categories'), fsMod.orderBy('name'));
        var prodQuery = fsMod.query(fsMod.collection(db, 'public_products'), fsMod.orderBy('createdAt', 'desc'));

        return Promise.all([fsMod.getDocs(catQuery), fsMod.getDocs(prodQuery)]);
      })
      .then(function (snaps) {
        var catSnap = snaps[0], prodSnap = snaps[1];
        catalogue.categories = catSnap.docs.map(function (d) { return d.data().name; }).filter(Boolean);
        catalogue.products = prodSnap.docs.map(function (d) {
          var data = d.data();
          return { id: d.id, name: data.name || '', category: data.category || '', image: data.image || null };
        });
      })
      .catch(function (e) {
        catalogue.error = e;
      })
      .finally(function () {
        catalogue.loading = false;
        catalogue.loaded = true;
        renderCategoryFilters(activeLang);
        renderProducts(activeLang);
      });
  }

  function renderCategoryFilters(lang) {
    var wrap = document.getElementById('filters');
    if (!wrap || !catalogue.loaded) return;

    var validCats = ['all'].concat(catalogue.categories);
    var matched = validCats.filter(function (c) { return c.toLowerCase() === String(currentFilter).toLowerCase(); })[0];
    currentFilter = matched || 'all';

    var buttons = ['<button class="filter" data-cat="all">' + escapeHtml(t(lang, 'products.filter_all')) + '</button>'];
    catalogue.categories.forEach(function (name) {
      buttons.push('<button class="filter" data-cat="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>');
    });
    wrap.innerHTML = buttons.join('');
    initFilters();
  }

  function detectLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = params.get('lang');
      if (fromUrl && SUPPORTED.indexOf(fromUrl) !== -1) return fromUrl;
    } catch (e) {}
    try {
      var stored = window.localStorage.getItem(LANG_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {}
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (SUPPORTED.indexOf(nav) !== -1) return nav;
    return 'en';
  }

  function get(obj, path) {
    return path.split('.').reduce(function (acc, k) { return acc && acc[k] !== undefined ? acc[k] : undefined; }, obj);
  }

  function t(lang, path) {
    var val = get(DICT[lang], path);
    if (val === undefined) val = get(DICT.en, path);
    return val === undefined ? '' : val;
  }

  function waLink(phone, message) {
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  }

  // viber://chat is an unofficial but widely-used convention (Viber never
  // documents personal-number deep links, only bot/public-account ones) — it
  // works when the number has Viber, but unlike wa.me there's no web fallback
  // if the Viber app isn't installed. The + is percent-encoded defensively;
  // some URI handlers treat a raw "+" in a query string as a space.
  function viberLink(phone, message) {
    return 'viber://chat?number=' + encodeURIComponent(phone) + '&text=' + encodeURIComponent(message);
  }

  function applyStaticTranslations(lang) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = t(lang, el.getAttribute('data-i18n'));
      if (typeof val === 'string') el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var val = t(lang, el.getAttribute('data-i18n-html'));
      if (typeof val === 'string') el.innerHTML = val;
    });
  }

  function updateWhatsappLinks(lang) {
    var generic = t(lang, 'common.whatsapp_message_generic');
    document.querySelectorAll('[data-whatsapp="generic"]').forEach(function (el) {
      el.setAttribute('href', waLink(WHATSAPP_PHONE, generic));
    });
  }

  function renderMarquee(lang) {
    var track = document.getElementById('category-strip-track');
    if (!track) return;
    var items = t(lang, 'home.marquee');
    if (!Array.isArray(items)) return;
    track.innerHTML = items.map(function (item) {
      return '<span class="category-strip-item">' + item + '</span>';
    }).join('');
  }

  function bindImgLoad(wrap) {
    var img = wrap.querySelector('img');
    // No <img> (product has no photo) — settle the skeleton so it stops shimmering.
    if (!img) { wrap.classList.add('loaded'); return; }
    if (img.complete && img.naturalWidth > 0) {
      wrap.classList.add('loaded');
      return;
    }
    img.addEventListener('load', function () { wrap.classList.add('loaded'); });
    img.addEventListener('error', function () { wrap.classList.add('loaded'); });
  }

  function renderProducts(lang) {
    var grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!catalogue.loaded) {
      grid.innerHTML = '<p class="catalogue-status">' + escapeHtml(t(lang, 'products.loading')) + '</p>';
      return;
    }
    if (catalogue.error) {
      grid.innerHTML = '<p class="catalogue-status">' + escapeHtml(t(lang, 'products.load_error')) + '</p>';
      return;
    }
    if (!catalogue.products.length) {
      grid.innerHTML = '<p class="catalogue-status">' + escapeHtml(t(lang, 'products.empty')) + '</p>';
      return;
    }

    var ctaLabel = t(lang, 'products.cta_inquire');

    grid.innerHTML = catalogue.products.map(function (p) {
      var imgHtml = p.image
        ? '<img class="product-img" loading="lazy" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '">'
        : '<div class="product-img product-img-placeholder"></div>';

      return (
        '<article class="product" data-cat="' + escapeHtml(p.category) + '">' +
          '<div class="product-img-wrap img-wrap">' + imgHtml + '</div>' +
          (p.category ? '<span class="product-cat">' + escapeHtml(p.category) + '</span>' : '') +
          '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
          // A button, not a link — it opens the WhatsApp/Viber choice modal
          // rather than jumping straight to WhatsApp (some customers only
          // have Viber). Product name travels via data-attribute so the
          // click handler can build the enquiry message for either app.
          '<button type="button" class="product-cta" data-product-name="' + escapeHtml(p.name) + '">' + ctaLabel + ' →</button>' +
        '</article>'
      );
    }).join('');

    grid.querySelectorAll('.img-wrap').forEach(bindImgLoad);
    grid.querySelectorAll('.product-cta').forEach(bindProductCta);
    applyFilter(currentFilter);
  }

  function applyFilter(cat) {
    currentFilter = cat;
    var shown = 0;
    document.querySelectorAll('.product').forEach(function (p) {
      var match = (cat === 'all' || p.dataset.cat === cat);
      p.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    // A category with no stock yet would otherwise render an empty void.
    var grid = document.getElementById('products-grid');
    if (!grid) return;
    var note = grid.querySelector('.catalogue-empty-filter');
    if (!shown && catalogue.products.length) {
      if (!note) {
        note = document.createElement('p');
        note.className = 'catalogue-status catalogue-empty-filter';
        grid.appendChild(note);
      }
      note.textContent = t(activeLang, 'products.empty');
    } else if (note) {
      note.remove();
    }
  }

  function initFilters() {
    var filters = document.querySelectorAll('.filter');
    if (!filters.length) return;
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () { applyFilter(btn.dataset.cat); });
    });
  }

  function bindProductCta(btn) {
    btn.addEventListener('click', function () {
      openContactModal(btn.dataset.productName, btn);
    });
  }

  // WhatsApp/Viber choice modal (Products page only — some customers have
  // only one of the two apps). Elements are re-queried on every call rather
  // than cached, matching how the rest of this file treats the catalogue DOM.
  function openContactModal(productName, triggerEl) {
    var modal = document.getElementById('contact-modal');
    if (!modal) return;
    var titleEl = document.getElementById('contact-modal-title');
    var waBtn = document.getElementById('contact-modal-whatsapp');
    var viberBtn = document.getElementById('contact-modal-viber');

    contactModalTrigger = triggerEl || null;
    if (titleEl) titleEl.textContent = productName;

    var message = t(activeLang, 'products.product_message').replace('{product}', productName);
    if (waBtn) waBtn.setAttribute('href', waLink(WHATSAPP_PHONE, message));
    if (viberBtn) viberBtn.setAttribute('href', viberLink(VIBER_PHONE, message));

    modal.classList.add('open');
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', handleContactModalKeydown);
    // Move focus into the dialog for keyboard and screen-reader users.
    // The trusted click/keydown that opened this modal carries its own
    // "return focus to the activated control" browser behavior, which can
    // outlast several animation frames and silently wins over a focus() called
    // too early — so retry across frames until it actually takes, instead of
    // guessing a delay.
    focusUntilSet(waBtn, 20);
  }

  function focusUntilSet(el, attemptsLeft) {
    if (!el) return;
    el.focus();
    if (document.activeElement === el || attemptsLeft <= 0) return;
    window.requestAnimationFrame(function () { focusUntilSet(el, attemptsLeft - 1); });
  }

  function closeContactModal() {
    var modal = document.getElementById('contact-modal');
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', handleContactModalKeydown);
    if (contactModalTrigger) {
      contactModalTrigger.focus();
      contactModalTrigger = null;
    }
  }

  function handleContactModalKeydown(e) {
    if (e.key === 'Escape') { closeContactModal(); return; }
    if (e.key !== 'Tab') return;
    var panel = document.querySelector('.contact-modal-panel');
    if (!panel) return;
    var focusable = Array.prototype.slice.call(panel.querySelectorAll('button, a[href]'));
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function initContactModal() {
    var modal = document.getElementById('contact-modal');
    if (!modal) return;
    modal.querySelectorAll('[data-modal-dismiss]').forEach(function (el) {
      el.addEventListener('click', closeContactModal);
    });
    // Closing on click lets the wa.me/viber:// navigation proceed as normal —
    // this only tidies the dialog away so it isn't still open if the user
    // comes back to the tab.
    var waBtn = document.getElementById('contact-modal-whatsapp');
    var viberBtn = document.getElementById('contact-modal-viber');
    if (waBtn) waBtn.addEventListener('click', closeContactModal);
    if (viberBtn) viberBtn.addEventListener('click', closeContactModal);
  }

  function setLang(lang, opts) {
    opts = opts || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
    activeLang = lang;

    document.documentElement.lang = lang;
    try { window.localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    if (opts.updateUrl !== false) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
      } catch (e) {}
    }

    applyStaticTranslations(lang);
    updateWhatsappLinks(lang);
    renderMarquee(lang);
    renderCategoryFilters(lang);
    renderProducts(lang);
    updateLangUI(lang);
  }

  function updateLangUI(lang) {
    var meta = (window.RERA_I18N.languages || []).find(function (l) { return l.code === lang; });
    if (!meta) return;
    document.querySelectorAll('.lang-flag-current').forEach(function (el) {
      el.src = flagUrl(meta.flagCode);
      el.alt = meta.label;
    });
    document.querySelectorAll('.lang-label-current').forEach(function (el) { el.textContent = meta.code.toUpperCase(); });
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-lang') === lang);
    });
  }

  function initLangSwitch() {
    var switchers = document.querySelectorAll('.lang-switch');
    switchers.forEach(function (sw) {
      var btn = sw.querySelector('.lang-btn');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        switchers.forEach(function (o) { if (o !== sw) o.classList.remove('open'); });
        sw.classList.toggle('open');
      });
      sw.querySelectorAll('.lang-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          setLang(opt.getAttribute('data-lang'), { updateUrl: true });
          sw.classList.remove('open');
        });
      });
    });
    document.addEventListener('click', function () {
      switchers.forEach(function (sw) { sw.classList.remove('open'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') switchers.forEach(function (sw) { sw.classList.remove('open'); });
    });
  }

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var drawer = document.querySelector('.mobile-drawer');
    var overlay = document.querySelector('.nav-overlay');
    if (!toggle || !drawer || !overlay) return;

    function close() {
      toggle.classList.remove('open');
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      toggle.classList.add('open');
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.classList.add('no-scroll');
      toggle.setAttribute('aria-expanded', 'true');
    }
    toggle.addEventListener('click', function () {
      drawer.classList.contains('open') ? close() : open();
    });
    overlay.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  function initReveal() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  function initNavScroll() {
    var nav = document.querySelector('.nav');
    if (!nav || nav.classList.contains('nav-solid')) return;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    });
  }

  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function initFounded() {
    var el = document.getElementById('years-count');
    if (el) el.textContent = new Date().getFullYear() - FOUNDED_YEAR;
  }

  // Cross-fades the hero between HERO_CLIPS using two stacked <video> layers.
  // An ended <video> holds its last frame, so the incoming clip simply fades
  // in over that still — no black gap, no timing juggling.
  function initHeroVideo() {
    var media = document.querySelector('.hero-media');
    if (!media) return;
    var layers = media.querySelectorAll('.hero-video');
    if (layers.length < 2) return;

    var active = layers[0];
    var idle = layers[1];
    var clips = HERO_CLIPS.slice();

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      active.removeAttribute('autoplay');
      active.pause();
      return; // poster frame stays
    }
    if (clips.length < 2) { active.loop = true; return; }

    // The markup carries clip 1 so playback can begin before this script runs.
    // Once we take over, drop `autoplay`: re-loading the idle layer with the
    // attribute still set makes it start playing again behind the active one.
    active.removeAttribute('autoplay');
    idle.removeAttribute('autoplay');
    if (active.getAttribute('src') !== clips[0]) {
      active.setAttribute('src', clips[0]);
      active.load();
    }

    active.loop = false;
    idle.loop = false;
    var idx = 0;
    var swapping = false;

    function nextSrc() { return clips[(idx + 1) % clips.length]; }

    function preloadNext() {
      var src = nextSrc();
      if (idle.getAttribute('src') !== src) {
        idle.setAttribute('src', src);
        idle.load();
      }
    }

    // A clip that 404s or won't decode is removed from the rotation; if that
    // leaves one clip, the hero falls back to plain looping.
    function dropClip(src) {
      var i = clips.indexOf(src);
      if (i !== -1) clips.splice(i, 1);
      if (clips.length < 2) {
        active.loop = true;
        if (active.paused) active.play().catch(function () {});
      }
    }

    idle.addEventListener('error', function () { dropClip(idle.getAttribute('src')); });

    function swap() {
      if (swapping || clips.length < 2) return;
      swapping = true;
      var incoming = nextSrc();
      preloadNext();
      var done = function () {
        idle.classList.add('is-active');
        active.classList.remove('is-active');
        var prev = active;
        active = idle;
        idle = prev;
        idx = clips.indexOf(incoming);
        bindEnd();
        setTimeout(function () {
          prev.pause();
          try { prev.currentTime = 0; } catch (e) {}
          swapping = false;
        }, 1200);
      };
      var p = idle.play();
      if (p && p.then) {
        p.then(done).catch(function () { dropClip(incoming); swapping = false; });
      } else { done(); }
    }

    function onTime() {
      if (active.duration && active.duration - active.currentTime < 6) preloadNext();
    }

    function bindEnd() {
      active.addEventListener('ended', swap, { once: true });
      active.addEventListener('timeupdate', onTime);
      idle.removeEventListener('timeupdate', onTime);
    }

    bindEnd();
    if (active.paused) active.play().catch(function () {});
  }

  function initImgLoad() {
    document.querySelectorAll('.img-wrap').forEach(bindImgLoad);
  }

  document.addEventListener('DOMContentLoaded', function () {
    currentFilter = detectInitialFilter();
    initYear();
    initFounded();
    initHeroVideo();
    initReveal();
    initNavScroll();
    initMobileNav();
    initLangSwitch();
    initFilters();
    initImgLoad();
    initContactModal();
    setLang(detectLang(), { updateUrl: false });
    loadCatalogue();
  });
})();
