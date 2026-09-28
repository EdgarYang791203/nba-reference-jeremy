/** mock provider 的固定回應（滿足 materialGenSchema：summaryZh ≥ 200 字、tags 3–6 個英文小寫）。 */

export const MOCK_TITLE_ZH = '球員談新賽季規劃與身體狀況';

export const MOCK_SUMMARY_ZH =
    '這名球員在季前媒體日談到即將展開的新賽季，表示只要身體狀況允許就會繼續打下去，並強調會依照教練團的負荷管理計畫調整出賽時間。' +
    '他提到休賽季的訓練重點放在恢復與核心肌群，並對年輕隊友的成長表示樂觀。對於外界關注的退休話題，他回應目前沒有時間表，' +
    '一切以球隊的競爭力與自身健康為準。文章亦引述總教練的說法，指出球隊本季會更謹慎安排他的背靠背出賽，' +
    '季初的目標是讓陣容在十一月前磨合完成，並視情況調整輪替。報導最後整理了他近三季的出賽數據，' +
    '指出即便年紀增長，他在場上的效率仍維持在聯盟前段班，只是出賽時間將較往年略微下修。';

export const MOCK_TAGS = ['nba', 'veteran', 'preseason'];

/** 取原文第一句（供 keyQuotes 預設通過子字串比對） */
export function firstSentence(text: string): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^(.+?[.!?])(\s|$)/);
    return (match ? match[1] : cleaned.slice(0, 120)).trim();
}
