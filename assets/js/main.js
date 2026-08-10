(function () {
  'use strict';

  var WHATSAPP_PHONE = '38978500737';
  var FLAG_CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
  function flagUrl(flagCode) { return FLAG_CDN + flagCode + '.svg'; }
  var LANG_KEY = 'rera-lang';
  var SUPPORTED = (window.RERA_I18N && window.RERA_I18N.languages.map(function (l) { return l.code; })) || ['en'];
  var DICT = (window.RERA_I18N && window.RERA_I18N.translations) || {};

  var PRODUCTS = [
    { key: 'heritage_chair', cat: 'chairs',     catLabelKey: 'cat_furniture', tag: 'tag_bestseller', price: '9,500',  img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80' },
    { key: 'styling_chair',  cat: 'chairs',     catLabelKey: 'cat_furniture', tag: null,             price: '9,000',  img: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400&q=80' },
    { key: 'wash_unit',      cat: 'equipment',  catLabelKey: 'cat_equipment', tag: 'tag_new',        price: '12,500', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80' },
    { key: 'shears',         cat: 'tools',      catLabelKey: 'cat_tools',     tag: null,             price: '4,500',  img: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=400&q=80' },
    { key: 'hairdryer',      cat: 'tools',      catLabelKey: 'cat_tools',     tag: null,             price: '4,000',  img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80' },
    { key: 'beard_oil',      cat: 'cosmetics',  catLabelKey: 'cat_cosmetics', tag: null,             price: '900',    img: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&q=80' },
    { key: 'pomade',         cat: 'cosmetics',  catLabelKey: 'cat_cosmetics', tag: 'tag_propick',    price: '650',    img: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80' },
    { key: 'dispenser',      cat: 'equipment',  catLabelKey: 'cat_equipment', tag: null,             price: '3,500',  img: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80' },
    { key: 'color_cream',    cat: 'cosmetics',  catLabelKey: 'cat_cosmetics', tag: null,             price: '250',    img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' }
  ];

  var currentFilter = 'all';

  function detectInitialFilter() {
    try {
      var params = new URLSearchParams(window.location.search);
      var cat = params.get('cat');
      var valid = ['all', 'chairs', 'equipment', 'tools', 'cosmetics'];
      if (cat && valid.indexOf(cat) !== -1) return cat;
    } catch (e) {}
    return 'all';
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
    var track = document.getElementById('marquee-track');
    if (!track) return;
    var items = t(lang, 'home.marquee');
    if (!Array.isArray(items)) return;
    var group = items.map(function (item) {
      return '<span class="marq-item">' + item + '</span><i class="dot"></i>';
    }).join('');
    track.innerHTML = '<span>' + group + '</span><span>' + group + '</span>';
  }

  function bindImgLoad(wrap) {
    var img = wrap.querySelector('img');
    if (!img) return;
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

    grid.innerHTML = PRODUCTS.map(function (p) {
      var name = t(lang, 'products.items.' + p.key);
      var catLabel = t(lang, 'products.' + p.catLabelKey);
      var tagLabel = p.tag ? t(lang, 'products.' + p.tag) : '';
      var ctaLabel = t(lang, 'products.cta_inquire');
      var msgTemplate = t(lang, 'products.whatsapp_product_message');
      var link = waLink(WHATSAPP_PHONE, msgTemplate.replace('{product}', name));

      return (
        '<article class="product" data-cat="' + p.cat + '">' +
          '<div class="product-left">' +
            '<div class="product-img-wrap img-wrap">' +
              '<img class="product-img" loading="lazy" src="' + p.img + '" alt="' + name + '">' +
            '</div>' +
            '<span class="product-cat">' + catLabel + '</span>' +
            '<span class="product-name">' + name + '</span>' +
            (tagLabel ? '<span class="product-tag">' + tagLabel + '</span>' : '') +
          '</div>' +
          '<div class="product-right">' +
            '<span class="product-price">' + p.price + '<span class="cur">MKD</span></span>' +
            '<a href="' + link + '" target="_blank" rel="noopener" class="product-cta">' + ctaLabel + ' →</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    grid.querySelectorAll('.img-wrap').forEach(bindImgLoad);
    applyFilter(currentFilter);
  }

  function applyFilter(cat) {
    currentFilter = cat;
    document.querySelectorAll('.product').forEach(function (p) {
      p.style.display = (cat === 'all' || p.dataset.cat === cat) ? '' : 'none';
    });
    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
  }

  function initFilters() {
    var filters = document.querySelectorAll('.filter');
    if (!filters.length) return;
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () { applyFilter(btn.dataset.cat); });
    });
  }

  function setLang(lang, opts) {
    opts = opts || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';

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

  function initImgLoad() {
    document.querySelectorAll('.img-wrap').forEach(bindImgLoad);
  }

  document.addEventListener('DOMContentLoaded', function () {
    currentFilter = detectInitialFilter();
    initYear();
    initReveal();
    initNavScroll();
    initMobileNav();
    initLangSwitch();
    initFilters();
    initImgLoad();
    setLang(detectLang(), { updateUrl: false });
  });
})();
