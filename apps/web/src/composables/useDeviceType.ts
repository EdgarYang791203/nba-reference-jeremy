/** UA 裝置偵測（自 fbcom 移植）。Live2D 入口在行動版只顯示靜態按鈕（9F.3）會用到。 */
import { onMounted, ref } from 'vue';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

function detectDeviceType(): DeviceType {
    if (typeof navigator === 'undefined') {
        return 'desktop';
    }
    const ua = navigator.userAgent;
    const platform = navigator.platform || '';
    // iPadOS 13+ 預設將 user agent 偽裝為 macOS，需用 maxTouchPoints 補偵測
    const isIPadOSMacLike = platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    // 先判斷平板：iPad / 一般 tablet 關鍵字 / Android 但沒有 Mobile 字串
    if (
        /iPad|Tablet|PlayBook/i.test(ua) ||
        (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
        isIPadOSMacLike
    ) {
        return 'tablet';
    }
    // 再判斷手機：Mobi 涵蓋 Android 手機（其 UA 必含 Mobile）與其他行動裝置
    if (/Mobi|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

export function useDeviceType() {
    const deviceType = ref<DeviceType>('desktop');

    onMounted(() => {
        deviceType.value = detectDeviceType();
    });

    return { deviceType };
}
