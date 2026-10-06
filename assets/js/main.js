/* أصل للتقييم العقاري — main.js */
(function () {
  'use strict';

  /* ================= الإعدادات ================= */
  var CONFIG = {
    formEmail: 'info@asl-ev.com',          // البريد اللي بتوصله الطلبات (FormSubmit)
    whatsapp: '966559515585',
    phone: '0559515585',
    leadHook: 'https://n8n.gorwmatic.io/webhook/asl-lead', // أتمتة العملاء: نسخة من كل طلب تروح للوحة العملاء
    mapCenter: [24.7136, 46.6753],         // الرياض
    leafletCss: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    leafletJs: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ================= القائمة ================= */
  var burger = $('.burger'), navWrap = $('.nav-wrap');
  if (burger && navWrap) {
    burger.addEventListener('click', function () {
      navWrap.style.top = $('.site-header').getBoundingClientRect().bottom + 'px';
      var open = navWrap.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  $$('.has-dd > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.parentElement, open = li.classList.toggle('open');
      b.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', function (e) {
    $$('.has-dd.open').forEach(function (li) { if (!li.contains(e.target) && window.innerWidth > 980) li.classList.remove('open'); });
  });

  /* ================= فلاتر المدونة ================= */
  var filters = $('.filters');
  if (filters) {
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      var cat = b.dataset.cat;
      $$('.posts .post').forEach(function (p) { p.hidden = cat !== 'all' && p.dataset.cat !== cat; });
    });
  }

  /* ================= أدوات ================= */
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toLatinDigits(s) { return String(s || '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }); }
  function setErr(input, msg) {
    var e = input.closest('.field') && input.closest('.field').querySelector('.err');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (e) e.textContent = msg || '';
    return !msg;
  }
  function orderNumber() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return 'ASL-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  function sendForm(data) {
    // نسخة موازية للأتمتة — لا تؤثر على الإرسال الأساسي لو فشلت
    try {
      if (CONFIG.leadHook) fetch(CONFIG.leadHook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(function () {});
    } catch (e) {}
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch('https://formsubmit.co/ajax/' + CONFIG.formEmail, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: ctrl.signal
    }).then(function (r) { clearTimeout(t); return r.json(); })
      .then(function (j) { if (String(j.success) !== 'true') throw new Error(j.message || 'failed'); return j; });
  }

  /* ================= نافذة طلب الخدمة ================= */
  var modal = $('#request');
  if (modal) {
    var form = $('#reqForm', modal);
    var panes = $$('.pane', modal);
    var steps = $$('.stepper li', modal);
    var current = 0;
    var loc = { lat: null, lng: null, text: '', short: '' };
    var lastFocus = null;

    function show(i) {
      current = i;
      panes.forEach(function (p, k) { p.classList.toggle('on', k === i); });
      steps.forEach(function (s, k) {
        s.classList.toggle('done', k < i);
        s.classList.toggle('now', k === i);
        if (k === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
      });
      $('.stepper', modal).hidden = i > 2;
      var first = panes[i] && panes[i].querySelector('input,select,button');
      if (first && i < 3) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
      $('.modal-box', modal).scrollTop = 0;
    }

    function openModal(service) {
      lastFocus = document.activeElement;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (current === 3) resetForm();
      if (service) {
        var sel = form.elements.service;
        for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === service) sel.selectedIndex = i;
      }
      show(current);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    function resetForm() {
      form.reset();
      loc = { lat: null, lng: null, text: '', short: '' };
      updateLocBtn();
      $$('[aria-invalid]', form).forEach(function (i) { setErr(i, ''); });
      $('#sendErr', modal).hidden = true;
      current = 0;
    }

    $$('[data-open-request]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (navWrap && navWrap.classList.contains('open')) { navWrap.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
        openModal(b.dataset.service);
      });
    });
    $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open') && !$('#maplayer').classList.contains('open')) closeModal();
    });

    /* تنسيق رقم الجوال */
    var phone = form.elements.phone;
    phone.addEventListener('input', function () {
      var v = toLatinDigits(phone.value).replace(/\D/g, '').slice(0, 10);
      phone.value = v;
      if (phone.getAttribute('aria-invalid') === 'true') validate1();
    });

    function validate1() {
      var ok = true, f = form.elements;
      var name = f.name.value.trim();
      ok = setErr(f.name, name.length < 3 ? 'اكتب الاسم الكامل (3 أحرف على الأقل).' : '') && ok;
      var ph = toLatinDigits(f.phone.value).trim();
      ok = setErr(f.phone, !/^05\d{8}$/.test(ph) ? 'رقم الجوال لازم يبدأ بـ 05 ويتكون من 10 أرقام، مثال: 0551234567.' : '') && ok;
      var em = f.email.value.trim();
      ok = setErr(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? 'اكتب بريدًا إلكترونيًا صحيحًا، مثال: name@mail.com.' : '') && ok;
      return ok;
    }
    function validate2() {
      var ok = true, f = form.elements;
      ok = setErr(f.service, !f.service.value ? 'اختر الخدمة المطلوبة.' : '') && ok;
      ok = setErr(f.ptype, !f.ptype.value ? 'اختر نوع العقار.' : '') && ok;
      var a = parseFloat(toLatinDigits(f.area.value));
      ok = setErr(f.area, !(a > 0) ? 'اكتب مساحة العقار بالمتر المربع.' : '') && ok;
      var lb = $('#locBtn');
      var hasLoc = loc.lat !== null || loc.short;
      $('#locErr').textContent = hasLoc ? '' : 'حدّد موقع العقار على الخريطة أو اكتب العنوان.';
      lb.setAttribute('aria-invalid', hasLoc ? 'false' : 'true');
      return ok && hasLoc;
    }

    function buildSummary() {
      var f = form.elements;
      var rows = [
        ['الاسم', f.name.value.trim()],
        ['الجوال', f.phone.value.trim()],
        ['البريد', f.email.value.trim()],
        ['الخدمة', f.service.value],
        ['نوع العقار', f.ptype.value],
        ['المساحة', toLatinDigits(f.area.value) + ' م²'],
      ];
      if (loc.lat !== null) rows.push(['الموقع', loc.text || (loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5))]);
      if (loc.short) rows.push(['العنوان المختصر', loc.short]);
      if (f.notes.value.trim()) rows.push(['ملاحظات', f.notes.value.trim()]);
      $('#summary').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + escapeHtml(r[1]) + '</dd></div>'; }).join('');
    }

    $$('[data-next]', modal).forEach(function (b) {
      b.addEventListener('click', function () {
        if (current === 0 && !validate1()) return;
        if (current === 1) { if (!validate2()) return; buildSummary(); }
        show(current + 1);
      });
    });
    $$('[data-prev]', modal).forEach(function (b) { b.addEventListener('click', function () { show(current - 1); }); });
    $$('[data-edit]', modal).forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.edit); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate1()) { show(0); return; }
      if (!validate2()) { show(1); return; }
      var f = form.elements;
      var no = orderNumber();
      var btn = $('#submitBtn');
      btn.disabled = true; btn.textContent = 'جارٍ إرسال الطلب...';
      var mapsLink = loc.lat !== null ? 'https://www.google.com/maps?q=' + loc.lat.toFixed(6) + ',' + loc.lng.toFixed(6) : '';
      var name = f.name.value.trim();
      var data = {
        'رقم الطلب': no,
        'الاسم': name,
        'الجوال': f.phone.value.trim(),
        email: f.email.value.trim(),
        'الخدمة': f.service.value,
        'نوع العقار': f.ptype.value,
        'المساحة (م²)': toLatinDigits(f.area.value),
        'العنوان': loc.text || '-',
        'العنوان الوطني المختصر': loc.short || '-',
        'رابط الموقع على الخريطة': mapsLink || '-',
        'ملاحظات': f.notes.value.trim() || '-',
        _subject: 'طلب خدمة جديد ' + no + ' — ' + f.service.value,
        _template: 'table',
        _captcha: 'false',
        _autoresponse: 'مرحبًا ' + name + '،\n\nتم استلام طلبك رقم ' + no + ' بنجاح (' + f.service.value + ')، وجارٍ العمل عليه الآن.\nسيتواصل معك فريق أصل للتقييم العقاري خلال أقل من ساعة.\n\nللاستفسار: ' + CONFIG.phone + '\nأصل للتقييم العقاري — نقدّر الأصل'
      };
      sendForm(data).then(function () {
        $('#orderNo').textContent = no;
        $('#okMail').textContent = f.email.value.trim();
        var okWa = $('#okWa');
        if (!okWa) {
          var closeBtn = $('#okMail').closest('.pane').querySelector('[data-close]');
          okWa = document.createElement('a');
          okWa.id = 'okWa'; okWa.className = 'btn btn-line'; okWa.target = '_blank'; okWa.rel = 'noopener';
          okWa.style.marginInlineEnd = '8px';
          okWa.textContent = 'تابع طلبك على واتساب';
          if (closeBtn) closeBtn.parentNode.insertBefore(okWa, closeBtn);
        }
        okWa.href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent('مرحبًا، أتابع طلبي رقم ' + no);
        show(3);
      }).catch(function () {
        var txt = 'مرحبًا، أرغب في طلب خدمة من أصل للتقييم العقاري\n' +
          'رقم الطلب: ' + no + '\nالاسم: ' + name + '\nالجوال: ' + f.phone.value + '\nالخدمة: ' + f.service.value +
          '\nنوع العقار: ' + f.ptype.value + '\nالمساحة: ' + f.area.value + ' م²\nالموقع: ' + (mapsLink || loc.text || loc.short);
        $('#waFallback').href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(txt);
        $('#sendErr').hidden = false;
      }).finally(function () {
        btn.disabled = false; btn.textContent = 'تقديم الطلب';
      });
    });

    /* ================= طبقة الخريطة ================= */
    var layer = $('#maplayer');
    var map = null, marker = null, tmp = { lat: null, lng: null, text: '' };

    function loadLeaflet() {
      if (window.L) return Promise.resolve();
      return new Promise(function (res, rej) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CONFIG.leafletCss; document.head.appendChild(l);
        var s = document.createElement('script'); s.src = CONFIG.leafletJs; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    function updateLocBtn() {
      var b = $('#locBtn'); if (!b) return;
      var set = loc.lat !== null || loc.short;
      b.classList.toggle('set', !!set);
      $('strong', b).textContent = set ? 'تم تحديد موقع العقار — تعديل' : 'تحديد موقع العقار';
      $('small', b).textContent = set ? (loc.text || loc.short || (loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5))) : 'على الخريطة بالدبوس أو بكتابة العنوان';
      if (set) $('#locErr').textContent = '';
    }
    function setAddr(text) {
      $('#pickedAddr').innerHTML = text ? escapeHtml(text) + '<small>يمكنك سحب الدبوس لتحديد أدق</small>' : 'اضغط على الخريطة لوضع الدبوس على موقع العقار';
      $('#confirmLoc').disabled = !(tmp.lat !== null || $('#shortAddr').value.trim());
    }
    function reverse(lat, lng) {
      tmp.text = '';
      setAddr('جارٍ قراءة العنوان...');
      fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=ar&lat=' + lat + '&lon=' + lng)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var a = j.address || {};
          var parts = [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village || a.state].filter(Boolean);
          tmp.text = parts.length ? parts.join('، ') : (j.display_name || '');
          setAddr(tmp.text || (lat.toFixed(5) + ', ' + lng.toFixed(5)));
        }).catch(function () { setAddr(lat.toFixed(5) + ', ' + lng.toFixed(5)); });
    }
    function place(lat, lng, text, zoom) {
      tmp.lat = lat; tmp.lng = lng;
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function () { var p = marker.getLatLng(); tmp.lat = p.lat; tmp.lng = p.lng; reverse(p.lat, p.lng); });
      } else marker.setLatLng([lat, lng]);
      map.setView([lat, lng], zoom || Math.max(map.getZoom(), 16));
      if (text) { tmp.text = text; setAddr(text); } else reverse(lat, lng);
    }

    function openMap() {
      layer.classList.add('open');
      tmp = { lat: loc.lat, lng: loc.lng, text: loc.text };
      $('#shortAddr').value = loc.short || '';
      setAddr(loc.text);
      loadLeaflet().then(function () {
        if (!map) {
          map = L.map('map', { zoomControl: true }).setView(CONFIG.mapCenter, 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
          map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });
        }
        setTimeout(function () { map.invalidateSize(); if (loc.lat !== null) place(loc.lat, loc.lng, loc.text); }, 80);
      }).catch(function () { $('#pickedAddr').textContent = 'تعذّر تحميل الخريطة. اكتب العنوان في تبويب "كتابة العنوان".'; });
    }
    function closeMap() { layer.classList.remove('open'); $('#locBtn').focus(); }

    $('#locBtn').addEventListener('click', openMap);
    $$('[data-map-close]').forEach(function (b) { b.addEventListener('click', closeMap); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && layer.classList.contains('open')) closeMap(); });

    // التبويبات
    $$('.tabs button', layer).forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.tabs button', layer).forEach(function (x) { x.setAttribute('aria-selected', x === t); });
        $$('.tabpane', layer).forEach(function (p) { p.classList.toggle('on', p.id === t.getAttribute('aria-controls')); });
      });
    });

    // موقعي الحالي
    $('#myLoc').addEventListener('click', function () {
      if (!navigator.geolocation) return;
      var b = this; b.disabled = true;
      navigator.geolocation.getCurrentPosition(function (p) { b.disabled = false; if (map) place(p.coords.latitude, p.coords.longitude, null, 17); },
        function () { b.disabled = false; setAddr('لم يتم السماح بالوصول لموقعك. ضع الدبوس يدويًا على الخريطة.'); }, { enableHighAccuracy: true, timeout: 10000 });
    });

    // البحث بالعنوان
    var results = $('#results'), searchTimer;
    function search(q) {
      q = q.trim();
      if (q.length < 3) { results.classList.remove('show'); return; }
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=sa&accept-language=ar&limit=6&q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (list) {
          if (!list.length) { results.innerHTML = '<li><button type="button" disabled>لا توجد نتائج. جرّب اسم الحي أو الشارع أو المدينة.</button></li>'; results.classList.add('show'); return; }
          results.innerHTML = list.map(function (x, i) { return '<li><button type="button" data-i="' + i + '">' + escapeHtml(x.display_name) + '</button></li>'; }).join('');
          results.classList.add('show');
          $$('button[data-i]', results).forEach(function (b) {
            b.addEventListener('click', function () {
              var x = list[+b.dataset.i];
              results.classList.remove('show');
              if (map) place(parseFloat(x.lat), parseFloat(x.lon), x.display_name.split('،').slice(0, 3).join('،'), 17);
            });
          });
        }).catch(function () {});
    }
    $('#addrSearch').addEventListener('input', function () { clearTimeout(searchTimer); var v = this.value; searchTimer = setTimeout(function () { search(v); }, 450); });
    $('#addrSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(this.value); } });
    $('#addrGo').addEventListener('click', function () { search($('#addrSearch').value); });

    // العنوان الوطني المختصر
    $('#shortAddr').addEventListener('input', function () {
      this.value = toLatinDigits(this.value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      var v = this.value, ok = /^[A-Z]{4}\d{4}$/.test(v);
      $('#shortHint').textContent = v && !ok ? 'الصيغة: 4 أحرف إنجليزية ثم 4 أرقام، مثال: RRRD2929' : (ok ? 'تم — سيتم ربط العنوان المختصر بطلبك.' : 'يتكون من 4 أحرف و4 أرقام، وتجده في تطبيق "العنوان الوطني" أو "سبل".');
      $('#confirmLoc').disabled = !(tmp.lat !== null || ok);
    });

    $('#confirmLoc').addEventListener('click', function () {
      var s = $('#shortAddr').value.trim();
      loc = { lat: tmp.lat, lng: tmp.lng, text: tmp.text, short: /^[A-Z]{4}\d{4}$/.test(s) ? s : '' };
      updateLocBtn();
      closeMap();
    });
  }

  /* ================= نموذج التواصل ================= */
  var cf = $('#contactForm');
  if (cf) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = cf.elements, ok = true;
      ok = setErr(f.name, f.name.value.trim().length < 3 ? 'اكتب الاسم.' : '') && ok;
      ok = setErr(f.phone, !/^05\d{8}$/.test(toLatinDigits(f.phone.value).trim()) ? 'الرقم يبدأ بـ 05 ويتكون من 10 أرقام.' : '') && ok;
      ok = setErr(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()) ? 'اكتب بريدًا صحيحًا.' : '') && ok;
      ok = setErr(f.message, f.message.value.trim().length < 5 ? 'اكتب رسالتك.' : '') && ok;
      if (!ok) return;
      var msg = $('.form-msg', cf), btn = $('button[type=submit]', cf);
      btn.disabled = true;
      sendForm({ 'الاسم': f.name.value, 'الجوال': f.phone.value, email: f.email.value, 'الرسالة': f.message.value, _subject: 'رسالة جديدة من صفحة تواصل معنا', _template: 'table', _captcha: 'false' })
        .then(function () { msg.className = 'form-msg ok'; msg.textContent = 'تم إرسال رسالتك، وسنرد عليك قريبًا.'; cf.reset(); })
        .catch(function () { msg.className = 'form-msg bad'; msg.innerHTML = 'تعذّر الإرسال الآن. تواصل معنا مباشرة على <a href="https://wa.me/' + CONFIG.whatsapp + '">واتساب</a>.'; })
        .finally(function () { btn.disabled = false; });
    });
  }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
