'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { PrimeriNavbar } from '@/components/landing/PrimeriNavbar';
import { useLanguage } from '@/lib/useLanguage';
import {
  Mic,
  MessageSquare,
  CheckCircle2,
  Globe,
  Trees,
  Truck,
  CalendarDays,
  Sparkles,
  Clock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from 'lucide-react';

// Card interface definitions
interface CardItem {
  icon: React.ComponentType<any>;
  title: string;
  badge: string;
  quote: string;
  desc: string;
}

const CustomIconS1C3 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="20"
    viewBox="0 0 18 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0.625 7.825C0.625 4.4311 0.625 2.7337 1.66678 1.6798C2.70856 0.625 4.38411 0.625 7.73611 0.625H9.51389C12.8659 0.625 14.5423 0.625 15.5832 1.6798C16.6241 2.7346 16.625 4.4311 16.625 7.825V11.425C16.625 14.8189 16.625 16.5163 15.5832 17.5702C14.5414 18.6241 12.8659 18.625 9.51389 18.625H7.73611C4.38411 18.625 2.70767 18.625 1.66678 17.5702C0.625 16.5154 0.625 14.8189 0.625 11.425V7.825Z"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.25}
    />
    <path
      d="M5.625 9.95833H12.2917M5.625 6.625H12.2917M5.625 13.2917H9.79167"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.25}
      strokeLinecap="round"
    />
  </svg>
);

const CustomIconS2C2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.38104 0.562203L7.51176 2.05638M8.55755 14.0098L8.68827 15.504M2.05795 8.55598L0.563774 8.6867M15.5055 7.37947L14.0114 7.51019M13.3372 1.7146L11.8099 3.37717M1.71549 2.73136L3.50827 4.10347M4.24698 12.5471L2.73219 14.3523M14.3538 13.3348L12.5486 11.82"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.12491}
      strokeLinecap="round"
    />
  </svg>
);

const CustomIconS3C2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M17.2917 8.95833C17.2917 13.5608 13.5608 17.2917 8.95833 17.2917C4.35583 17.2917 0.625 13.5608 0.625 8.95833C0.625 4.35583 4.35583 0.625 8.95833 0.625C13.5608 0.625 17.2917 4.35583 17.2917 8.95833V8.95833"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.25}
    />
    <path
      d="M0.625 8.95833H3.125M14.7917 8.95833H17.2917M8.95833 17.2917V14.7917M8.95833 3.125V0.625"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.25}
      strokeLinecap="round"
    />
    <path
      d="M7.29297 8.95866H10.6263M8.95964 10.6253V7.29199"
      stroke="#3B82F6"
      strokeOpacity={0.8}
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CustomIconS4C1 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8.0421 10.8171C8.28769 10.5724 8.28844 10.1744 8.04378 9.92882C7.79911 9.68322 7.40108 9.68247 7.15549 9.92714L8.0421 10.8171ZM7.25847 5.16747C7.54932 5.34204 7.92623 5.25405 8.10972 4.96874C8.29321 4.68343 8.21694 4.30397 7.93745 4.11172L7.25847 5.16747ZM9.41848 14.4423L8.97476 14.8861L9.0049 14.9145L9.41848 14.4423ZM13.8758 10.0318C13.6875 9.74068 13.2983 9.65721 13.0072 9.84551C12.7161 10.0338 12.6326 10.423 12.8209 10.7141L13.8758 10.0318ZM9.85635 14.8258L10.3001 14.3821L10.285 14.367L10.2699 14.3544L9.85635 14.8258ZM15.5 7.34009L10.6048 12.2203L11.4923 13.1095L16.3866 8.2284L15.5 7.34009ZM6.89261 12.2203L5.74228 11.0733L4.85567 11.9641L6.006 13.1111L6.89261 12.2203ZM5.74228 7.37777L10.6383 2.4967L9.75086 1.60756L4.85567 6.48863L5.74228 7.37777ZM13.6439 1.25592H14.1203V7.32179e-05H13.6431L13.6439 1.25592ZM16.7441 3.8706V4.34531H17.9999V3.8706H16.7441ZM14.1203 1.25592C14.9039 1.25592 15.4297 1.2576 15.8207 1.30951C16.1941 1.35974 16.3506 1.44597 16.4528 1.54728L17.3394 0.658138C16.9651 0.284732 16.4996 0.13403 15.9873 0.0653774C15.4933 -0.00160125 14.8687 7.32179e-05 14.1203 7.32179e-05V1.25592ZM17.9999 3.8706C17.9999 3.12379 18.0016 2.50089 17.9346 2.00776C17.866 1.49621 17.7136 1.03154 17.3394 0.658138L16.4511 1.54728C16.5532 1.64858 16.6395 1.80431 16.6897 2.1752C16.7416 2.56535 16.7441 3.08779 16.7441 3.8706H17.9999ZM5.74311 11.0742C5.18804 10.5216 4.81799 10.1498 4.57855 9.83672C4.34999 9.53867 4.30143 9.36787 4.30143 9.22554H3.04561C3.04561 9.75467 3.26747 10.19 3.58143 10.6003C3.88366 10.9955 4.32655 11.435 4.85567 11.9633L5.74311 11.0742ZM6.00516 13.1095C6.53428 13.6369 6.97633 14.079 7.37233 14.3804C7.7834 14.6935 8.21959 14.9137 8.74871 14.9137V13.6579C8.60387 13.6579 8.43225 13.6085 8.13252 13.3816C7.8194 13.1421 7.44684 12.7729 6.89261 12.2203L6.00516 13.1095ZM16.3866 8.2284C17.0555 7.5628 17.521 7.1132 17.7663 6.52379L16.6068 6.04238C16.4804 6.34713 16.2409 6.60082 15.5 7.34009L16.3866 8.2284ZM16.7441 4.34531C16.7441 5.39101 16.7332 5.73763 16.6068 6.04238L17.7663 6.52379C18.0108 5.93438 17.9999 5.28803 17.9999 4.34531H16.7441ZM10.6375 2.49754C11.3784 1.75826 11.6338 1.51965 11.9393 1.39323L11.4604 0.232824C10.8702 0.476459 10.4198 0.941123 9.75086 1.60756L10.6375 2.49754ZM13.6431 7.32179e-05C12.697 7.32179e-05 12.0507 -0.0108108 11.4604 0.232824L11.9393 1.39323C12.2458 1.26764 12.5957 1.25592 13.6439 1.25592L13.6431 7.32179e-05ZM6.31744 12.536L8.0421 10.8171L7.15549 9.92714L5.43083 11.6468L6.31744 12.536ZM7.93745 4.11172L7.41084 3.77264L6.73103 4.82839L7.25847 5.16747L7.93745 4.11172ZM7.41084 3.77264C6.89093 3.43775 6.47065 3.16649 6.10981 2.97225C5.73977 2.77299 5.394 2.6315 5.01139 2.5754L4.82804 3.81785C5.01223 3.84465 5.21316 3.91581 5.51372 4.0774C5.82181 4.24401 6.19521 4.48345 6.73103 4.82839L7.41084 3.77264ZM1.25983 6.11522C1.72732 5.64259 2.20464 5.17978 2.69147 4.72709C2.88815 4.54514 3.09204 4.37114 3.30264 4.20549C3.48933 4.06149 3.60822 3.99116 3.66431 3.96772L3.18291 2.80731C2.96775 2.8969 2.7417 3.05179 2.53575 3.21086C2.31975 3.37747 2.08365 3.58092 1.84421 3.79944C1.36532 4.23647 0.839552 4.76142 0.373224 5.22608L1.25983 6.11522ZM5.01139 2.5754C4.39214 2.48584 3.7602 2.56599 3.18291 2.80731L3.66431 3.96772C4.03145 3.81314 4.43364 3.76106 4.82804 3.81702L5.01139 2.5754ZM0.801877 7.30325L1.11918 7.42884L1.58132 6.26174L1.26486 6.13615L0.801877 7.30325ZM2.37165 8.25016L3.17538 9.05223L4.06283 8.16309L3.25994 7.36102L2.37165 8.25016ZM1.11918 7.42884L1.21462 7.46735L1.69267 6.30611L1.58132 6.26174L1.11918 7.42884ZM3.25826 7.36102L3.1737 7.2773L2.29882 8.17816L2.37165 8.25016L3.25826 7.36102ZM1.21462 7.46735C1.61816 7.63312 1.9857 7.87508 2.29882 8.179L3.1737 7.2773C2.74621 6.86242 2.24357 6.53281 1.69267 6.30611L1.21462 7.46735ZM0.373224 5.22608C0.0702588 5.52774 -0.0602278 5.9618 0.0261801 6.38052C0.112588 6.79923 0.404246 7.14618 0.801877 7.30325L1.26486 6.13615L1.259 6.1328L1.25648 6.12611V6.12024L1.25983 6.11522L0.373224 5.22608ZM12.8218 10.7141L13.1617 11.2391L14.2157 10.5567L13.8758 10.0318L12.8218 10.7141ZM11.8707 16.6895L11.8004 16.7606L12.6878 17.6489L12.7573 17.5794L11.8707 16.6895ZM13.1617 11.2391C13.5083 11.7749 13.7477 12.1458 13.9152 12.4531C14.0767 12.7528 14.1479 12.9529 14.1747 13.1354L15.4171 12.9512C15.3602 12.5686 15.2179 12.2228 15.0186 11.8545C14.8235 11.4944 14.5514 11.0758 14.2157 10.5567L13.1617 11.2391ZM12.7573 17.5794C13.2236 17.1139 13.7502 16.589 14.1889 16.1118C14.4074 15.8732 14.6117 15.6379 14.7792 15.4227C14.9382 15.2176 15.094 14.9916 15.1835 14.7764L14.0248 14.2933C13.9591 14.4219 13.879 14.5426 13.7862 14.6533C13.6203 14.8634 13.446 15.0667 13.2638 15.2628C12.8094 15.748 12.3449 16.2237 11.8707 16.6895L12.7573 17.5794ZM14.1747 13.1354C14.2316 13.5172 14.1814 13.9174 14.024 14.2933L15.1835 14.7764C15.4264 14.2001 15.5071 13.5692 15.4171 12.9504L14.1747 13.1354ZM10.2699 14.3544L9.83207 13.9701L9.0049 14.9145L9.44193 15.298L10.2699 14.3544ZM11.8849 16.7841C11.7049 16.3328 11.5969 16.0599 11.4546 15.8012L10.3537 16.404C10.4508 16.5798 10.5278 16.7707 10.717 17.2496L11.8849 16.7841ZM9.41262 15.2712C9.77765 15.6346 9.92332 15.7811 10.0472 15.9393L11.0351 15.164C10.8535 14.9321 10.6442 14.7245 10.2992 14.3812L9.41262 15.2712ZM11.4554 15.8003C11.3328 15.5772 11.1923 15.3644 11.0351 15.164L10.0472 15.9393C10.1622 16.0855 10.2643 16.2404 10.3537 16.404L11.4554 15.8003ZM12.903 6.48863C12.5124 6.87722 11.8812 6.87722 11.4906 6.48863L10.604 7.37777C11.4848 8.25551 12.9096 8.25551 13.7904 7.37777L12.903 6.48863ZM11.4906 6.48863C11.3032 6.30308 11.1978 6.05032 11.1978 5.78661C11.1978 5.5229 11.3032 5.27013 11.4906 5.08459L10.604 4.19545C10.1807 4.61657 9.94265 5.18906 9.94265 5.78619C9.94265 6.38331 10.1807 6.95664 10.604 7.37777L11.4906 6.48863ZM11.4906 5.08459C11.8813 4.69544 12.5131 4.69544 12.9038 5.08459L10.604 4.19545C12.9096 3.31771 11.4848 3.31771 10.604 4.19545L11.4906 5.08459ZM12.9038 5.08459C13.0912 5.27013 13.1966 5.5229 13.1966 5.78661C13.1966 6.05032 13.0912 6.30308 12.9038 6.48863L13.7904 7.37777C14.2137 6.95664 14.4517 6.38415 14.4517 5.78703C14.4517 5.1899 14.2137 4.61657 13.7904 4.19545L12.9038 5.08459ZM11.7995 16.7598C11.8066 16.7541 11.8145 16.7496 11.823 16.7464L11.8422 16.7456L11.8623 16.7556C11.8724 16.764 11.8796 16.7735 11.8841 16.7841L10.717 17.2487C11.0385 18.055 12.0833 18.2501 12.6861 17.6489L11.7995 16.7598ZM10.6048 12.2203C10.177 12.6473 9.85384 12.968 9.57672 13.2066C9.2996 13.4469 9.11206 13.5632 8.96555 13.6177L9.39923 14.7965C9.75756 14.6642 10.0807 14.4315 10.398 14.1568Cnan nan 11.0745 13.5247 11.4906 13.1103L10.6048 12.2203ZM8.96555 13.6177C8.8962 13.6448 8.82316 13.6584 8.74871 13.6579V14.9137C8.9742 14.9131 9.19048 14.8741 9.39923 14.7965L8.96555 13.6177ZM9.86137 13.9986L9.62695 13.7633L8.73783 14.6508L8.97392 14.8861L9.86137 13.9986ZM4.85567 6.48863C4.44962 6.89385 4.09883 7.24297 3.82589 7.55359C3.55464 7.86336 3.32273 8.17733 3.18459 8.52143L4.34915 8.99028C4.4086 8.84209 4.53083 8.65539 4.77027 8.38161C5.00888 8.10951 5.32534 7.79471 5.74228 7.37777L4.85567 6.48863ZM3.18459 8.52143C3.09254 8.74475 3.04532 8.98399 3.04561 9.22554H4.30143C4.30143 9.15019 4.31483 9.07568 4.34915 8.98944L3.18459 8.52143ZM3.17538 9.05223L3.32273 9.19959L4.21018 8.31212L4.0645 8.16309L3.17538 9.05223Z"
      fill="#3B82F6"
      fillOpacity={0.8}
    />
  </svg>
);

interface SlideItem {
  id: number;
  cards: CardItem[];
}

export default function PrimeriIzPrakse() {
  const { t, lang } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  // Always start at the top on load/refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Lerp Mouse Trail Effect for Liquid Cursor Glow
  useEffect(() => {
    const glowEl = document.getElementById('aura-liquid-glow');
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

    window.addEventListener('mousemove', handleMouseMove);
    const animationFrameId = requestAnimationFrame(animateGlow);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const slides: SlideItem[] = [
    {
      id: 0,
      cards: [
        {
          icon: Mic,
          title: 'Monter',
          badge: 'Glasovna sporočila',
          quote: 'Obnavljanje zaloge',
          desc: `Monter med delom ne ustavlja dela in ne kliče.
Posname 8-sekundno glasovno sporočilo:
"Zmanjkalo nam je cevi fi 32. Potrebujemo še približno 15 metrov."
Pisarna prejme samodejno prepisano sporočilo in naroči material.
Delo na terenu teče naprej brez prekinjanj zaradi klicev.`,
        },
        {
          icon: Mic,
          title: 'Drobna dela',
          badge: 'Glasovna sporočila',
          quote: '"Stranka želi še nekaj dodatnega."',
          desc: `Med delom se stranka zanima za dodatno storitev.
Delavec posname:
"Stranka želi pobarvati še garažna vrata. Pripravite ponudbo."
Pisarna pripravi predračun in ga takoj pošlje.
Delavec ga predloži stranki še preden dokonča delo.`,
        },
        {
          icon: CustomIconS1C3,
          title: 'Čistilni servis',
          badge: 'Vse dokumentirano',
          quote: '"Tega okna niste očistili."',
          desc: `Teden dni po čiščenju stranka pošlje reklamacijo.
Direktor odpre kartico naročnika.
Vidi fotografije pred in po čiščenju ter opombo čistilke:
"Okno v skladišču ni bilo dostopno zaradi zložene robe."
Namesto ugibanja stranki pošlje dejstva.`,
        },
      ],
    },
    {
      id: 1,
      cards: [
        {
          icon: CheckCircle2,
          title: 'Vse firme',
          badge: 'Vse dokumentirano',
          quote: 'Operativni spomin podjetja',
          desc: `Primer: Hotel ABX
izkušena čistilka ve podrobnosti glede čiščenja,
na novo zaposlena čistilka tega ne ve, pisarna mora razlagati.

Z aplikacijo: Na kartici naročnika so vsakič že dodane opombe:
⚠ Pomembno pred začetkom
- Ne uporabljaj mokrega čiščenja v sobi 204
- Ključ prevzameš na recepciji
- Uporabi čistilo brez vonja

Kdorkoli bo danes opravljal delo, ima vse potrebne informacije že pred pričetkom del. V zaznamkih so shranjeni pomembni detajli o naročnikih, delo lahko brez težav in izgubljanja časa prevzame drug.`,
        },
        {
          icon: CustomIconS2C2,
          title: 'Urejanje okolja',
          badge: 'Vse dokumentirano',
          quote: '"Vi pa res vse zabeležite."',
          desc: `Po dveh letih stranka pokliče zaradi novega dela.
Direktor že med pogovorom pove:
"Nazadnje smo pri vas zamenjali 18 m² tlakovcev, uredili odvodnjavanje ob garaži in posadili šest lovorikovcev. Vidim tudi, da ste takrat omenili, da boste naslednje leto želeli urediti še dovoz."
Stranka je prijetno presenečena.

To ni več samo dobra dokumentacija. To gradi zaupanje in podjetje v očeh naročnika izpade bistveno bolj profesionalno od konkurence.`,
        },
      ],
    },
    {
      id: 2,
      cards: [
        {
          icon: CustomIconS1C3,
          title: 'Transportno podjetje',
          badge: 'Pregled nad dokumenti',
          quote: '"Pozabljeni dokumenti"',
          desc: `Voznik kamiona šele pri razkladanju v Salzburgu ugotovi, da je pozabil vzeti potrdilo o pranju cisterne, ADR dokumentacijo ali posebna navodila naročnika.
Disponenta ni več v službi.

V aplikaciji imata oba, voznik na terenu in disponent v firmi neprestano kontrolo nad tem, kaj je bilo dodano in kaj še ne, zato do zgornjega primera in zamud pri razkladanju skoraj ne more priti.

Za oba je manj stresno in prihranjenih je veliko telefonskih klicev.`,
        },
        {
          icon: CustomIconS3C2,
          title: 'Avtoservis',
          badge: 'Poprodaja',
          quote: '"Dodaj opombo čez 8 mesecev."',
          desc: `Mehanik po popravilu klime narekuje:
"Passat 2.0 TDI, letnik 2020. Menjan kompresor klimatske naprave. Veliki servis bo predvidoma potreben čez približno devet mesecev. Določi termin."
Tajnica nastavi opomnik čez 8 mesecev.

Na določen dan se prikaže kartica-opomnik.
Pisarna vnaprej preveri zalogo delov, pripravi ponudbo, pokliče stranko in predlaga termin.
Servis je potreben, stranka se pusti voditi, podjetje pa si ustvari novo priložnost za servis, ki bi sicer morda spolzela iz rok.`,
        },
      ],
    },
    {
      id: 3,
      cards: [
        {
          icon: CustomIconS4C1,
          title: 'Direktor in pisarna',
          badge: 'Enostavno',
          quote: '"Preveri ponudbo in pokliči Heinza v Berlin."',
          desc: `Direktor je na sestankih zunaj pisarne.
Tajnica doda kartico, kjer priloži ponudbo in doda telefon partnerja.
Direktor pregleda in potrdi dokument, nato pa z enim dotikom, brez iskanja, pokliče Heinza v Nemčijo.

Pisarna vidi, da je ponudba potrjena in lahko takoj dogovarja prihodnje sestanke direktorja.`,
        },
        {
          icon: Clock,
          title: 'Direktor in pisarna',
          badge: 'Opomniki',
          quote: '"Ne pozabi oddati ponudbe."',
          desc: `Ponudbo je treba poslati do petka.
Pisarna ustvari opomnik z datumom.
Na izbran dan se kartica samodejno prikaže na vrhu.
Pomembni roki se ne izgubijo med vsakodnevnim delom.`,
        },
        {
          icon: CheckCircle2,
          title: 'Direktor in pisarna',
          badge: 'Vse dokumentirano',
          quote: '"Brez motenja procesa."',
          desc: `Direktor med konferenco prejme pet različnih zahtev.
Vsaka pride kot ločena kartica.
Ko ima čas, jih v dveh minutah obdela eno za jedno.
Nič se ne izgubi med klici, elektronsko pošto in sporočili.`,
        },
      ],
    },
  ];

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  function formatDescription(desc: string) {
    return desc.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (line === '') {
        return <div key={idx} className="h-2.5" />;
      }
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-slate-500 font-light text-[12px] leading-[16px]"
          >
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      if (trimmed.startsWith('⚠')) {
        return (
          <p
            key={idx}
            className="font-normal text-amber-600 flex items-center gap-1.5 mt-1.5 mb-1 text-[12px] leading-[16px]"
          >
            <span className="text-amber-500">⚠</span>{' '}
            {trimmed.substring(1).trim()}
          </p>
        );
      }
      return (
        <p
          key={idx}
          className="font-light text-slate-500 text-[12px] leading-[16px]"
        >
          {line}
        </p>
      );
    });
  }

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 overflow-x-hidden selection:bg-[#1B3A6B]/10 selection:text-[#1B3A6B] relative bg-transparent flex flex-col justify-between">
      <PrimeriNavbar />
      {/* Solid background base */}
      <div className="fixed inset-0 -z-20 bg-[#f3f5f8] dark:bg-[#0b0f19] pointer-events-none" />

      {/* Liquid cursor glow element */}
      <div
        id="aura-liquid-glow"
        className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-30 mix-blend-screen dark:mix-blend-lighten blur-[85px] opacity-0 md:opacity-75 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(99, 102, 241, 0.08) 40%, rgba(27, 58, 107, 0.02) 80%, transparent 100%)',
          transform: 'translate3d(-9999px, -9999px, 0)',
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
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.09) 1px, transparent 0)',
            backgroundSize: '2rem 2rem',
          }}
        />
      </div>

      {/* Back Button */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        <div className='absolute top-32 hidden lg:block'>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
            <span className="text-sm text-slate-600 font-medium">Nazaj na prvo stran</span>
          </Link>
        </div>

      {/* Main Container */}
      <main className="lg:pt-32 pt-24 pb-20 flex-grow flex items-start">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center w-full">
          {/* Left Column - Normal Content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 max-w-[596px] w-full mx-auto lg:mx-0 min-w-0">
            <span
              className="text-[#3B82F6] text-xs font-medium tracking-[0.05em] uppercase mb-1"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              DOBRA ORGANIZACIJA
            </span>

            <h1
              className="text-2xl md:text-[40px] lg:text-[44px] leading-tight md:leading-[60px] font-light tracking-[-0.04em] text-[#020617]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Dobra organizacija ni strošek. <br />
              Je konkurenčna prednost.
            </h1>

            <div
              className="text-base md:text-[18px] leading-7 md:leading-[28px] font-light text-slate-600 lg:text-[#475569] space-y-4"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <p>
                Uspešna podjetja rastejo zaradi ljudi. Najuspešnejša zaradi
                odlične organizacije. Aplikacija Pomocnik.net lahko pri tem
                pomaga.
              </p>
              <p>
                Majhne izboljšave lahko prihranijo čas, zmanjšajo napake in
                pustijo boljši vtis pri strankah.
              </p>
            </div>

            <div className="mt-10 w-full flex flex-col items-center lg:items-start gap-4">
              <Link
                href="/register"
                className="w-fit inline-flex items-center justify-center gap-2 rounded-full px-8 bg-gradient-to-b from-[#3B82F6] to-[#2563EB] border border-[#1D4ED8] text-white text-[14px] font-normal shadow-[0px_4px_12px_rgba(59,130,246,0.3),inset_0px_1px_0px_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 hover:from-[#2563EB] hover:to-[#1D4ED8] transition-all duration-300 select-none cursor-pointer"
                style={{ height: '58.5px' }}
              >
                Pridružite se
              </Link>
              <p className="text-[14px] font-light leading-[20px] text-[#64748B] max-w-[596px] text-center lg:text-left">
                Če ugotovite, da vam aplikacija ne prihrani časa, ne izboljša
                delovnega procesa oz ne prinaša dodane vrednosti, vam brez
                vprašanj povrnemo denar.
              </p>
            </div>
          </div>

          {/* Right Column - Slider */}
          <div className="relative w-full max-w-[570px] min-w-0 justify-self-center lg:justify-self-end">
            {/* Outer Container (Overlay + Shadow) */}
            <div
              className="relative overflow-hidden rounded-[32px] ... px-5 pt-[60px] pb-6 md:px-8 md:pt-[60px] md:pb-8 lg:pb-0 flex flex-col gap-6 h-auto lg:h-[840px]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(191, 219, 254, 0.4) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(186, 230, 253, 0.3) 100%)',
                boxShadow:
                  '0px 30px 80px -35px rgba(15, 23, 42, 0.35), inset 0px 2px 0px 1px #FFFFFF',
              }}
            >
              {/* Slider Header */}
              <div className="flex justify-between items-start gap-4 pl-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl md:text-[30px] font-normal tracking-[-0.75px] text-[#0F172A] leading-tight md:leading-[36px]">
                    Primeri iz prakse
                  </h2>
                  <p className="text-[14px] font-normal leading-[20px] text-[#334155]">
                    Vsako podjetje ima drugačne procese, a težave so podobne.
                  </p>
                </div>

                <div className="hidden md:flex w-11 h-11 bg-[#EFF6FF] border border-[#DBEAFE] shadow-[inset_0px_1px_0px_1px_#FFFFFF] rounded-2xl items-center justify-center text-[#2563EB] shrink-0">
                  <Briefcase className="w-5 h-5 text-[#2563EB]" />
                </div>
              </div>

              {/* Cards List for active slide */}
              <div className="relative lg:flex-1 overflow-hidden">
                <div
                  className="relative w-full lg:absolute lg:inset-0 flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {slides.map((slide) => (
                    <div
                      key={slide.id}
                      className="w-full lg:h-full shrink-0 flex flex-col gap-4"
                    >
                      {slide.cards.map((card, cardIdx) => {
                        const IconComp = card.icon;
                        return (
                          <div
                            key={cardIdx}
                            className="flex gap-4 p-4 bg-white border border-[#E2E8F0] shadow-[0px_2px_8px_rgba(15,23,42,0.03),inset_0px_1px_0px_1px_#FFFFFF] rounded-[16px] transition-all duration-300 hover:shadow-[0px_8px_20px_-8px_rgba(15,23,42,0.1)] hover:scale-[1.01]"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                              <IconComp className="w-[18px] h-[18px] text-[#3B82F6]" />
                            </div>

                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[14px] font-normal text-[#1E293B] leading-[20px]">
                                  {card.title}
                                </span>
                                <span className="text-[12px] font-normal leading-[16px] text-[#3B82F6] bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-2 py-0.5 select-none">
                                  {card.badge}
                                </span>
                              </div>

                              <span className="text-[12px] font-normal text-[#64748B] mt-1 leading-[16px]">
                                {card.quote}
                              </span>

                              <div className="text-[12px] font-light text-[#64748B] mt-2 leading-[16px] space-y-1">
                                {formatDescription(card.desc)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Indicators */}
              <div className="flex items-center justify-center gap-6 mt-4 lg:mt-auto pb-4 lg:pb-8 select-none">
                <button
                  onClick={handlePrev}
                  className="p-2 text-[#94A3B8] hover:text-[#0F172A] transition-colors rounded-full hover:bg-slate-100/50"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
                </button>

                <div className="flex items-center gap-2.5">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setActiveSlide(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        activeSlide === idx
                          ? 'bg-[#0F172A] scale-125'
                          : 'bg-[#CBD5E1] hover:bg-slate-400'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="p-2 text-[#94A3B8] hover:text-[#0F172A] transition-colors rounded-full hover:bg-slate-100/50"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-6 h-6 stroke-[1.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>

      <Footer />
    </div>
  );
}
