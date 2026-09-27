/** 球隊主色對照表（計畫書 9D.2）。Tailwind config 讀此表生成 bg-team-<abbr> 等 class。 */
export const TEAM_COLORS: Record<string, string> = {
    lal: '#552583',
    gsw: '#1D428A',
    phx: '#E56020',
    mia: '#98002E',
    lac: '#C8102E',
    phi: '#006BB6',
    bos: '#007A33',
    mil: '#00471B',
    den: '#0E2240',
    dal: '#00538C'
};

/** LAL 第二色等雙色需求（如 #FDB927）於實作素材卡時再擴充。 */
