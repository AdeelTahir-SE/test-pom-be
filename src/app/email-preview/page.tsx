"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { FileCode, Eye, Check, Copy } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function EmailPreviewPage() {
  const { t, lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Translate specific items for the email content depending on the active language
  const emailTitle = lang === "sl" ? "Dnevno poročilo dela" : "Daily Work Report";
  const emailHeaderSub = lang === "sl" ? "Dnevno poročilo terenskega dela" : "Daily Field Work Report";
  const emailCardTitle = lang === "sl" ? "Dnevna kartica zaključenega dela" : "Daily Completed Work Card";
  const emailCardSub = lang === "sl" 
    ? "Spodaj je povzetek uspešno opravljenih nalog in komentarjev, ki jih je oddal vaš terenski delavec." 
    : "Below is a summary of successfully completed tasks and comments submitted by your field worker.";
  const emailRoleLabel = lang === "sl" ? "Terenski vodja · BTC Ljubljana" : "Field Lead · BTC Ljubljana";
  const emailDateStr = lang === "sl" ? "16. junij 2026" : "June 16, 2026";
  const emailOverviewLabel = lang === "sl" ? "Pregled opravil (5/5 opravljeno)" : "Tasks Overview (5/5 completed)";
  
  const tasksList = lang === "sl" ? [
    { text: "Prevzem orodja in prevoz na lokacijo BTC", time: "08:14 ob" },
    { text: "Kositi travnik A (glavni vhod)", time: "09:02 ob" },
    { text: "Pokositi robove pri ograji", time: "09:45 ob" },
    { text: "Pobrati pokošeno travo v zabojnike", time: "10:15 ob" }
  ] : [
    { text: "Pick up tools and transit to BTC location", time: "at 08:14" },
    { text: "Mow lawn Area A (main entrance)", time: "at 09:02" },
    { text: "Trim edges near the fence", time: "at 09:45" },
    { text: "Collect mowed grass into waste bins", time: "at 10:15" }
  ];

  const voiceTitle = lang === "sl" ? "Zvočni zapis s terena" : "Voice Transcript from Field";
  const voiceQuote = lang === "sl" 
    ? "Delo na kosišču A poteka po načrtu, prehajam na kosišče B. Robovi so urejeni. Pripravljam fotografije zaključenega stanja."
    : "Work on mowing area A is going as planned, moving on to area B. Edges are trimmed. Preparing photos of the finished status.";
  const ctaBtnText = lang === "sl" ? "Poglej v komandnem centru" : "View in Command Center";
  const footerRightsStr = lang === "sl" ? "© 2026 pomocnik.net. Vse pravice pridržane." : "© 2026 pomocnik.net. All rights reserved.";
  const footerInfoStr = lang === "sl" 
    ? "To je avtomatsko dnevno poročilo o delu vaše ekipe na terenu." 
    : "This is an automated daily report regarding the work of your field team.";

  // The inline-CSS HTML email template content
  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B3A6B; padding: 24px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">
                    pomocnik<span style="color: #38bdf8;">.net</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 13px; color: #93c5fd; padding-top: 6px; font-weight: 500;">
                    ${emailHeaderSub}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 24px; background-color: #ffffff;">
              <h2 style="font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 0; margin-bottom: 8px;">
                ${emailCardTitle}
              </h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px; margin-top: 0;">
                ${emailCardSub}
              </p>

              <!-- Worker Info Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
                <tr>
                  <td width="48" valign="top">
                    <div style="width: 36px; height: 36px; background-color: #1B3A6B; border-radius: 18px; text-align: center; line-height: 36px; color: #ffffff; font-weight: bold; font-size: 13px;">
                      MH
                    </div>
                  </td>
                  <td valign="top" style="padding-left: 4px;">
                    <div style="font-size: 14px; font-weight: bold; color: #0f172a;">Matej Horvat</div>
                    <div style="font-size: 12px; color: #64748b; padding-top: 2px;">${emailRoleLabel}</div>
                  </td>
                  <td align="right" valign="top" style="font-size: 12px; color: #64748b; font-weight: 500;">
                    ${emailDateStr}
                  </td>
                </tr>
              </table>

              <!-- Task List Header -->
              <h3 style="font-size: 13px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; margin-top: 0;">
                ${emailOverviewLabel}
              </h3>

              <!-- Tasks list -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                ${tasksList.map((task, idx) => `
                <tr key="${idx}">
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a;">
                    <span style="color: #10b981; font-weight: bold; margin-right: 8px;">✓</span> ${task.text}
                  </td>
                  <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b;">
                    ${task.time}
                  </td>
                </tr>
                `).join('')}
              </table>

              <!-- Transcription Notes -->
              <h3 style="font-size: 13px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; margin-top: 0;">
                ${voiceTitle}
              </h3>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border-radius: 12px; border: 1px solid #d1fae5; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; color: #065f46; line-height: 1.5; font-style: italic;">
                    &ldquo;${voiceQuote}&rdquo;
                  </td>
                </tr>
              </table>

              <!-- Button CTA -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: center; margin-top: 32px;">
                <tr>
                  <td>
                    <a href="https://dnevnik.app/dashboard/office" style="background-color: #1B3A6B; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
                      ${ctaBtnText}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              ${footerRightsStr} <br>
              ${footerInfoStr}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewTitle = lang === "sl" ? "Predogled HTML Email predloge" : "HTML Email Template Preview";
  const backBtnText = lang === "sl" ? "Nazaj na nadzorno ploščo" : "Back to Dashboard";
  const copyBtnText = lang === "sl" ? "Kopiraj HTML kodo" : "Copy HTML Code";
  const copiedBtnText = lang === "sl" ? "Kopirano!" : "Copied!";
  const paneTitleVisual = lang === "sl" 
    ? "Vizualni predogled prejetega sporočila (Responsive)" 
    : "Live visual preview of received email (Responsive)";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0f172a] px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Logo className="h-8 w-auto" />
          </Link>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {previewTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/office">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              {backBtnText}
            </Button>
          </Link>
          <Button 
            size="sm" 
            onClick={copyToClipboard}
            className="h-9 text-xs bg-[#1B3A6B] hover:bg-[#142c52] text-white gap-1.5"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? copiedBtnText : copyBtnText}
          </Button>
        </div>
      </header>

      {/* Preview Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* Left pane: Code editor/viewer */}
        <section className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5"><FileCode className="w-4 h-4" /> index.html</span>
            <button 
              onClick={copyToClipboard}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied ? copiedBtnText : (lang === "sl" ? "Kopiraj" : "Copy")}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-5 text-[11px] font-mono leading-relaxed select-all">
            <code>{emailHtml}</code>
          </pre>
        </section>

        {/* Right pane: Interactive live preview */}
        <section className="flex flex-col bg-slate-100/60 dark:bg-[#0c111d] overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex items-center text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {paneTitleVisual}</span>
          </div>
          
          <div className="flex-1 overflow-auto p-8 flex justify-center">
            {/* Display rendered HTML via iframe */}
            <iframe 
              srcDoc={emailHtml}
              className="w-full max-w-[620px] bg-white rounded-2xl shadow-lg border border-slate-200/80 h-full min-h-[640px]"
              title="HTML Email Preview"
            />
          </div>
        </section>

      </main>
    </div>
  );
}
