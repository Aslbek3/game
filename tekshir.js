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

window.amal = function (holat, shaxsId, usul, balans) {
    const sozlama = holat.sozlama;
    const qiyinlik = holat.qiyinlik;
    const shaxs = holat.shaxslar[shaxsId];

    if (!shaxs || !shaxs.tirik) return { ok: false, sabab: 'tirik' };
    if (shaxs.yosh < sozlama.yosh) return { ok: false, sabab: 'yosh' };
    if (shaxs.qon > 0 && sozlama.qon === 'ochiq_emas') return { ok: false, sabab: 'qon' };
    if (!balans.methods.includes(usul.id)) return { ok: false, sabab: 'usul' };
    if (shaxs.aloqa < usul.aloqaMin) return { ok: false, sabab: 'aloqa' };
    if (usul.kech && !holat.kech) return { ok: false, sabab: 'kech' };
    if (balans.pul < usul.narx) return { ok: false, sabab: 'pul' };

    balans.pul -= usul.narx;

    const muvaffaqiyat = usul.majbur ? true : Math.random() * 100 < usul.ehtimol;

    if (muvaffaqiyat) {
        shaxs.aloqa = true;
        shaxs.mehr = (shaxs.mehr || 0) + usul.mehrFarq;
        shaxs.shubha = (shaxs.shubha || 0) + usul.shubha * qiyinlik;
    } else {
        shaxs.mehr = (shaxs.mehr || 0) - 3;
    }

    let homiladorBoldi = false;

    if (shaxs.aloqa === true && shaxs.yosh >= 11 && shaxs.yosh <= 45 && !shaxs.homilador && shaxs.jins === 'f') {
        const fert = fertillik(shaxs.yosh, sozlama.fertillikJadvali);
        const ehtimol = usul.homiladorlikFoiz * fert / 100;
        if (Math.random() * 100 < ehtimol) {
            shaxs.homilador = { otaId: holat.player.id, oy: 0 };
            homiladorBoldi = true;
        }
    }

    return { ok: true, muvaffaqiyat, homiladorBoldi };
};
