"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function BackgroundGrid() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none flex justify-center overflow-hidden transition-colors">
      {/* Radial gradient for fading out the grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_80%)] z-10 transition-colors" />
      
      {/* The grid pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.05] opacity-[0.1]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)'
        }}
      />

      {/* Mouse Follow Glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 z-10"
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
        }}
        transition={{ type: "spring", damping: 40, stiffness: 200, mass: 0.5 }}
      />

      {/* Soft, magic glowing lights (Electric Blue and Vibrant Purple) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/15 blur-[120px]" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-500/15 blur-[120px]" />
    </div>
  );
}
