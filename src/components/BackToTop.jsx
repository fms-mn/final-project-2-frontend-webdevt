import { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';

export default function BackToTop({ footerRef }) {
  const [visible, setVisible] = useState(false);
  const [footerOverlap, setFooterOverlap] = useState(0);

  useEffect(() => {
    let frame;
    const updatePosition = () => {
      setVisible(window.scrollY > 400);
      setFooterOverlap(Math.max(0, window.innerHeight - footerRef.current.getBoundingClientRect().top));
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.body);
    observer.observe(footerRef.current);
    updatePosition();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [footerRef]);

  if (!visible) return null;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className="back-to-top"
      style={{ '--footer-overlap': `${footerOverlap}px` }}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <FiArrowUp aria-hidden="true" />
    </button>
  );
}
