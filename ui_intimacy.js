(function () {
  const S = () => Nasl.state;
  const yangila = () => { if (typeof render === 'function') render(); };

  const YORLIQ = {
    suhbat: 'Suhbat', sovga: "Sovg'a", alkogol: 'Alkogol',
    afrodizyak: 'Afrodizyak', massaj: 'Massaj', ofuro: 'Hammom',
    tungi: 'Tungi tashrif', majbur: "Zo'rlash"
  };

  function sabab(p, usul, b, s) {
    if (!p || p.alive === false) return 'tirik emas';
    if (p.age < (s.yosh ?? b.intimacyAge)) return 'yosh kichik';
    if ((p.consanguinity || 0) > 0 && s.qon === 'ochiq_emas') return 'qon munosabat yopiq';
    const m = b.methods[usul];
    if (!m) return 'usul yoq';
    if ((p.mehr || 0) < (m.aloqaMin || 0)) return 'mehr yetarli emas';
    if (m.kech && !S().night) return 'kech emas';
    if ((S().money || 0) < (m.narx || 0)) return 'pul yetarli emas';
    return null;
  }

  window.usullarniChiz = function (el, state, b, id) {
    if (!el) return;
    const p = state.people[id];
    if (!p) return;
    const s = window.bilanQosh(state.settings || {});
    el.innerHTML = '';

    for (const usul in b.methods) {
      const m = b.methods[usul];
      if (usul === 'majbur' && s.majbur === false) continue;
      const nuqson = sabab(p, usul, b, s);
      const tugma = document.createElement('button');
      tugma.className = 'usul';
      const chap = document.createElement('b');
      chap.textContent = YORLIQ[usul] || usul;
      const ong = document.createElement('small');
      const narxMatn = m.narx ? '$' + m.narx : '';
      ong.textContent = narxMatn + (nuqson ? (narxMatn ? ' · ' : '') + nuqson : '');
      tugma.append(chap, ong);
      tugma.disabled = !!nuqson;
      tugma.onclick = () => {
        const natija = window.amal(state, id, usul, b);
        if (!natija.ok) { yangila(); return; }
        if (Nasl.yoz) {
          Nasl.yoz(p.name + ' — ' + (YORLIQ[usul] || usul)
            + (natija.muvaffaqiyat ? '' : ' (o\'tmadi)')
            + (natija.homilador ? '. Homilador.' : '.'));
        }
        yangila();
      };
      el.appendChild(tugma);
    }
  };

  window.extraSozlamalarniChiz = function (el, state) {
    if (!el) return;
    el.innerHTML = '';
    const yorliq = { qon: 'Incest', yosh: 'Pedofiliya chegarasi', majbur: "Zo'rlash" };
    const variantlar = {
      qon: [['qulf', 'Qulf'], ['ochiq', 'Ochiq'], ['ochiq_emas', "O'chiq"]],
      yosh: [[6, '6'], [8, '8'], [10, '10']],
      majbur: [[false, "Yo'q"], [true, 'Ha']]
    };
    const effektiv = window.bilanQosh(state.settings || {});

    for (const kalit in window.SETTINGS_EXTRA) {
      const qator = document.createElement('div');
      qator.className = 'sozlama-qator';
      const nom = document.createElement('span');
      nom.className = 'sozlama-yorliq';
      nom.textContent = yorliq[kalit] || kalit;
      qator.appendChild(nom);

      const seg = document.createElement('div');
      seg.className = 'segment';
      (variantlar[kalit] || []).forEach(([qiymat, matn]) => {
        const b = document.createElement('button');
        b.textContent = matn;
        if (effektiv[kalit] === qiymat) b.classList.add('faol');
        b.onclick = () => { state.settings[kalit] = qiymat; yangila(); };
        seg.appendChild(b);
      });
      qator.appendChild(seg);
      el.appendChild(qator);
    }
  };
})();