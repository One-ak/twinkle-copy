"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AmbientParticles() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 2}px ${p.size / 2}px rgba(255, 255, 255, 0.4)`,
          }}
          animate={{
            y: ["0%", "-20%", "20%", "0%"],
            x: ["0%", "10%", "-10%", "0%"],
            opacity: [0, 0.6, 0.2, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
