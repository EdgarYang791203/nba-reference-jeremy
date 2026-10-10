/**
 * Intersection Observer 包裝工具（自 fbcom 移植）。
 * 提供單元素 (useIntersectionObserver) 與多元素 (useIntersectionObserverMulti) 的觀察功能。
 * @example
 *   const { isIntersection, intersectionObserver } = useIntersectionObserver(0.1);
 *   <div :ref="intersectionObserver">...</div>
 */
import { computed, onUnmounted, ref } from 'vue';

type IntersectionKey = string;

export function useIntersectionObserverMulti(
    defaultThreshold: number | number[] = 0.5,
    defaultOptions: Omit<IntersectionObserverInit, 'threshold'> = {}
) {
    const states = ref<Record<IntersectionKey, boolean>>({});
    const elementToKey = new WeakMap<Element, IntersectionKey>();
    const elementToObserverKey = new WeakMap<Element, string>();
    const elementToRequiredThreshold = new WeakMap<Element, number>();
    const observers = new Map<string, IntersectionObserver>();

    const rootIds = new WeakMap<Element, number>();
    let nextRootId = 1;

    const normalizeThreshold = (t: number | number[]) => (Array.isArray(t) ? t : [t]);

    const toRequiredThreshold = (t: number | number[] | undefined) => {
        if (t === undefined) {
            return 0;
        }
        if (Array.isArray(t)) {
            return Math.max(0, ...t);
        }
        return Math.max(0, t);
    };

    const getRootKey = (root: Element | null | undefined) => {
        if (!root) {
            return 'root:0';
        }
        let id = rootIds.get(root);
        if (!id) {
            id = nextRootId++;
            rootIds.set(root, id);
        }
        return `root:${id}`;
    };

    const buildObserverKey = (init: IntersectionObserverInit) => {
        const rootKey = getRootKey(init.root as Element | null | undefined);
        const marginKey = `margin:${init.rootMargin ?? ''}`;
        const thresholdKey = `threshold:${normalizeThreshold(init.threshold ?? 0).join(',')}`;
        return `${rootKey}|${marginKey}|${thresholdKey}`;
    };

    const ensureObserver = (init: IntersectionObserverInit) => {
        const observerKey = buildObserverKey(init);
        const existing = observers.get(observerKey);
        if (existing) {
            return { observerKey, observer: existing };
        }

        const created = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const key = elementToKey.get(entry.target);
                if (!key) {
                    return;
                }
                const required = elementToRequiredThreshold.get(entry.target) ?? 0;
                states.value[key] =
                    required === 0 ? entry.isIntersecting : entry.intersectionRatio >= required;
            });
        }, init);

        observers.set(observerKey, created);
        return { observerKey, observer: created };
    };

    const observe = (el: Element, key: IntersectionKey, overrides?: IntersectionObserverInit) => {
        // If the element was already observed, detach it from its previous observer first.
        unobserve(el);

        const init: IntersectionObserverInit = {
            root: overrides?.root ?? defaultOptions.root ?? null,
            rootMargin: overrides?.rootMargin ?? defaultOptions.rootMargin,
            threshold: overrides?.threshold ?? defaultThreshold
        };

        const { observerKey, observer } = ensureObserver(init);
        elementToKey.set(el, key);
        elementToObserverKey.set(el, observerKey);
        elementToRequiredThreshold.set(
            el,
            toRequiredThreshold(init.threshold as number | number[] | undefined)
        );
        if (states.value[key] === undefined) {
            states.value[key] = false;
        }
        observer.observe(el);
    };

    const unobserve = (el: Element) => {
        const observerKey = elementToObserverKey.get(el);
        if (observerKey) {
            observers.get(observerKey)?.unobserve(el);
            elementToObserverKey.delete(el);
        } else {
            // Fallback: try unobserving from all observers.
            observers.forEach((obs) => obs.unobserve(el));
        }
        elementToKey.delete(el);
        elementToRequiredThreshold.delete(el);
    };

    const disconnect = () => {
        observers.forEach((obs) => obs.disconnect());
        observers.clear();
    };

    onUnmounted(() => {
        disconnect();
    });

    return { states, observe, unobserve, disconnect };
}

// Backwards-compatible wrapper (single element -> single boolean)
export function useIntersectionObserver(threshold = 0.5) {
    const elRef = ref<Element | null>(null);
    const { states, observe, unobserve } = useIntersectionObserverMulti(threshold);
    const isIntersection = computed(() => Boolean(states.value.default));

    const intersectionObserver = (el: Element) => {
        if (elRef.value) {
            unobserve(elRef.value);
        }
        elRef.value = el;
        observe(el, 'default');
    };

    const unobserver = () => {
        if (!elRef.value) {
            return;
        }
        unobserve(elRef.value);
        elRef.value = null;
    };

    onUnmounted(() => {
        unobserver();
    });

    return { elRef, isIntersection, intersectionObserver };
}
