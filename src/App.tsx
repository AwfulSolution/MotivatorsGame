import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderOpen,
  Info,
  Languages,
  Play,
  Printer,
  RefreshCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { MOTIVATORS, Motivator } from "./data/motivators";

type GameStage =
  | "welcome"
  | "instructions"
  | "playing"
  | "level2_intro"
  | "level2_scoring"
  | "results"
  | "saved_reports";
type Language = "en" | "fa";

interface GameState {
  stage: GameStage;
  shuffledDeck: Motivator[];
  activeCards: Motivator[];
  discardedCards: Motivator[];
  currentIndex: number;
  newestCardId: string | null;
  scores: Record<string, number>;
  participantName: string;
  participantPosition: string;
  companyName: string;
  language: Language;
  currentReportId: string | null;
}

interface SavedReport {
  id: string;
  createdAt: string;
  updatedAt: string;
  participantName: string;
  participantPosition: string;
  companyName: string;
  language: Language;
  activeCards: Motivator[];
  scores: Record<string, number>;
}

const STORAGE_KEY = "hr_motivator_game_simple";
const SAVED_REPORTS_KEY = "hr_motivator_game_reports";
const SCORE_OPTIONS = [-3, -2, -1, 0, 1, 2, 3];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  "Working Style": { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-100", light: "bg-blue-50" },
  Environment: { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-100", light: "bg-emerald-50" },
  Growth: { bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-100", light: "bg-purple-50" },
  Leadership: { bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-100", light: "bg-amber-50" },
  "Personal Flow": { bg: "bg-rose-600", text: "text-rose-600", border: "border-rose-100", light: "bg-rose-50" },
  Rewards: { bg: "bg-yellow-600", text: "text-yellow-700", border: "border-yellow-100", light: "bg-yellow-50" },
  Security: { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-100", light: "bg-indigo-50" },
  Social: { bg: "bg-orange-600", text: "text-orange-600", border: "border-orange-100", light: "bg-orange-50" },
  Wellbeing: { bg: "bg-teal-600", text: "text-teal-600", border: "border-teal-100", light: "bg-teal-50" },
};

const CATEGORY_FA: Record<string, string> = {
  "Working Style": "سبک کاری",
  Environment: "محیط کار",
  Growth: "رشد",
  Leadership: "رهبری",
  "Personal Flow": "جریان فردی",
  Rewards: "پاداش",
  Security: "امنیت",
  Social: "اجتماعی",
  Wellbeing: "تندرستی",
};

const MOTIVATOR_FA: Record<string, { title: string; description: string }> = {
  "1": { title: "ساختار و نظم", description: "داشتن فرایندهای روشن، راهنماهای مشخص و محیط کاری قابل پیش بینی." },
  "2": { title: "تنوع", description: "محیط کاری که مجموعه متنوعی از وظایف و پروژه ها را ارائه می کند." },
  "3": { title: "انعطاف پذیری", description: "توانایی هماهنگ کردن زمان یا محل کار با شرایط زندگی شخصی." },
  "4": { title: "رقابت", description: "انگیزه برای بهتر عمل کردن از دیگران یا عبور از اهداف و معیارها." },
  "5": { title: "ریسک و چالش", description: "انگیزه گرفتن از موقعیت های دشوار، حساس و پرچالش." },
  "6": { title: "سفر", description: "فرصت رفتن به مکان های مختلف به عنوان بخشی از مسئولیت های شغلی." },
  "7": { title: "استقلال", description: "کار کردن با اتکای بیشتر به خود و تمرکز بر هدف ها بدون نظارت دائمی." },
  "8": { title: "مدیر خوب", description: "مدیری که بر پایه اعتماد، احترام، بازخورد و نوآوری محیطی سازنده می سازد." },
  "9": { title: "هم تیمی ها", description: "همکارانی که همکاری با آنها روان، سازنده و انرژی بخش است." },
  "10": { title: "کار روتین", description: "کاری تکرارشونده با روش ها و خروجی های نسبتا قابل پیش بینی." },
  "11": { title: "شرایط کاری", description: "راحتی، ایمنی و کیفیت فیزیکی فضای کار." },
  "12": { title: "موقعیت مکانی", description: "مناسب بودن و دسترسی خوب به محل کار." },
  "13": { title: "قابل پیش بینی بودن", description: "ارزش دانستن اینکه هر روز چه چیزی از شما انتظار می رود." },
  "14": { title: "شفافیت", description: "دسترسی به اطلاعات روشن درباره تصمیم ها و وضعیت سازمان." },
  "15": { title: "فرهنگ سازمانی", description: "شیوه انجام کارها، ارزش ها و رفتارهایی که تجربه کارکنان را می سازند." },
  "16": { title: "اعتماد", description: "کار کردن در محیطی که افراد به صداقت و نیت یکدیگر اعتماد دارند." },
  "17": { title: "تسلط", description: "فرصت متخصص شدن و بهبود مداوم مهارت ها." },
  "18": { title: "تحریک فکری", description: "درگیر شدن با کارهای پیچیده و چالش برانگیز که نیازمند فکر عمیق است." },
  "19": { title: "پیشرفت شغلی", description: "مسیرهای روشن برای رشد، ارتقا و حرکت رو به جلو در سازمان." },
  "20": { title: "بازخورد", description: "دریافت بازخورد منظم و سازنده درباره عملکرد و رشد." },
  "21": { title: "رشد فردی", description: "تمرکز بر یادگیری بیشتر و تبدیل شدن به نسخه کامل تری از خود." },
  "22": { title: "نوآوری", description: "بودن در خط مقدم روش ها، ایده ها یا فناوری های تازه." },
  "23": { title: "دانش و تخصص سازمانی", description: "رضایت از اینکه مرجع قابل اتکا برای یک موضوع تخصصی باشید." },
  "24": { title: "تاب آوری", description: "رشد کردن در محیط های سریع و توانایی برگشت از شکست ها." },
  "25": { title: "منتورینگ", description: "داشتن راهنمایی از افراد باتجربه تر برای رشد حرفه ای." },
  "26": { title: "قدرت و دستوردهی", description: "اختیار تصمیم گیری، هدایت دیگران یا اثرگذاری بر سازمان." },
  "27": { title: "رشد دادن دیگران", description: "لذت بردن از آموزش، کوچینگ یا راهنمایی همکاران." },
  "28": { title: "توانمندسازی", description: "احساس اعتماد به نفس و توانایی مالکیت نتایج." },
  "29": { title: "مسئولیت", description: "پاسخگو بودن در برابر پروژه ها، نتایج یا افراد مهم." },
  "30": { title: "تفکر استراتژیک", description: "تمرکز بر چشم انداز بلندمدت و طراحی مسیر رسیدن به آن." },
  "31": { title: "آزادی", description: "آزادی از محدودیت ها و امکان انتخاب در زمان، مسیر و شیوه کار." },
  "32": { title: "معنا", description: "کار کردن روی وظایفی که معنادارند و به هدفی بزرگ تر کمک می کنند." },
  "33": { title: "نوع دوستی", description: "فرصت کمک به دیگران و ایجاد اثر مثبت در زندگی آنها." },
  "34": { title: "خلاقیت", description: "توانایی بیان خود و تبدیل ایده های تازه به واقعیت." },
  "35": { title: "اثرگذاری", description: "دیدن نتایج ملموس کار خود بر کسب و کار، افراد یا جامعه." },
  "36": { title: "حل مسئله", description: "لذت باز کردن گره مسائل پیچیده و پیدا کردن راه حل موثر." },
  "37": { title: "مسئولیت اجتماعی", description: "مشارکت در فعالیت هایی که به جامعه یا محیط زیست کمک می کند." },
  "38": { title: "اشتیاق", description: "انرژی درونی که در سختی ها فرد را به ادامه دادن و رسیدن به هدف سوق می دهد." },
  "39": { title: "میهن دوستی", description: "حس تعلق، عشق و تعهد به کشور و زمینه های فرهنگی و تاریخی آن." },
  "40": { title: "پاداش مالی", description: "انگیزه ناشی از حقوق رقابتی، پاداش و مزایای مالی." },
  "41": { title: "انصاف", description: "اطمینان از اینکه پاداش ها و فرصت ها عادلانه توزیع می شوند." },
  "42": { title: "امنیت شغلی", description: "احساس ثبات و اطمینان از امنیت شغل و درآمد." },
  "43": { title: "تعلق", description: "احساس پذیرفته شدن و عضو موثر یک تیم یا جامعه بودن." },
  "44": { title: "قدردانی رسمی", description: "دیده شدن و قدردانی شدن برای تلاش ها و دستاوردها." },
  "45": { title: "شبکه سازی", description: "توانایی ساختن شبکه گسترده ای از ارتباطات حرفه ای." },
  "46": { title: "حمایت", description: "احساس مراقبت، پشتیبانی و دسترسی به کمک هنگام دشواری." },
  "47": { title: "همکاری", description: "کار کردن همراه دیگران برای رسیدن به هدف های مشترک." },
  "48": { title: "اعتبار", description: "وابسته بودن به برند، سازمان یا جایگاهی معتبر و محترم." },
  "49": { title: "قدردانی", description: "احساس اینکه مشارکت های شما واقعا توسط مدیر ارزشمند دانسته می شود." },
  "50": { title: "کار تیمی", description: "هم افزایی و انرژی حاصل از حضور در یک گروه توانمند." },
  "51": { title: "تعادل کار و زندگی", description: "داشتن مرزهای روشن برای ساختن زندگی رضایت بخش بیرون از کار." },
  "52": { title: "سلامت و تندرستی", description: "دسترسی به برنامه ها و فرهنگی که سلامت جسم و ذهن را جدی می گیرد." },
};

const TEXT = {
  en: {
    languageName: "فارسی",
    appTitle: "Motivator Game",
    appSubtitle: "Discover the professional drivers that matter most, then compare them with the current role.",
    participantName: "Participant name",
    participantPosition: "Position / Department",
    companyName: "Company name",
    namePlaceholder: "e.g. John Doe",
    positionPlaceholder: "e.g. Senior HR Manager",
    companyPlaceholder: "e.g. Acme People Team",
    startLevel1: "Start Level 1",
    level1: "Level 1: Selection",
    level2: "Level 2: Alignment",
    top6: "Your Top 6",
    progress: "Progress",
    reviewed: "Reviewed",
    reveal: "Reveal Next Choice",
    discard: "Discard least important",
    discardPrompt: "Discard one motivator to continue.",
    restart: "Restart",
    instructions: "Instructions",
    instruction1: "You always keep 6 cards in your hand.",
    instruction2: "A new card appears. Discard the least important card to return to 6.",
    instruction3: "The game ends when all motivators are reviewed.",
    gotIt: "Got it, let's play",
    level1Complete: "Level 1 complete",
    level1CompleteBody: "You have found the six motivators that matter most. Now rate how present each one is in the current job.",
    forwardLevel2: "Go to Level 2",
    rateJob: "Rate your current job",
    ratePrompt: "How much does each motivator exist in this role today?",
    scoringProgress: "Scoring progress",
    scoreHelp: "-3 means a strong gap, 0 means neutral, +3 means a strong match.",
    showReport: "Show Report",
    reportTitle: "Motivation Report",
    reportSubtitle: "Your strongest motivators and how well the current role supports them.",
    participant: "Participant",
    position: "Position",
    company: "Company",
    date: "Date",
    averageAlignment: "Average alignment",
    matches: "Matches",
    gaps: "Gaps",
    strongestMatch: "Strongest match",
    biggestGap: "Biggest gap",
    reportSystem: "Report Summary",
    reportSystemBody: "Use the report to identify what the role already supports and where a manager conversation may be useful.",
    selectedMotivators: "Selected motivators",
    exportPDF: "Export PDF",
    newSession: "New Session",
    newChoice: "New choice",
    noGap: "No gap",
    neutral: "Neutral",
    savedReports: "Saved Reports",
    savedReportsBody: "Completed reports are saved automatically in this browser.",
    viewSavedReports: "View Saved Reports",
    noSavedReports: "No saved reports yet.",
    openReport: "Open Report",
    deleteReport: "Delete",
    backToStart: "Back to Start",
    savedAutomatically: "Saved automatically",
    lastUpdated: "Last updated",
  },
  fa: {
    languageName: "English",
    appTitle: "بازی انگیزاننده ها",
    appSubtitle: "مهم ترین محرک های حرفه ای را پیدا کنید و آنها را با نقش فعلی مقایسه کنید.",
    participantName: "نام شرکت کننده",
    participantPosition: "سمت / دپارتمان",
    companyName: "نام شرکت",
    namePlaceholder: "مثلا علی رضایی",
    positionPlaceholder: "مثلا مدیر منابع انسانی",
    companyPlaceholder: "مثلا تیم منابع انسانی آتیه",
    startLevel1: "شروع مرحله ۱",
    level1: "مرحله ۱: انتخاب",
    level2: "مرحله ۲: همسویی",
    top6: "شش انگیزاننده اصلی",
    progress: "پیشرفت",
    reviewed: "بررسی شده",
    reveal: "نمایش گزینه بعدی",
    discard: "حذف کم اهمیت ترین",
    discardPrompt: "برای ادامه، یک انگیزاننده را حذف کنید.",
    restart: "شروع دوباره",
    instructions: "راهنما",
    instruction1: "همیشه ۶ کارت در دست خود نگه می دارید.",
    instruction2: "یک کارت جدید ظاهر می شود. کم اهمیت ترین کارت را حذف کنید تا دوباره به ۶ برسید.",
    instruction3: "بازی زمانی تمام می شود که همه انگیزاننده ها بررسی شده باشند.",
    gotIt: "متوجه شدم، شروع کنیم",
    level1Complete: "مرحله ۱ کامل شد",
    level1CompleteBody: "شش انگیزاننده مهم خود را پیدا کردید. حالا مشخص کنید هر کدام در شغل فعلی چقدر وجود دارد.",
    forwardLevel2: "رفتن به مرحله ۲",
    rateJob: "شغل فعلی را امتیازدهی کنید",
    ratePrompt: "هر انگیزاننده امروز چقدر در این نقش وجود دارد؟",
    scoringProgress: "پیشرفت امتیازدهی",
    scoreHelp: "-۳ یعنی شکاف زیاد، ۰ یعنی خنثی، +۳ یعنی همسویی زیاد.",
    showReport: "نمایش گزارش",
    reportTitle: "گزارش انگیزشی",
    reportSubtitle: "مهم ترین انگیزاننده ها و میزان پشتیبانی نقش فعلی از آنها.",
    participant: "شرکت کننده",
    position: "سمت",
    company: "شرکت",
    date: "تاریخ",
    averageAlignment: "میانگین همسویی",
    matches: "همسویی ها",
    gaps: "شکاف ها",
    strongestMatch: "قوی ترین همسویی",
    biggestGap: "بزرگ ترین شکاف",
    reportSystem: "خلاصه گزارش",
    reportSystemBody: "از گزارش برای تشخیص نقاط حمایت کننده نقش و موضوعات مناسب گفت وگو با مدیر استفاده کنید.",
    selectedMotivators: "انگیزاننده های انتخاب شده",
    exportPDF: "خروجی PDF",
    newSession: "جلسه جدید",
    newChoice: "گزینه جدید",
    noGap: "بدون شکاف",
    neutral: "خنثی",
    savedReports: "گزارش های ذخیره شده",
    savedReportsBody: "گزارش های کامل شده به صورت خودکار در همین مرورگر ذخیره می شوند.",
    viewSavedReports: "مشاهده گزارش ها",
    noSavedReports: "هنوز گزارشی ذخیره نشده است.",
    openReport: "باز کردن گزارش",
    deleteReport: "حذف",
    backToStart: "بازگشت به شروع",
    savedAutomatically: "ذخیره خودکار",
    lastUpdated: "آخرین به روزرسانی",
  },
} as const;

const SCORE_LABELS = {
  en: {
    "-3": "Strong gap",
    "-2": "Gap",
    "-1": "Slight gap",
    "0": "Neutral",
    "1": "Slight match",
    "2": "Match",
    "3": "Strong match",
  },
  fa: {
    "-3": "شکاف زیاد",
    "-2": "شکاف",
    "-1": "شکاف کم",
    "0": "خنثی",
    "1": "همسویی کم",
    "2": "همسویی",
    "3": "همسویی زیاد",
  },
} as const;

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createReportId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `report-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadSavedReports = (): SavedReport[] => {
  const saved = localStorage.getItem(SAVED_REPORTS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load saved reports", error);
    return [];
  }
};

const persistSavedReports = (reports: SavedReport[]) => {
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports));
};

const getCategoryStyles = (category: string) =>
  CATEGORY_COLORS[category] || { bg: "bg-slate-600", text: "text-slate-600", border: "border-slate-100", light: "bg-slate-50" };

const getScoreTextClass = (score: number) => {
  if (score > 0) return "text-emerald-600";
  if (score < 0) return "text-red-500";
  return "text-slate-500";
};

const getScoreBgClass = (score: number) => {
  if (score > 0) return "bg-emerald-600";
  if (score < 0) return "bg-red-500";
  return "bg-slate-500";
};

const getMotivatorText = (motivator: Motivator, language: Language) => {
  const fa = MOTIVATOR_FA[motivator.id];
  return {
    title: language === "fa" && fa ? fa.title : motivator.title,
    description: language === "fa" && fa ? fa.description : motivator.description,
    category: language === "fa" ? CATEGORY_FA[motivator.category] || motivator.category : motivator.category,
  };
};

const formatScore = (score: number) => (score > 0 ? `+${score}` : `${score}`);

const getReportFileBase = (participantName: string) => `${participantName.trim() || "Participant"} Motivators Report`;

interface ShellProps {
  children: React.ReactNode;
  language: Language;
  onToggleLanguage: () => void;
  compact?: boolean;
}

const Shell: React.FC<ShellProps> = ({ children, language, onToggleLanguage, compact }) => {
  const t = TEXT[language];

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 ${language === "fa" ? "font-fa" : ""}`} dir={language === "fa" ? "rtl" : "ltr"}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className={`relative mx-auto w-full ${compact ? "max-w-3xl" : "max-w-7xl"} px-4 py-5 sm:px-6 lg:px-8`}>
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">{t.appTitle}</h1>
          </div>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Languages size={16} />
            {t.languageName}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface MotivatorCardProps {
  motivator: Motivator;
  language: Language;
  isNew?: boolean;
  onDiscard?: (id: string) => void;
  canDiscard?: boolean;
}

const MotivatorCard: React.FC<MotivatorCardProps> = ({ motivator, language, isNew, onDiscard, canDiscard }) => {
  const styles = getCategoryStyles(motivator.category);
  const t = TEXT[language];
  const copy = getMotivatorText(motivator, language);

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, scale: 0.88, y: 28 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -16 }}
      className={`relative flex h-full min-h-[224px] flex-col overflow-hidden rounded-lg border-2 bg-white p-5 shadow-sm transition ${
        isNew ? "border-slate-900 shadow-lg ring-4 ring-slate-200" : "border-slate-100 ring-2 ring-transparent"
      } hover:border-slate-300 hover:shadow-md`}
    >
      {isNew && (
        <div className="absolute top-3 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white ltr:right-3 rtl:left-3">
          {t.newChoice}
        </div>
      )}

      <span className={`mb-4 w-fit rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${styles.light} ${styles.text} ${styles.border}`}>
        {copy.category}
      </span>
      <h3 className="mb-2 text-xl font-black leading-tight tracking-tight text-slate-950">{copy.title}</h3>
      <p className="mb-6 text-sm font-medium leading-relaxed text-slate-600">{copy.description}</p>

      {canDiscard && onDiscard && (
        <button
          type="button"
          onClick={() => onDiscard(motivator.id)}
          className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
          {t.discard}
        </button>
      )}
      <div className={`pointer-events-none absolute bottom-0 h-1.5 w-full ${styles.bg} ltr:left-0 rtl:right-0`} />
    </motion.div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = "text-slate-900" }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-2 text-2xl font-black tracking-tight ${tone}`}>{value}</p>
  </div>
);

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaults: GameState = {
      stage: "welcome",
      shuffledDeck: [],
      activeCards: [],
      discardedCards: [],
      currentIndex: 0,
      newestCardId: null,
      scores: {},
      participantName: "",
      participantPosition: "",
      companyName: "",
      language: "en",
      currentReportId: null,
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    return defaults;
  });
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => loadSavedReports());

  const t = TEXT[state.language];
  const isRtl = state.language === "fa";
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [state.stage]);

  useEffect(() => {
    document.title = state.stage === "results" ? getReportFileBase(state.participantName) : t.appTitle;
  }, [state.participantName, state.stage, t.appTitle]);

  useEffect(() => {
    if (state.stage !== "results" || !state.currentReportId || state.activeCards.length !== 6) return;

    setSavedReports((prev) => {
      const existing = prev.find((report) => report.id === state.currentReportId);
      const now = new Date().toISOString();
      const nextReport: SavedReport = {
        id: state.currentReportId,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        participantName: state.participantName,
        participantPosition: state.participantPosition,
        companyName: state.companyName,
        language: state.language,
        activeCards: state.activeCards,
        scores: state.scores,
      };
      const nextReports = [nextReport, ...prev.filter((report) => report.id !== state.currentReportId)];
      persistSavedReports(nextReports);
      return nextReports;
    });
  }, [
    state.activeCards,
    state.companyName,
    state.currentReportId,
    state.language,
    state.participantName,
    state.participantPosition,
    state.scores,
    state.stage,
  ]);

  const reportItems = useMemo(
    () =>
      state.activeCards.map((card) => ({
        card,
        score: state.scores[card.id] ?? 0,
        copy: getMotivatorText(card, state.language),
      })),
    [state.activeCards, state.language, state.scores],
  );

  const averageScore = reportItems.length
    ? reportItems.reduce((sum, item) => sum + item.score, 0) / reportItems.length
    : 0;
  const matchesCount = reportItems.filter((item) => item.score > 0).length;
  const gapsCount = reportItems.filter((item) => item.score < 0).length;
  const strongestMatch = reportItems.reduce<(typeof reportItems)[number] | null>(
    (best, item) => (item.score > (best?.score ?? -99) ? item : best),
    null,
  );
  const biggestGap = reportItems.reduce<(typeof reportItems)[number] | null>(
    (worst, item) => (item.score < (worst?.score ?? 99) ? item : worst),
    null,
  );

  const updateField = (field: "participantName" | "participantPosition" | "companyName", value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleLanguage = () => {
    setState((prev) => ({ ...prev, language: prev.language === "en" ? "fa" : "en" }));
  };

  const startGame = () => {
    const participantName = state.participantName.trim();
    const participantPosition = state.participantPosition.trim();
    const companyName = state.companyName.trim();
    if (!participantName || !participantPosition || !companyName) return;

    const deck = shuffle(MOTIVATORS);
    setState((prev) => ({
      ...prev,
      participantName,
      participantPosition,
      companyName,
      stage: "instructions",
      shuffledDeck: deck,
      activeCards: deck.slice(0, 6),
      discardedCards: [],
      currentIndex: 6,
      newestCardId: null,
      scores: {},
      currentReportId: null,
    }));
  };

  const nextStage = () => {
    if (state.stage === "instructions") setState((prev) => ({ ...prev, stage: "playing" }));
    if (state.stage === "level2_intro") setState((prev) => ({ ...prev, stage: "level2_scoring" }));
  };

  const nextCard = () => {
    if (state.currentIndex >= state.shuffledDeck.length) return;
    const card = state.shuffledDeck[state.currentIndex];
    setState((prev) => ({
      ...prev,
      activeCards: [...prev.activeCards, card],
      newestCardId: card.id,
      currentIndex: prev.currentIndex + 1,
    }));
  };

  const discardCard = (id: string) => {
    const cardToDiscard = state.activeCards.find((card) => card.id === id);
    if (!cardToDiscard) return;
    const remaining = state.activeCards.filter((card) => card.id !== id);
    const isGameOver = state.currentIndex === state.shuffledDeck.length;

    setState((prev) => ({
      ...prev,
      activeCards: remaining,
      discardedCards: [...prev.discardedCards, cardToDiscard],
      newestCardId: null,
      stage: isGameOver ? "level2_intro" : prev.stage,
    }));
  };

  const setScore = (id: string, score: number) => {
    setState((prev) => ({ ...prev, scores: { ...prev.scores, [id]: score } }));
  };

  const finishGame = () => {
    if (Object.keys(state.scores).length < 6) return;
    setState((prev) => ({ ...prev, stage: "results", currentReportId: prev.currentReportId || createReportId() }));
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      stage: "welcome",
      shuffledDeck: [],
      activeCards: [],
      discardedCards: [],
      currentIndex: 0,
      newestCardId: null,
      scores: {},
      participantName: "",
      participantPosition: "",
      companyName: "",
      language: prev.language,
      currentReportId: null,
    }));
  };

  const openSavedReports = () => {
    setSavedReports(loadSavedReports());
    setState((prev) => ({ ...prev, stage: "saved_reports" }));
  };

  const openSavedReport = (report: SavedReport) => {
    setState((prev) => ({
      ...prev,
      stage: "results",
      shuffledDeck: report.activeCards,
      activeCards: report.activeCards,
      discardedCards: [],
      currentIndex: MOTIVATORS.length,
      newestCardId: null,
      scores: report.scores,
      participantName: report.participantName,
      participantPosition: report.participantPosition,
      companyName: report.companyName,
      language: report.language,
      currentReportId: report.id,
    }));
  };

  const deleteSavedReport = (id: string) => {
    setSavedReports((prev) => {
      const nextReports = prev.filter((report) => report.id !== id);
      persistSavedReports(nextReports);
      return nextReports;
    });
    if (state.currentReportId === id) {
      setState((prev) => ({ ...prev, currentReportId: null }));
    }
  };

  const backToStart = () => {
    setState((prev) => ({ ...prev, stage: "welcome" }));
  };

  const exportPDF = () => {
    const previousTitle = document.title;
    document.title = getReportFileBase(state.participantName);
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  };

  const isReadyToStart = Boolean(state.participantName.trim() && state.participantPosition.trim() && state.companyName.trim());

  if (state.stage === "welcome") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-950 p-8 text-white sm:p-10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-lg bg-white/10">
              <Play className={isRtl ? "" : "ml-1"} size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight">{t.appTitle}</h1>
            <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-slate-300">{t.appSubtitle}</p>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <UserRound size={14} />
                {t.participantName}
              </span>
              <input
                type="text"
                placeholder={t.namePlaceholder}
                value={state.participantName}
                onChange={(event) => updateField("participantName", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <Building2 size={14} />
                {t.companyName}
              </span>
              <input
                type="text"
                placeholder={t.companyPlaceholder}
                value={state.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <BarChart3 size={14} />
                {t.participantPosition}
              </span>
              <input
                type="text"
                placeholder={t.positionPlaceholder}
                value={state.participantPosition}
                onChange={(event) => updateField("participantPosition", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </label>

            <button
              type="button"
              onClick={startGame}
              disabled={!isReadyToStart}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg py-4 text-base font-black shadow-lg transition ${
                isReadyToStart ? "bg-slate-950 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-100 text-slate-300 shadow-none"
              }`}
            >
              {t.startLevel1}
              <NextIcon size={20} />
            </button>
            <button
              type="button"
              onClick={openSavedReports}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <FolderOpen size={18} />
              {t.viewSavedReports}
              {savedReports.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">{savedReports.length}</span>
              )}
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "saved_reports") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage}>
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t.savedReports}</h1>
                <p className="mt-2 max-w-2xl font-medium leading-relaxed text-slate-500">{t.savedReportsBody}</p>
              </div>
              <button
                type="button"
                onClick={backToStart}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                {t.backToStart}
              </button>
            </div>
          </section>

          {savedReports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <FolderOpen className="mx-auto text-slate-300" size={42} />
              <p className="mt-4 text-lg font-black text-slate-700">{t.noSavedReports}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {savedReports.map((report) => {
                const reportScores = Object.values(report.scores).filter((score): score is number => typeof score === "number");
                const reportAverage = reportScores.length ? reportScores.reduce((sum, score) => sum + score, 0) / reportScores.length : 0;
                const reportDate = new Date(report.createdAt).toLocaleDateString(state.language === "fa" ? "fa-IR" : "en-US");
                const updatedDate = new Date(report.updatedAt).toLocaleString(state.language === "fa" ? "fa-IR" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{reportDate}</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{report.participantName}</h2>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {report.companyName} · {report.participantPosition}
                        </p>
                      </div>
                      <div className={`rounded-lg bg-slate-50 px-3 py-2 text-xl font-black ${getScoreTextClass(reportAverage)}`}>
                        {reportAverage.toFixed(1)}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {report.activeCards.slice(0, 6).map((card) => {
                        const copy = getMotivatorText(card, state.language);
                        return (
                          <span key={card.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {copy.title}
                          </span>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-xs font-bold text-slate-400">
                      {t.lastUpdated}: {updatedDate}
                    </p>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openSavedReport(report)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        <Eye size={16} />
                        {t.openReport}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedReport(report.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                        {t.deleteReport}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  if (state.stage === "instructions") {
    const instructions = [t.instruction1, t.instruction2, t.instruction3];

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
          <h2 className="mb-7 flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Info size={22} />
            </span>
            {t.instructions}
          </h2>
          <div className="space-y-4">
            {instructions.map((instruction, index) => (
              <div key={instruction} className="flex gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                <p className="font-semibold leading-relaxed text-slate-600">{instruction}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={nextStage} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white shadow-lg transition hover:bg-slate-800">
            {t.gotIt}
            <NextIcon size={20} />
          </button>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "playing") {
    const isFull = state.activeCards.length === 7;
    const totalChoices = MOTIVATORS.length - 6;
    const progress = Math.round((state.discardedCards.length / totalChoices) * 100);

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage}>
        <div className="flex min-h-[calc(100vh-110px)] flex-col gap-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-blue-600">{t.level1}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t.top6}</h1>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {state.companyName} · {state.participantName}
                </p>
              </div>
              <div className="w-full md:w-72">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.progress}</span>
                  <span className="text-sm font-black text-slate-900">
                    {progress}% · {state.discardedCards.length}/{totalChoices}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {state.activeCards.map((card) => (
                <MotivatorCard
                  key={card.id}
                  motivator={card}
                  language={state.language}
                  isNew={card.id === state.newestCardId}
                  onDiscard={discardCard}
                  canDiscard={isFull}
                />
              ))}
            </AnimatePresence>
          </div>

          <footer className="sticky bottom-0 z-10 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur print:hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={resetGame} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                <RefreshCcw size={16} />
                {t.restart}
              </button>
              {!isFull ? (
                <button type="button" onClick={nextCard} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800">
                  {t.reveal}
                  <NextIcon size={18} />
                </button>
              ) : (
                <p className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-black text-amber-700">
                  <Trash2 size={16} />
                  {t.discardPrompt}
                </p>
              )}
            </div>
          </footer>
        </div>
      </Shell>
    );
  }

  if (state.stage === "level2_intro") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={42} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">{t.level1Complete}</h2>
          <p className="mx-auto mt-4 max-w-md text-base font-medium leading-relaxed text-slate-500">{t.level1CompleteBody}</p>
          <button type="button" onClick={nextStage} className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white shadow-lg transition hover:bg-slate-800">
            {t.forwardLevel2}
            <NextIcon size={20} />
          </button>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "level2_scoring") {
    const scoredCount = Object.keys(state.scores).length;
    const isComplete = scoredCount === 6;
    const scoringProgress = Math.round((scoredCount / 6) * 100);

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage}>
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-black uppercase tracking-widest text-blue-600">{t.level2}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t.rateJob}</h1>
            <p className="mt-2 font-medium text-slate-500">{t.ratePrompt}</p>
            <p className="mt-2 text-xs font-bold text-slate-400">{t.scoreHelp}</p>

            <div className="mx-auto mt-7 max-w-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.scoringProgress}</span>
                <span className="text-sm font-black text-blue-600">{scoredCount} / 6</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <motion.div initial={{ width: 0 }} animate={{ width: `${scoringProgress}%` }} className="h-full rounded-full bg-blue-600" transition={{ duration: 0.35, ease: "easeOut" }} />
              </div>
            </div>
          </header>

          <div className="space-y-4">
            {state.activeCards.map((card) => {
              const styles = getCategoryStyles(card.category);
              const copy = getMotivatorText(card, state.language);
              return (
                <div key={card.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className={`absolute top-0 h-full w-1.5 ${styles.bg} ltr:left-0 rtl:right-0`} />
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className={isRtl ? "pr-3" : "pl-3"}>
                      <span className={`mb-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${styles.light} ${styles.text} ${styles.border}`}>
                        {copy.category}
                      </span>
                      <h3 className="text-xl font-black tracking-tight text-slate-950">{copy.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">{copy.description}</p>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {SCORE_OPTIONS.map((score) => {
                        const isSelected = state.scores[card.id] === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setScore(card.id, score)}
                            title={SCORE_LABELS[state.language][String(score) as keyof (typeof SCORE_LABELS)[Language]]}
                            className={`h-11 min-w-10 rounded-lg border text-sm font-black transition ${
                              isSelected
                                ? `${getScoreBgClass(score)} border-transparent text-white shadow-md`
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-white"
                            }`}
                          >
                            {formatScore(score)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={finishGame}
            disabled={!isComplete}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg py-5 text-lg font-black shadow-lg transition ${
              isComplete ? "bg-slate-950 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
            }`}
          >
            {t.showReport}
            <NextIcon size={20} />
          </button>
        </div>
      </Shell>
    );
  }

  if (state.stage === "results") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage}>
        <main className="mx-auto max-w-6xl space-y-6 print:max-w-none">
          <div id="motivation-report" className="space-y-6 bg-slate-100 p-0">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-slate-950 p-7 text-white sm:p-9">
                  <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-lg bg-white/10">
                    <BarChart3 size={28} />
                  </div>
                  <h1 className="mt-2 text-4xl font-black tracking-tight">{t.reportTitle}</h1>
                  <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-slate-300">{t.reportSubtitle}</p>
                </div>

                <div className="grid content-center gap-3 border-slate-100 p-7 text-sm font-bold text-slate-600 lg:border-l sm:p-9">
                  <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                    <span>{t.company}</span>
                    <strong className="text-slate-950">{state.companyName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                    <span>{t.participant}</span>
                    <strong className="text-slate-950">{state.participantName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                    <span>{t.position}</span>
                    <strong className="text-slate-950">{state.participantPosition}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-5">
                    <span>{t.date}</span>
                    <strong className="text-slate-950">{new Date().toLocaleDateString(state.language === "fa" ? "fa-IR" : "en-US")}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label={t.averageAlignment} value={averageScore.toFixed(1)} tone={getScoreTextClass(averageScore)} />
              <MetricCard label={t.matches} value={`${matchesCount}/6`} tone="text-emerald-600" />
              <MetricCard label={t.gaps} value={`${gapsCount}/6`} tone="text-red-500" />
              <MetricCard label={t.strongestMatch} value={strongestMatch ? strongestMatch.copy.title : t.neutral} tone={strongestMatch ? getScoreTextClass(strongestMatch.score) : undefined} />
              <MetricCard label={t.biggestGap} value={biggestGap && biggestGap.score < 0 ? biggestGap.copy.title : t.noGap} tone="text-red-500" />
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black tracking-tight text-slate-950">{t.reportSystem}</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{t.reportSystemBody}</p>
                <div className="mt-6 space-y-4">
                  {reportItems.map((item) => {
                    const width = `${((item.score + 3) / 6) * 100}%`;
                    return (
                      <div key={item.card.id}>
                        <div className="mb-1 flex items-center justify-between gap-4 text-xs font-black">
                          <span className="text-slate-700">{item.copy.title}</span>
                          <span className={getScoreTextClass(item.score)}>{formatScore(item.score)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${getScoreBgClass(item.score)}`} style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black tracking-tight text-slate-950">{t.selectedMotivators}</h2>
                <div className="mt-5 grid gap-3">
                  {reportItems.map((item) => {
                    const styles = getCategoryStyles(item.card.category);
                    const label = SCORE_LABELS[state.language][String(item.score) as keyof (typeof SCORE_LABELS)[Language]];
                    return (
                      <div key={item.card.id} className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <div className={`absolute top-0 h-full w-1.5 ${styles.bg} ltr:left-0 rtl:right-0`} />
                        <div className={`flex items-start justify-between gap-4 ${isRtl ? "pr-3" : "pl-3"}`}>
                          <div>
                            <h3 className="text-lg font-black leading-tight text-slate-950">{item.copy.title}</h3>
                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{item.copy.category}</p>
                            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{item.copy.description}</p>
                          </div>
                          <div className="flex min-w-20 flex-col items-center rounded-lg bg-white px-3 py-2 shadow-sm">
                            <span className={`text-2xl font-black ${getScoreTextClass(item.score)}`}>{formatScore(item.score)}</span>
                            <span className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row print:hidden">
            <button type="button" onClick={exportPDF} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white transition hover:bg-slate-800">
              <Printer size={20} />
              {t.exportPDF}
            </button>
            <button type="button" onClick={resetGame} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-4 font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <RefreshCcw size={20} />
              {t.newSession}
            </button>
          </div>
        </main>
      </Shell>
    );
  }

  return null;
}
