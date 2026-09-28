/**
 * 球隊色對照表（DS README「球隊標籤用球隊色對照表」）。
 * TEAM_COLORS = 標籤底色；TEAM_TEXT_COLORS = 標籤文字色（隊徽第二色，未列者用白）。
 * Tailwind config 讀此表生成 bg-team-<abbr> / text-team-<abbr>-text class。
 */
export const TEAM_COLORS: Record<string, string> = {
    atl: '#E03A3E',
    bos: '#007A33',
    bkn: '#000000',
    cha: '#1D1160',
    chi: '#CE1141',
    cle: '#860038',
    dal: '#00538C',
    den: '#0E2240',
    det: '#C8102E',
    gsw: '#1D428A',
    hou: '#CE1141',
    ind: '#002D62',
    lac: '#C8102E',
    lal: '#552583',
    mem: '#5D76A9',
    mia: '#98002E',
    mil: '#00471B',
    min: '#0C2340',
    nop: '#0C2340',
    nyk: '#006BB6',
    okc: '#007AC1',
    orl: '#0077C0',
    phi: '#006BB6',
    phx: '#E56020',
    por: '#E03A3E',
    sac: '#5A2D81',
    sas: '#C4CED4',
    tor: '#CE1141',
    uta: '#002B5C',
    was: '#002B5C'
};

export const TEAM_TEXT_COLORS: Record<string, string> = {
    lal: '#FDB927',
    gsw: '#FDB927',
    phx: '#0B0E14',
    den: '#FEC524',
    ind: '#FDBB30',
    mil: '#EEE1C6',
    sas: '#0B0E14',
    uta: '#F9A01B',
    min: '#78BE20',
    nop: '#C8102E',
    cha: '#00788C'
};

/** Tailwind colors.team：{ lal: '#552583', 'lal-text': '#FDB927', … } */
export const TEAM_TAILWIND_COLORS: Record<string, string> = Object.fromEntries([
    ...Object.entries(TEAM_COLORS),
    ...Object.entries(TEAM_TEXT_COLORS).map(([abbr, hex]) => [`${abbr}-text`, hex])
]);
