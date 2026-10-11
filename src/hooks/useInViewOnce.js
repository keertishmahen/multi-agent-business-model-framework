import { useEffect, useRef, useState } from "react";

/**
 * Observes an element and flips `inView` once when it enters the viewport.
 * Stays true after first intersect (no re-play on scroll up).
 */
export default function useInViewOnce({
  threshold = 0.15,
  rootMargin = "0px 0px -8% 0px",
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold, rootMargin]);

  return [ref, inView];
}
