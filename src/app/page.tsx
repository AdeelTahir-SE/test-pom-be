"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";

import { TargetIndustries } from "@/components/landing/TargetIndustries";
import { PainSolutions } from "@/components/landing/PainSolutions";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { TransformationSlider } from "@/components/landing/TransformationSlider";
import { ImpactSection } from "@/components/landing/ImpactSection";
import { NewFunctionalities } from "@/components/landing/NewFunctionalities";
import { Pricing } from "@/components/landing/Pricing";
import { DeadlineOffer } from "@/components/landing/DeadlineOffer";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  // Always start at the top on load/refresh (don't restore mid-page scroll or hash jumps)
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
    console.log("build 0.1");
  }, []);

  // Lerp Mouse Trail Effect for Liquid Cursor Glow
  useEffect(() => {
    const glowEl = document.getElementById("aura-liquid-glow");
    if (!glowEl) return;

    let mouseX = -9999;
    let mouseY = -9999;
    let currentX = -9999;
    let currentY = -9999;
    let isInitialized = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isInitialized) {
        currentX = mouseX;
        currentY = mouseY;
        isInitialized = true;
      }
    };

    const animateGlow = () => {
      if (isInitialized) {
        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;
        glowEl.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
      }
      requestAnimationFrame(animateGlow);
    };

    window.addEventListener("mousemove", handleMouseMove);
    const animationFrameId = requestAnimationFrame(animateGlow);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden selection:bg-[#1B3A6B]/10 selection:text-[#1B3A6B] relative bg-transparent">
      
      {/* Solid background base */}
      <div className="fixed inset-0 -z-20 bg-[#f3f5f8] dark:bg-[#0b0f19] pointer-events-none" />



      {/* Liquid cursor glow element */}
      <div 
        id="aura-liquid-glow" 
        className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-30 mix-blend-screen dark:mix-blend-lighten blur-[85px] opacity-0 md:opacity-75 transition-opacity duration-1000"
        style={{
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(99, 102, 241, 0.08) 40%, rgba(27, 58, 107, 0.02) 80%, transparent 100%)",
          transform: "translate3d(-9999px, -9999px, 0)",
        }}
      />

      {/* Ambient background glow blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Soft blue ambient glow */}
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-blue-200/35 blur-[7.5rem] will-change-transform" />
      
        {/* Soft sky/silver glow */}
        <div className="aura-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-sky-200/22 blur-[8.75rem] will-change-transform" />
      
        {/* White glassy light wash */}
        <div className="aura-bg-blob-three absolute top-[36%] left-[36%] w-[30vw] h-[30vw] rounded-full bg-white/55 blur-[5rem] will-change-transform" />
      
        {/* Subtle moving dot texture */}
        <div 
          className="aura-bg-dots absolute inset-0 opacity-[0.22] bg-repeat" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.09) 1px, transparent 0)",
            backgroundSize: "2rem 2rem"
          }}
        />
      </div>

      {/* Landing Content Blocks */}
      <div className="relative z-10">
        <Navbar />
        <Hero />

        <PainSolutions />
        <DashboardPreview />
        <TransformationSlider />
        <ImpactSection />
        <NewFunctionalities />
        <Pricing />
        <DeadlineOffer />
        <TargetIndustries />
        <Footer />
      </div>
    </div>
  );
}
