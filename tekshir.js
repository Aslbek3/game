function fertillik(yosh, jadval) {
    if (!jadval || jadval.length === 0) return 0;
    if (yosh <= jadval[0].yosh) return jadval[0].foiz;
    const oxirgi = jadval[jadval.length - 1];
    if (yosh >= oxirgi.yosh) return oxirgi.foiz;
    for (let i = 0; i < jadval.length - 1; i++) {
        const a = jadval[i];
        const b = jadval[i + 1];
        if (yosh >= a.yosh && yosh <= b.yosh) {
            const nisbat = (yosh - a.yosh) / (b.yosh - a.yosh);
            return a.foiz + (b.foiz - a.foiz) * nisbat;
        }
    }
    return 0;
}

const QIYINLIK_KOP = { yumshoq: 0.7, normal: 1, qattiq: 1.4 };

window.amal = function (holat, shaxsId, usulNomi, balans) {
    const sozlama = window.bilanQosh ? window.bilanQosh(holat.settings || {}) : (holat.settings || {});
    const shaxs = holat.people[shaxsId];

    if (!shaxs || shaxs.diedYear != null) return { ok: false, sabab: 'tirik' };
    const yosh = holat.year - shaxs.born;
    if (yosh < (sozlama.yosh ?? 0)) return { ok: false, sabab: 'yosh' };
    if ((shaxs.consanguinity || 0) > 0 && sozlama.qon === 'ochiq_emas') return { ok: false, sabab: 'qon' };

    const usul = balans.methods[usulNomi];
    if (!usul) return { ok: false, sabab: 'usul' };
    if ((shaxs.mehr || 0) < (usul.aloqaMin || 0)) return { ok: false, sabab: 'aloqa' };
    if (usul.kech && !holat.night) return { ok: false, sabab: 'kech' };
    if (holat.money < (usul.narx || 0)) return { ok: false, sabab: 'pul' };

    holat.money -= (usul.narx || 0);

    const muvaffaqiyat = usulNomi === 'majbur' ? true : Math.random() < usul.ehtimol;
    const qiyinlikKop = QIYINLIK_KOP[sozlama.qiyinlik] || 1;

    if (muvaffaqiyat) {
        shaxs.aloqa = true;
        shaxs.mehr = Math.max(0, Math.min(100, (shaxs.mehr || 0) + (usul.mehrFarq || 0)));
        shaxs.shubha = Math.max(0, Math.min(100, (shaxs.shubha || 0) + (usul.shubha || 0) * qiyinlikKop));
    } else {
        shaxs.mehr = Math.max(0, (shaxs.mehr || 0) - 3);
    }

    let homiladorBoldi = false;

    const allaqachonHomilador = holat.pregnancies.some(x => x.motherId === shaxs.id);
    if (shaxs.aloqa === true && yosh >= 11 && yosh <= 45 && !allaqachonHomilador && shaxs.jins === 'f') {
        const fert = fertillik(yosh, sozlama.fertillikJadvali);
        const ehtimol = (usul.homiladorlikFoiz || 0) * fert / 100;
        if (Math.random() * 100 < ehtimol) {
            holat.pregnancies.push({
                motherId: shaxs.id,
                realFatherId: holat.playerId,
                recordedFatherId: holat.playerId,
                dueYear: holat.year + (balans.pregnancyYears || 1)
            });
            homiladorBoldi = true;
        }
    }

    return { ok: true, muvaffaqiyat, homiladorBoldi };
};
