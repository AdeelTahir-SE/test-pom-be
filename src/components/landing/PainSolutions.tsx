'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/useLanguage';
import { FloatingBubble } from './FloatingBubble';

export function PainSolutions() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: t('tab0Label'),
      subtitle: t('tab0Subtitle'),
      pains: [],
      painSummary: '',
      solutions: [],
      solSummary: '',
    },
    {
      label: t('tab1Label'),
      subtitle: t('tab1Subtitle'),
      pains: [t('tab1Pain1'), t('tab1Pain2'), t('tab1Pain3')],
      painSummary: t('tab1Pain4'),
      solutions: [t('tab1Sol1'), t('tab1Sol2'), t('tab1Sol3')],
      solSummary: t('tab1Sol4'),
    },
    {
      label: t('tab2Label'),
      subtitle: t('tab2Subtitle'),
      pains: [t('tab2Pain1'), t('tab2Pain2'), t('tab2Pain3')],
      painSummary: t('tab2Pain4'),
      solutions: [t('tab2Sol1'), t('tab2Sol2'), t('tab2Sol3')],
      solSummary: t('tab2Sol4'),
    },
    {
      label: t('tab3Label'),
      subtitle: t('tab3Subtitle'),
      pains: [t('tab3Pain1'), t('tab3Pain2'), t('tab3Pain3')],
      painSummary: t('tab3Pain4'),
      solutions: [t('tab3Sol1'), t('tab3Sol2'), t('tab3Sol3')],
      solSummary: t('tab3Sol4'),
    },
  ];

  const currentTab = tabs[activeTab] ?? tabs[0]!;

  const userTypes = [
    t('userTypeOwners'),
    t('userTypeManagers'),
    t('userTypeSecretaries'),
    t('userTypeWorkers'),
  ];

  return (
    <section id="kako-deluje" className="max-w-7xl mx-auto px-3 md:px-6 pb-20">
      {/* Outer dark card — exact Figma gradient + border + shadow */}
      <div
        className="relative overflow-hidden rounded-[44px] border border-white/10"
        style={{
          background: 'linear-gradient(180deg, #172033 0%, #101827 100%)',
          boxShadow:
            '0px 40px 90px -45px rgba(15, 23, 42, 0.78), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.14)',
          minHeight: '620px',
        }}
      >
        {/* Content */}
        <div className="relative z-10 px-6 md:px-16 pt-12 pb-12 md:pb-16 flex flex-col gap-0">
          {/* Heading — Figma style */}
          <div className="flex flex-col items-start gap-1 mb-8">
            <span className="font-['Inter',sans-serif] text-[10px] md:text-sm font-medium tracking-[-0.04em] md:tracking-[0.02em] text-[#60A5FA] uppercase">
              {t('tabsLabel')}
            </span>
            <h2 className="font-['Inter',sans-serif] text-[30px] md:text-[40px] lg:text-5xl font-light tracking-[-0.075em] md:tracking-tight leading-[0.95] lg:leading-none text-white mt-2">
              {t('tabsTitle')}
            </h2>
            <p className="font-['Inter',sans-serif] text-[18px] md:text-2xl font-normal md:font-light tracking-tight md:tracking-normal text-white mt-6 md:mt-4 md:leading-relaxed">
              {currentTab.subtitle}
            </p>
          </div>

          {/* Tab Pills — Figma gap-3, mb 24px before cards */}
          <div className="flex flex-wrap items-center gap-3 mb-10">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                id={`pain-tab-${idx}`}
                onClick={() => setActiveTab(idx)}
                className="flex items-center gap-3 rounded-full transition-all duration-300 text-[14px]"
                style={{
                  padding: '10px 20px',
                  height: '42px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '20px',
                  ...(activeTab === idx
                    ? {
                        background: '#FFFFFF',
                        color: '#0F172A',
                        boxShadow: 'inset 0px 1px 0px #FFFFFF',
                      }
                    : {
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.6)',
                      }),
                }}
              >
                <span className="uppercase tracking-wider">{tab.label}</span>
                {activeTab === idx && (
                  <iconify-icon
                    icon="solar:arrow-right-linear"
                    style={{ fontSize: '16px', color: '#0F172A' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Two-column layout based on active tab */}
          {activeTab === 0 ? (
            /* Tab 0: Benefits for All layout */
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">
              {/* Left Column: MOBI / TERENSKA EKIPA */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-['Roboto',sans-serif] text-xs md:text-xs font-normal tracking-[0.1em] text-[#60A5FA] uppercase mb-1">
                    {t('benefitsMobiLabel')}
                  </p>
                  <h4 className="font-['Roboto',sans-serif] text-[16px] md:text-[20px] font-medium md:font-light text-[#60A5FA] uppercase mb-4">
                    {t('benefitsMobiTitle')}
                  </h4>
                </div>

                <div className="flex flex-col gap-3">
                  {/* MOBI Card 1 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:checklist-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsMobiItem1')}
                    </p>
                  </div>

                  {/* MOBI Card 2 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:gallery-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsMobiItem2')}
                    </p>
                  </div>

                  {/* MOBI Card 3 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:microphone-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsMobiItem3')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: DESKTOP / PISARNA */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-['Roboto',sans-serif] text-xs md:text-xs font-normal tracking-[0.1em] text-[#60A5FA] uppercase mb-1">
                    {t('benefitsOfficeLabel')}
                  </p>
                  <h4 className="font-['Roboto',sans-serif] text-[16px] md:text-[20px] font-medium md:font-light text-[#60A5FA] uppercase mb-4">
                    {t('benefitsOfficeTitle')}
                  </h4>
                </div>

                <div className="flex flex-col gap-3">
                  {/* DESKTOP Card 1 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:shield-check-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsOfficeItem1')}
                    </p>
                  </div>

                  {/* DESKTOP Card 2 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:users-group-two-rounded-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsOfficeItem2')}
                    </p>
                  </div>

                  {/* DESKTOP Card 3 */}
                  <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px] hover:bg-white/[0.1] transition-all duration-300">
                    <span className="shrink-0 text-white flex items-center justify-center">
                      <iconify-icon
                        icon="solar:refresh-square-linear"
                        style={{ fontSize: '18px', color: '#BFDBFE' }}
                      />
                    </span>
                    <p className="font-['Inter',sans-serif] text-base md:text-base font-normal text-white leading-normal">
                      {t('benefitsOfficeItem3')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard comparison columns (for tabs 1, 2, 3) */
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">
              {/* TRENUTNO Column */}
              <div>
                <p
                  className="mb-4 uppercase"
                  style={{
                    fontFamily: 'Roboto, Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '20px',
                    lineHeight: '28px',
                    color: '#60A5FA',
                  }}
                >
                  {t('tab1PainHeader') || 'Trenutno'}
                </p>
                <div className="flex flex-col gap-4">
                  {currentTab.pains.map((pain, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="shrink-0 pt-[5.5px]">
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 17 17"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M7.06857 8.19999L4.80583 5.93725L5.9372 4.80588L8.19994 7.06862L10.4627 4.80588L11.5941 5.93725L9.33131 8.19999L11.5941 10.4627L10.4627 11.5941L8.19994 9.33136L5.9372 11.5941L4.80583 10.4627L7.06857 8.19999ZM13.8568 13.8568C10.7326 16.981 5.66725 16.981 2.54308 13.8568C-0.581111 10.7326 -0.581111 5.66733 2.54308 2.54314C5.66725 -0.581032 10.7326 -0.581061 13.8568 2.54314C16.981 5.6673 16.981 10.7327 13.8568 13.8568ZM12.7254 12.7255C15.2248 10.2261 15.2248 6.17387 12.7254 3.67451C10.2261 1.17515 6.17382 1.17514 3.67446 3.67451C1.1751 6.17386 1.1751 10.2261 3.67446 12.7255C6.17382 15.2248 10.2261 15.2248 12.7254 12.7255Z"
                            fill="#151E23"
                            fillOpacity="0.6"
                            stroke="white"
                            strokeWidth="0.4"
                          />
                        </svg>
                      </span>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 300,
                          fontSize: '16px',
                          lineHeight: '28px',
                          color: '#FFFFFF',
                        }}
                      >
                        {pain}
                      </p>
                    </div>
                  ))}
                  {/* Summary row */}
                  {currentTab.painSummary && (
                    <div className="flex items-center gap-3 mt-2 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px]">
                      <span className="shrink-0 flex items-center justify-center">
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 17 17"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M7.06857 8.19999L4.80583 5.93725L5.9372 4.80588L8.19994 7.06862L10.4627 4.80588L11.5941 5.93725L9.33131 8.19999L11.5941 10.4627L10.4627 11.5941L8.19994 9.33136L5.9372 11.5941L4.80583 10.4627L7.06857 8.19999ZM13.8568 13.8568C10.7326 16.981 5.66725 16.981 2.54308 13.8568C-0.581111 10.7326 -0.581111 5.66733 2.54308 2.54314C5.66725 -0.581032 10.7326 -0.581061 13.8568 2.54314C16.981 5.6673 16.981 10.7327 13.8568 13.8568ZM12.7254 12.7255C15.2248 10.2261 15.2248 6.17387 12.7254 3.67451C10.2261 1.17515 6.17382 1.17514 3.67446 3.67451C1.1751 6.17386 1.1751 10.2261 3.67446 12.7255C6.17382 15.2248 10.2261 15.2248 12.7254 12.7255Z"
                            fill="#151E23"
                            fillOpacity="0.6"
                            stroke="white"
                            strokeWidth="0.4"
                          />
                        </svg>
                      </span>
                      <p
                        className="font-semibold text-white leading-normal"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                        }}
                      >
                        {currentTab.painSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* JUTRI Column */}
              <div>
                <p
                  className="mb-4 uppercase"
                  style={{
                    fontFamily: 'Roboto, Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '20px',
                    lineHeight: '28px',
                    color: '#60A5FA',
                  }}
                >
                  {t('tab1SolHeader') || 'Jutri'}
                </p>
                <div className="flex flex-col gap-4">
                  {currentTab.solutions.map((sol, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="shrink-0 pt-[6.5px]">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M15 7.5C15 11.6423 11.6423 15 7.5 15C3.35775 15 0 11.6423 0 7.5C0 3.35775 3.35775 0 7.5 0C11.6423 0 15 3.35775 15 7.5ZM10.5225 5.2275C10.7418 5.44711 10.7418 5.80289 10.5225 6.0225L6.7725 9.7725C6.55289 9.99184 6.19711 9.99184 5.9775 9.7725L4.4775 8.2725C4.32701 8.13227 4.26506 7.92108 4.31596 7.72178C4.36686 7.52248 4.52248 7.36686 4.72178 7.31596C4.92108 7.26506 5.13227 7.32701 5.2725 7.4775L6.375 8.58L8.05125 6.90375L9.7275 5.2275C9.94711 5.00816 10.3029 5.00816 10.5225 5.2275Z"
                            fill="#3B82F6"
                          />
                        </svg>
                      </span>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 400,
                          fontSize: '16px',
                          lineHeight: '28px',
                          color: '#FFFFFF',
                        }}
                      >
                        {sol}
                      </p>
                    </div>
                  ))}
                  {/* Summary row */}
                  {currentTab.solSummary && (
                    <div className="flex items-center gap-3 mt-2 p-3 px-4 bg-white/[0.07] border border-white/10 rounded-2xl shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08)] min-h-[54px]">
                      <span className="shrink-0 flex items-center justify-center">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M15 7.5C15 11.6423 11.6423 15 7.5 15C3.35775 15 0 11.6423 0 7.5C0 3.35775 3.35775 0 7.5 0C11.6423 0 15 3.35775 15 7.5ZM10.5225 5.2275C10.7418 5.44711 10.7418 5.80289 10.5225 6.0225L6.7725 9.7725C6.55289 9.99184 6.19711 9.99184 5.9775 9.7725L4.4775 8.2725C4.32701 8.13227 4.26506 7.92108 4.31596 7.72178C4.36686 7.52248 4.52248 7.36686 4.72178 7.31596C4.92108 7.26506 5.13227 7.32701 5.2725 7.4775L6.375 8.58L8.05125 6.90375L9.7275 5.2275C9.94711 5.00816 10.3029 5.00816 10.5225 5.2275Z"
                            fill="#3B82F6"
                          />
                        </svg>
                      </span>
                      <p
                        className="font-bold text-white leading-normal"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                        }}
                      >
                        {currentTab.solSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom separator + KORISTNO ZA */}
          <div
            className="pt-8 flex flex-col gap-4 mt-6"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <p
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '16px',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {t('koristnoZaLabel')}
            </p>
            <div className="flex flex-wrap gap-3">
              {userTypes.map((type) => (
                <span
                  key={type}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 0 && (
          <FloatingBubble
            title="Ne gradimo novega načina dela."
            subtitle="Gradimo most med terenom in pisarno."
            rotation={-2}
            className="right-8 bottom-8 hidden lg:block"
          />
        )}
        {activeTab === 2 && (
          <FloatingBubble
            title="Uspešno podjetje ne temelji na več komunikacije."
            subtitle="Temelji na tem, da je potrebne čim manj."
            rotation={-2}
            className="right-8 bottom-8 hidden lg:block"
          />
        )}
      </div>
    </section>
  );
}
