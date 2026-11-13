

// intimacy.js

function fertillik(yosh, jadval) {
  if (!jadval || !jadval.length) return 0;
  const t = [...jadval].sort((a, b) => a[0] - b[0]);
  if (yosh <= t[0][0]) return t[0][1];
  const oxirgi = t[t.length - 1];
  if (yosh >= oxirgi[0]) return oxirgi[1];
  for (let i = 0; i < t.length - 1; i++) {
    const [y1, v1] = t[i], [y2, v2] = t[i + 1];
    if (yosh >= y1 && yosh <= y2) return v1 + (v2 - v1) * ((yosh - y1) / (y2 - y1));
  }
  return 0;
}

window.amal = function (state, personId, method, balance) {
  const b = balance || state.balance;
  if (!b) return { ok: false, sabab: 'balans yoq' };

  const shaxs = state.people.find(p => p.id === personId);
  if (!shaxs) return { ok: false, sabab: 'topilmadi' };
  if (shaxs.alive === false) return { ok: false, sabab: 'tirik emas' };

  const s = window.bilanQosh(state.settings || {});
  if (shaxs.age < (s.yosh ?? b.intimacyAge)) return { ok: false, sabab: 'yosh kichik' };
  if ((shaxs.consanguinity || 0) > 0 && s.qon === 'ochiq_emas')
    return { ok: false, sabab: 'qarindosh, qulf yopiq' };

  const m = b.methods && b.methods[method];
  if (!m) return { ok: false, sabab: 'usul yoq' };
  if ((shaxs.mehr || 0) < (m.aloqaMin || 0)) return { ok: false, sabab: 'aloqa yetarli emas' };
  if (m.kech && !state.night) return { ok: false, sabab: 'kech emas' };
  if ((state.money || 0) < (m.narx || 0)) return { ok: false, sabab: 'pul yetarli emas' };

  state.money -= (m.narx || 0);

  const kop = (b.difficulty && b.difficulty[s.qiyinlik]) ? b.difficulty[s.qiyinlik].shubha : 1;
  const muvaffaqiyat = method === 'majbur' ? true : Math.random() < m.ehtimol;

  shaxs.shubha = Math.min(100, (shaxs.shubha || 0) + (m.shubha || 0) * kop);
  if (m.mehrFarq) {
    shaxs.mehr = Math.max(0, Math.min(100, (shaxs.mehr || 0) + m.mehrFarq));
  }

  let homilador = false;

  if (muvaffaqiyat) {
    if (!shaxs.aloqa) {
      shaxs.aloqa = true;
      shaxs.mehr = Math.min(100, (shaxs.mehr || 0) + 2);
    }
    const ayol = shaxs.jins === 'f';
    const fertile = shaxs.age >= b.fertileMinAge && shaxs.age <= b.fertileMaxAgeF;
    if (ayol && fertile && !shaxs.pregnant) {
      const p = (b.homiladorlikFoiz || 0) * fertillik(shaxs.age, b.fertillikJadvali) / 100;
      if (Math.random() < p) {
        shaxs.pregnant = { fatherId: state.player.id, months: 0, knownByPlayer: false };
        homilador = true;
      }
    }
  } else {
    shaxs.mehr = Math.max(0, (shaxs.mehr || 0) - 3);
  }

  return { ok: true, muvaffaqiyat, homilador };
};
