"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const SHOW_OFFSET = 220;

export default function JumpToTopButton() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  const isBuilderPage = useMemo(
    () => pathname === "/builder" || pathname?.startsWith("/builder/"),
    [pathname],
  );

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > SHOW_OFFSET);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isBuilderPage || !isVisible) return null;

  return (
    <button
      aria-label='Jump to top'
      className='fixed bottom-4 right-4 z-[70] rounded-full border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#d7e7ff] shadow-[0_10px_24px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:border-[#a0c4ff] hover:text-[#a0c4ff] sm:bottom-5 sm:right-5 sm:text-[13px]'
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      type='button'
    >
      Top
    </button>
  );
}
