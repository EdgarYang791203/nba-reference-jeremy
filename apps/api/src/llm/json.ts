/** 模型輸出 JSON 的寬鬆解析：剝 markdown fence、取第一個 { 到最後一個 }。 */
export function parseJsonLoose(text: string): unknown {
    let s = text.trim();
    const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) {
        s = fence[1].trim();
    }
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('no JSON object found');
    }
    return JSON.parse(s.slice(start, end + 1));
}
