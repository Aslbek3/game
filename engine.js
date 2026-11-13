"use strict";
// Nasl dvigateli. Sonlar faqat balance.json dan; kodda faqat 0 va 1.

const Nasl = (() => {
  let B = null;      // balance
  let EVENTS = [];   // voqealar
  let NAMES = null;   // ismlar
  let S = null;      // holat

  // ---------- yordamchi ----------
  const rnd = () => Math.random();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const age = (p) => (p.diedYear != null ? p.diedYear : S.year) - p.born;
  const alive = (p) => p.diedYear == null;
  const P = (id) => S.people[id];

  function log(text) {
    S.log.push({ year: S.year, text });
    if (S.log.length > B.logLimit) S.log.shift();
  }

  // ---------- odam ----------
  function newPerson({ sex, born, fatherId = null, motherId = null, realFatherId = null, surname, name }) {
    const id = S.nextId++;
    const p = {
      id, sex, jins: sex, born,
      name: name || pick(sex === "m" ? B.maleNames : B.femaleNames),
      surname: surname || pick(B.surnames),
      fatherId, motherId,
      realFatherId: realFatherId == null ? fatherId : realFatherId, // biologik ota
      spouses: [],          // hozirgi nikohdagilar
      exSpouses: [],
      diedYear: null,
      concealed: false,     // otalik yashirilganmi
      mehr: B.startMehr,
      ishonch: B.startIshonch,
      shubha: B.startShubha,
      holat: null           // 'xotin' | 'sevgili' | 'yashirin' | null
    };
    S.people[id] = p;
    return id;
  }

  const fullName = (p) => `${p.name} ${p.surname}`;

  // ---------- yangi o'yin ----------
  function randStat() { return 50 + Math.floor(rnd() * 31); }

  function newGame() {
    S = {
      year: B.startYear, nextId: 1, people: {}, playerId: null, xotinId: null,
      money: B.startMoney, debt: B.startDebt, honor: B.startHonor,
      night: false, job: pick(B.jobs),
      settings: { nikoh: "kop", lesbian: false, xxx: false, matn: "orta", olim: false, tasodif: "orta", qiyinlik: "yumshoq" },
      pregnancies: [], flags: {}, log: [], pending: null, eventYear: {},
      balance: B
    };
    const me = newPerson({ sex: "m", born: B.startYear - B.startAge });
    S.playerId = me;
    const meP = P(me);
    meP.health = randStat();
    meP.mood = randStat();
    meP.smarts = randStat();
    meP.looks = randStat();

    // xotin: ayol, 25-35 yosh
    const xotinYosh = 25 + Math.floor(rnd() * 11);
    const xotinId = newPerson({ sex: "f", born: B.startYear - xotinYosh });
    marry(me, xotinId, true);
    P(xotinId).holat = "xotin";
    S.xotinId = xotinId;

    // qiz: ayol, 10-16 yosh, o'yinchining biologik qizi
    const qizYosh = 10 + Math.floor(rnd() * 7);
    const qizId = newPerson({
      sex: "f", born: B.startYear - qizYosh,
      fatherId: me, motherId: xotinId, surname: P(me).surname
    });
    P(qizId).consanguinity = 0.5;

    log("Boshlandi.");
    save();
    return S;
  }

  // ---------- nikoh ----------
  function marry(aId, bId, free = false) {
    const a = P(aId), b = P(bId);
    if (!a || !b || !alive(a) || !alive(b)) return false;
    if (age(a) < B.adultAge || age(b) < B.adultAge) return false;
    if (a.spouses.includes(bId)) return false;
    if (a.sex === "m" && a.spouses.length >= B.maxSpouses) return false;
    if (!free) {
      if (S.money < B.marriageCost) return false;
      S.money -= B.marriageCost;
    }
    a.spouses.push(bId); b.spouses.push(aId);
    if (b.sex === "f" && a.sex === "m") b.surname = a.surname;
    log(`${fullName(a)} va ${fullName(b)} nikohlandi.`);
    return true;
  }

  function eligibleSingles() {
    const me = P(S.playerId);
    return Object.values(S.people).filter(p =>
      alive(p) && age(p) >= B.adultAge && p.sex !== me.sex &&
      p.spouses.length === 0 && p.id !== me.id);
  }

  // ---------- qarindoshlik ----------
  function ancestors(id) {
    // {ancestorId: distance}, biologik va qayd etilgan ota hisobga olinadi
    const out = {}; const q = [[id, 0]];
    while (q.length) {
      const [cur, d] = q.shift(); const p = P(cur);
      if (!p) continue;
      for (const par of [p.motherId, p.fatherId]) {
        if (par != null && out[par] === undefined) { out[par] = d + 1; q.push([par, d + 1]); }
      }
    }
    return out;
  }

  // b, a ga kim bo'ladi (o'zbekcha atama). Hamma uchun bir xil tizim.
  function relation(aId, bId) {
    if (aId === bId) return "o'zi";
    const a = P(aId), b = P(bId);
    if (!a || !b) return "";
    if (a.spouses.includes(bId)) return b.sex === "f" ? "xotin" : "er";
    const female = b.sex === "f";
    if (a.fatherId === bId || a.motherId === bId) return female ? "ona" : "ota";
    if (b.fatherId === aId || b.motherId === aId) return female ? "qiz" : "o'g'il";

    const aa = ancestors(aId), ba = ancestors(bId);
    if (aa[bId] !== undefined) {
      const d = aa[bId];
      return d === 2 ? (female ? "buvi" : "bobo") : (female ? "katta buvi" : "katta bobo");
    }
    if (ba[aId] !== undefined) {
      const d = ba[aId];
      return d === 2 ? "nevara" : "chevara";
    }
    // aka-uka/opa-singil, o'gay
    const shareF = a.fatherId != null && a.fatherId === b.fatherId;
    const shareM = a.motherId != null && a.motherId === b.motherId;
    if (shareF || shareM) {
      const full = shareF && shareM;
      const older = b.born < a.born;
      const base = female ? (older ? "opa" : "singil") : (older ? "aka" : "uka");
      return full ? base : `o'gay ${base}`;
    }
    // o'gay farzand: turmush o'rtog'imning bolasi
    for (const sp of a.spouses) {
      if (b.fatherId === sp || b.motherId === sp) return female ? "o'gay qiz" : "o'gay o'g'il";
    }
    // kelin/kuyov: farzandimning turmush o'rtog'i
    for (const c of Object.values(S.people)) {
      if ((c.fatherId === aId || c.motherId === aId) && c.spouses.includes(bId)) return female ? "kelin" : "kuyov";
    }
    // amaki/tog'a/xola/amma va jiyan
    for (const par of [a.fatherId, a.motherId]) {
      if (par == null) continue;
      const pp = P(par);
      if (pp && (pp.fatherId === b.fatherId && b.fatherId != null || pp.motherId === b.motherId && b.motherId != null) && b.id !== par) {
        const viaFather = par === a.fatherId;
        return female ? (viaFather ? "amma" : "xola") : (viaFather ? "amaki" : "tog'a");
      }
    }
    for (const par of [b.fatherId, b.motherId]) {
      if (par == null) continue;
      const pp = P(par);
      if (pp && ((pp.fatherId != null && pp.fatherId === a.fatherId) || (pp.motherId != null && pp.motherId === a.motherId)) && par !== aId) {
        return "jiyan";
      }
    }
    // qaynsingil: xotinimning singlisi
    for (const sp of a.spouses) {
      const w = P(sp);
      if (w && ((w.fatherId != null && w.fatherId === b.fatherId) || (w.motherId != null && w.motherId === b.motherId)) && b.id !== sp) {
        return female ? "qaynsingil" : "qayin";
      }
    }
    return "qarindosh";
  }

  function familyView() {
    return Object.values(S.people)
      .filter(p => p.id !== S.playerId)
      .map(p => ({ id: p.id, name: fullName(p), age: age(p), alive: alive(p), rel: relation(S.playerId, p.id), holat: p.holat }));
  }

  // ---------- sevgi ----------
  function tanishish() {
    if (S.flags.tanishishYili === S.year) return null;
    const id = newPerson({ sex: "f", born: S.year - (20 + Math.floor(rnd() * 16)) });
    const p = P(id);
    p.holat = "sevgili";
    p.mehr = 30;
    S.flags.tanishishYili = S.year;
    log(`${fullName(p)} bilan tanishdingiz.`);
    save();
    return id;
  }

  function nikohTaklifi(personId) {
    const p = P(personId);
    if (!p || p.holat !== "sevgili" || p.mehr < 60) return null;
    const ehtimol = p.mehr / 100;
    if (rnd() < ehtimol) {
      if (!marry(S.playerId, personId, true)) return { ok: false, sabab: "xotinlar_tola" };
      p.holat = "xotin";
      log(`${fullName(p)}ga uylandingiz.`);
      save();
      return { ok: true, natija: true };
    }
    p.mehr = Math.max(0, p.mehr - 10);
    save();
    return { ok: true, natija: false };
  }

  function ajralish(personId) {
    const p = P(personId);
    const me = P(S.playerId);
    if (!p || p.holat !== "xotin") return null;
    me.spouses = me.spouses.filter(x => x !== personId);
    me.exSpouses.push(personId);
    p.spouses = p.spouses.filter(x => x !== S.playerId);
    p.exSpouses.push(S.playerId);
    p.sobiq = true;
    p.holat = null;
    log(`${fullName(p)} bilan ajrashdingiz.`);
    save();
    return true;
  }

  // ---------- homiladorlik ----------
  function tryConceive(woman) {
    if (woman.sex !== "f" || !alive(woman)) return;
    const a = age(woman);
    if (a < B.fertileMinAge || a > B.fertileMaxAgeF) return;
    if (S.pregnancies.some(x => x.motherId === woman.id)) return;
    const partners = woman.spouses.map(P).filter(h => h && alive(h) && h.sex === "m" && age(h) >= B.adultAge);
    if (!partners.length || rnd() > B.conceiveChance) return;
    const father = pick(partners);
    S.pregnancies.push({
      motherId: woman.id,
      realFatherId: father.id,
      recordedFatherId: father.id,
      dueYear: S.year + B.pregnancyYears
    });
  }

  // Otalikni yashirish: tug'ilishda qayd etilgan ota boshqa bo'lishi mumkin
  function concealPaternity(pregnancy, recordedFatherId) {
    pregnancy.recordedFatherId = recordedFatherId;
  }

  function resolvePregnancies() {
    const keep = [];
    for (const pr of S.pregnancies) {
      if (pr.dueYear > S.year) { keep.push(pr); continue; }
      const mother = P(pr.motherId);
      if (!mother || !alive(mother)) continue;
      const count = rnd() < B.twinChance ? 2 : 1;
      const rec = P(pr.recordedFatherId);
      for (let i = 0; i < count; i++) {
        const jins = rnd() < B.maleBirthChance ? "m" : "f";
        const ismlar = NAMES && (jins === "m" ? NAMES.erkak : NAMES.ayol);
        const id = newPerson({
          sex: jins, born: S.year,
          fatherId: pr.recordedFatherId, motherId: pr.motherId,
          realFatherId: pr.realFatherId,
          surname: rec ? rec.surname : mother.surname,
          name: ismlar ? pick(ismlar) : undefined
        });
        const c = P(id);
        c.concealed = pr.realFatherId !== pr.recordedFatherId;
        if (!c.concealed && rnd() < B.paternityDoubtChance) c.doubt = true;
        log(`${mother.name} ${c.sex === "m" ? "o'g'il" : "qiz"} tug'di: ${c.name}`);
      }
      if (rnd() < B.motherDeathChance) die(mother, "tug'ruqda");
    }
    S.pregnancies = keep;
  }

  function die(p, why) {
    if (!alive(p)) return;
    p.diedYear = S.year;
    for (const sid of p.spouses) {
      const s = P(sid);
      if (s) { s.spouses = s.spouses.filter(x => x !== p.id); s.exSpouses.push(p.id); }
    }
    p.spouses = [];
    S.pregnancies = S.pregnancies.filter(x => x.motherId !== p.id);
    log(`${fullName(p)} vafot etdi${why ? " (" + why + ")" : ""}.`);
  }

  function mortality(p) {
    const a = age(p);
    if (a >= B.maxAge) return die(p, "keksalikdan");
    const band = B.deathByAge.find(b => a < b.upTo);
    let c = band ? band.chance : 0;
    if (a < B.infantAge) c += B.infantDeathChance;
    if (rnd() < c) die(p, "");
  }

  // ---------- voqealar ----------
  function condOk(c) {
    const me = P(S.playerId); const a = age(me);
    if (c.minAge != null && a < c.minAge) return false;
    if (c.maxAge != null && a > c.maxAge) return false;
    if (c.flag && !S.flags[c.flag]) return false;
    if (c.noFlag && S.flags[c.noFlag]) return false;
    if (c.maxSpousesNotReached && me.spouses.length >= B.maxSpouses) return false;
    if (c.hasEligibleSingle && !eligibleSingles().length) return false;
    if (c.hasConcealedPaternity && !Object.values(S.people).some(p => alive(p) && p.concealed)) return false;
    if (c.hasXotin && !Object.values(S.people).some(p => alive(p) && p.holat === "xotin")) return false;
    if (c.hasQiz && !Object.values(S.people).some(p => alive(p) && p.fatherId === S.playerId && p.sex === "f" && age(p) < B.adultAge)) return false;
    return true;
  }

  function cooldownOk(e) {
    if (!e.cooldown) return true;
    const lastYear = S.eventYear[e.id];
    return lastYear == null || (S.year - lastYear) >= e.cooldown;
  }

  function pickEvent() {
    const pool = EVENTS.filter(e => cooldownOk(e) && condOk(e.cond || {}));
    const total = pool.reduce((s, e) => s + e.weight, 0);
    if (!total) return null;
    let r = rnd() * total;
    for (const e of pool) { r -= e.weight; if (r < 0) return e; }
    return pool[pool.length - 1];
  }

  function applyEffect(ef) {
    switch (ef.op) {
      case "stat": {
        const d = ef.deltaKey ? B[ef.deltaKey] : 0;
        if (ef.key === "money") S.money = Math.max(B.moneyMin, S.money + d);
        if (ef.key === "honor") S.honor = clamp(S.honor + d, B.honorMin, B.honorMax);
        break;
      }
      case "flag": S.flags[ef.key] = true; break;
      case "unflag": delete S.flags[ef.key]; break;
      case "marryEligible": {
        const list = eligibleSingles();
        if (list.length) marry(S.playerId, pick(list).id);
        break;
      }
      case "revealPaternity": {
        for (const p of Object.values(S.people)) {
          if (alive(p) && p.concealed) { p.concealed = false; p.fatherId = p.realFatherId; }
        }
        S.honor = clamp(S.honor - B.honorLossOnReveal, B.honorMin, B.honorMax);
        log("Otalik oshkor bo'ldi.");
        break;
      }
    }
  }

  function choose(index) {
    if (!S.pending) return;
    const ev = EVENTS.find(e => e.id === S.pending);
    const ch = ev && ev.choices[index];
    if (ch) for (const ef of ch.effects || []) applyEffect(ef);
    S.pending = null;
    save();
  }

  // ---------- yillik hal qilish ----------
  function nextYear() {
    if (S.pending) return S;
    const natija = resolveYear(S, B);
    save();
    if (typeof render === "function") render();
    return natija;
  }

  function resolveYear(S, B) {
    S.year++;
    // iqtisod
    const living = Object.values(S.people).filter(alive).length;
    const net = S.money + B.yearlyIncomeBase - living * B.yearlyCostPerPerson;
    if (net < B.moneyMin) { S.debt += B.moneyMin - net; S.money = B.moneyMin; }
    else S.money = net;
    // aliment: sobiq xotinlarga
    const maosh = (S.job && S.job.salary) || B.yearlyIncomeBase;
    for (const p of Object.values(S.people)) {
      if (p.sobiq && alive(p)) S.money -= Math.round(maosh * B.alimony);
    }
    // qarz foizi faqat pul tugab, qarzga botilganda
    if (S.money <= B.moneyMin && S.debt > 0) S.debt = Math.round(S.debt + S.debt * B.debtInterestRate);
    // o'lim
    Object.values(S.people).filter(alive).forEach(mortality);
    // tug'ruq
    resolvePregnancies();
    // yangi homiladorlik
    Object.values(S.people).filter(p => p.sex === "f" && alive(p)).forEach(tryConceive);
    // yashirin otalik o'z-o'zidan oshkor bo'lishi
    for (const p of Object.values(S.people)) {
      if (alive(p) && p.concealed && rnd() < B.paternityRevealChance) {
        p.concealed = false; p.fatherId = p.realFatherId;
        S.honor = clamp(S.honor - B.honorLossOnReveal, B.honorMin, B.honorMax);
        log(`${fullName(p)}ning haqiqiy otasi oshkor bo'ldi.`);
      }
    }
    // voqealar
    for (let i = 0; i < B.eventsPerYear; i++) {
      const e = pickEvent();
      if (e) { S.pending = e.id; S.eventYear[e.id] = S.year; break; }
    }
    // o'yinchi o'lgan bo'lsa — merosxo'rga o'tish
    if (!alive(P(S.playerId))) succeed();
    if (rnd() < B.nightFlipChance) S.night = !S.night;
    return S;
  }

  function succeed() {
    const heirs = Object.values(S.people)
      .filter(p => alive(p) && p.sex === "m" && p.fatherId === S.playerId && age(p) >= B.adultAge)
      .sort((x, y) => x.born - y.born);
    if (heirs.length) { S.playerId = heirs[0].id; log(`Merosxo'r: ${fullName(heirs[0])}.`); }
    else { S.flags.over = true; log("Nasl tugadi."); }
  }

  // ---------- saqlash ----------
  function serialize(space) {
    const { balance, ...rest } = S; // balance saqlanmaydi; night saqlanadi
    return JSON.stringify(rest, null, space);
  }
  function save() {
    try { localStorage.setItem(B.saveKey, serialize()); } catch (e) { /* ruxsat yo'q */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(B.saveKey);
      if (!raw) return null;
      S = JSON.parse(raw); S.balance = B;
      S.eventYear = S.eventYear || {};
      return S;
    } catch (e) { return null; }
  }
  function exportJSON() { return serialize(1); }
  function importJSON(text) { S = JSON.parse(text); S.balance = B; save(); return S; }

  // ---------- yuklash ----------
  async function init(base = ".") {
    B = await (await fetch(`${base}/balance.json`)).json();
    EVENTS = await (await fetch(`${base}/events.json`)).json();
    NAMES = await (await fetch(`${base}/names.json`)).json();
    return load() || newGame();
  }

  return {
    init, newGame, nextYear, choose, marry, concealPaternity,
    relation, familyView, eligibleSingles, exportJSON, importJSON, save,
    tanishish, nikohTaklifi, ajralish,
    get state() { return S; }, get balance() { return B; },
    get events() { return EVENTS; }, age, fullName, person: P
  };
})();
