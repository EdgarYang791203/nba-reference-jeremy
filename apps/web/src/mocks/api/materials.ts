import type { Material, Paginated } from '~/types/api';

const PAGE_SIZE = 20;

const SUMMARY_LEBRON =
    'LeBron James 在季前媒體日談到即將展開的第 24 個賽季，表示只要身體狀況允許，他就會繼續打下去，並強調自己會依照教練團的負荷管理計畫調整出賽時間。他提到休賽季的訓練重點放在恢復與核心肌群，並對年輕隊友的成長表示樂觀。對於外界關注的退休話題，他回應目前沒有時間表，一切以球隊的競爭力與自身健康為準。文章亦引述總教練的說法，指出湖人本季會更謹慎安排他的背靠背出賽，季初的目標是讓陣容在 11 月前磨合完成。';

const SUMMARY_CURRY =
    'Stephen Curry 在季前賽對太陽的比賽中攻下 28 分，帶領勇士在第四節逆轉取勝。賽後總教練表示本季會持續採取負荷管理策略，讓 Curry 在例行賽維持體能，並談到新陣容在外線與擋拆配合上的進步。Curry 本人則指出自己對於三分投射的手感相當有信心，也提到球隊希望在季初就建立防守強度。文章另整理了他近三季的三分命中率變化，指出即便年紀增長，他的投籃效率仍維持在聯盟頂級水準，只是出賽時間將較往年略微下修。';

const SUMMARY_DURANT =
    'Kevin Durant 因小腿拉傷，太陽隊醫療團隊預計他將缺席約兩週，包含季前賽剩餘場次與例行賽開季前幾場比賽。球隊表示這是預防性措施，避免傷勢惡化影響整季。總教練指出在 Durant 缺陣期間，將由年輕側翼分擔進攻責任，並藉此測試不同的輪替組合。Durant 本人透過社群平台回應球迷，表示恢復狀況良好，會盡快回到場上。文章也回顧他過去兩季的傷病紀錄，並分析太陽在他缺陣時的攻守效率變化。';

const SUMMARY_GENERIC =
    '這是一篇由每日排程自動生成的外電中文摘要示範內容，用來在開發階段呈現素材卡片與詳情視窗的版面。正式上線後，摘要將由 Claude Haiku 依原文客觀轉述，長度介於 300 到 500 字之間，並附上原文中的真實引述與來源連結。摘要不包含評論，圖片一律外連並標註來源，版權策略依計畫書第 2 章所述採「摘要 + 短引述 + 原文連結 + 來源標註」。開發期間此段文字重複填充以達到規格要求的字數下限，方便檢視排版與行高。';

interface Seed {
    playerId: number;
    titleZh: string;
    sourceName: string;
    date: string;
    summaryZh?: string;
    keyQuotes?: string[];
    tags: string[];
    thumb: number;
}

const SEEDS: Seed[] = [
    {
        playerId: 1,
        titleZh: 'LeBron 談第 24 季：「身體還允許，就繼續」',
        sourceName: 'ESPN',
        date: '2026-09-28',
        summaryZh: SUMMARY_LEBRON,
        keyQuotes: ['As long as my body allows me to, I will keep going.'],
        tags: ['lakers', 'lebron', 'preseason'],
        thumb: 1
    },
    {
        playerId: 1,
        titleZh: '湖人季前賽輪替觀察：Reaves 上位、LeBron 出賽時間下修',
        sourceName: 'CBS Sports',
        date: '2026-09-27',
        tags: ['lakers', 'rotation', 'preseason'],
        thumb: 2
    },
    {
        playerId: 2,
        titleZh: 'Curry 季前賽 28 分帶隊逆轉，教練談負荷管理',
        sourceName: 'ESPN',
        date: '2026-09-28',
        summaryZh: SUMMARY_CURRY,
        keyQuotes: ['We are going to be smart with his minutes all season.'],
        tags: ['warriors', 'curry', 'load-management'],
        thumb: 3
    },
    {
        playerId: 3,
        titleZh: 'Durant 傷勢更新：太陽預計缺席兩週',
        sourceName: 'Yahoo Sports',
        date: '2026-09-28',
        summaryZh: SUMMARY_DURANT,
        keyQuotes: ['It is precautionary. We want him at full strength for the long haul.'],
        tags: ['suns', 'durant', 'injury'],
        thumb: 4
    },
    {
        playerId: 4,
        titleZh: 'Harden 交易流言再起，快艇否認接觸',
        sourceName: 'HoopsHype',
        date: '2026-09-27',
        tags: ['clippers', 'harden', 'trade-rumor'],
        thumb: 1
    },
    {
        playerId: 5,
        titleZh: 'Butler 續約談判進入尾聲，熱火內部看法分歧',
        sourceName: 'ESPN',
        date: '2026-09-26',
        tags: ['heat', 'butler', 'contract'],
        thumb: 2
    },
    {
        playerId: 2,
        titleZh: 'Curry 的 38 歲三分紀錄：數據對照與衰退曲線',
        sourceName: 'CBS Sports',
        date: '2026-09-26',
        tags: ['warriors', 'curry', 'stats'],
        thumb: 3
    },
    {
        playerId: 6,
        titleZh: 'Paul George 復健進度：預計十一月回歸',
        sourceName: 'HoopsHype',
        date: '2026-09-25',
        tags: ['sixers', 'paul-george', 'injury'],
        thumb: 4
    },
    {
        playerId: 1,
        titleZh: 'LeBron 與 Bronny 首次同場季前賽，父子連線引熱議',
        sourceName: 'Yahoo Sports',
        date: '2026-09-25',
        tags: ['lakers', 'lebron', 'bronny'],
        thumb: 1
    },
    {
        playerId: 3,
        titleZh: '太陽教練談 Durant 缺陣期間的側翼輪替',
        sourceName: 'CBS Sports',
        date: '2026-09-24',
        tags: ['suns', 'rotation', 'injury'],
        thumb: 2
    },
    {
        playerId: 4,
        titleZh: 'Harden 季前賽 12 助攻，強調願意為球隊調整角色',
        sourceName: 'ESPN',
        date: '2026-09-24',
        tags: ['clippers', 'harden', 'preseason'],
        thumb: 3
    },
    {
        playerId: 5,
        titleZh: 'Butler 談熱火文化：「我們不需要外界的認可」',
        sourceName: 'HoopsHype',
        date: '2026-09-23',
        tags: ['heat', 'butler', 'culture'],
        thumb: 4
    }
];

export const MOCK_MATERIALS: Material[] = SEEDS.map((seed, index) => ({
    id: index + 1,
    playerId: seed.playerId,
    date: seed.date,
    sourceUrl: `https://example.com/${seed.sourceName.toLowerCase().replace(/\s+/g, '-')}/${index + 1}`,
    sourceName: seed.sourceName,
    publishedAt: `${seed.date}T08:00:00.000Z`,
    titleZh: seed.titleZh,
    summaryZh: seed.summaryZh ?? SUMMARY_GENERIC,
    keyQuotes: seed.keyQuotes ?? [],
    // 縮圖外連圖先留空，讓 BaseImage 走 fallback 像素底圖（9E.3）
    imageUrl: null,
    tags: seed.tags,
    score: 8,
    status: 'published',
    createdAt: `${seed.date}T05:30:00.000Z`
}));

export function getMockMaterials(params: Record<string, unknown>): Paginated<Material> {
    const playerId = params.playerId !== undefined ? Number(params.playerId) : undefined;
    const source = typeof params.source === 'string' && params.source ? params.source : undefined;
    const page = Math.max(1, Number(params.page ?? 1) || 1);

    const filtered = MOCK_MATERIALS.filter((m) => {
        if (playerId !== undefined && m.playerId !== playerId) {
            return false;
        }
        if (source && m.sourceName !== source) {
            return false;
        }
        return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (page - 1) * PAGE_SIZE;
    return {
        items: filtered.slice(start, start + PAGE_SIZE),
        page,
        pageSize: PAGE_SIZE,
        total: filtered.length
    };
}

export function getMockMaterial(id: number): Material | null {
    return MOCK_MATERIALS.find((m) => m.id === id) ?? null;
}
