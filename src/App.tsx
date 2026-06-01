import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  FolderOpen,
  Info,
  Languages,
  Pencil,
  Play,
  Printer,
  RefreshCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { MOTIVATORS, Motivator } from "./data/motivators";
import * as XLSX from "xlsx";
import type ExcelJS from "exceljs";
import * as api from "./api";

type GameStage =
  | "welcome"
  | "instructions"
  | "playing"
  | "level2_intro"
  | "level2_scoring"
  | "results"
  | "saved_reports"
  | "team_report"
  | "admin_settings"
  | "admin_panel";

type Role = "participant" | "facilitator" | "admin";

interface AuthState {
  role: Role | null;
  companyId?: string;
  companyName?: string;
}
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
  companyId: string | null;
  yearOfBirth: number | null;
  sex: string;
  seniority: string;
  department: string;
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
  companyId?: string | null;
  yearOfBirth?: number | null;
  sex?: string | null;
  seniority?: string | null;
  department?: string | null;
}

const SEX_OPTIONS = [
  { value: "male", labelEn: "Male", labelFa: "مرد" },
  { value: "female", labelEn: "Female", labelFa: "زن" },
  { value: "prefer_not", labelEn: "Prefer not to say", labelFa: "ترجیح می‌دهم نگویم" },
] as const;

const SENIORITY_OPTIONS = [
  { value: "junior", labelEn: "Junior", labelFa: "جونیور" },
  { value: "mid", labelEn: "Mid-Level", labelFa: "میانی" },
  { value: "senior", labelEn: "Senior", labelFa: "ارشد" },
  { value: "lead", labelEn: "Lead", labelFa: "سرپرست" },
  { value: "manager", labelEn: "Manager", labelFa: "مدیر" },
  { value: "director", labelEn: "Director or Executive", labelFa: "مدیر ارشد" },
] as const;

const BIRTH_YEARS = Array.from({ length: 2005 - 1950 + 1 }, (_, i) => 1950 + i).reverse();

const STORAGE_KEY = "hr_motivator_game_simple";
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
    back: "Back",
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
    editReport: "Edit",
    deleteReport: "Delete",
    editParticipant: "Edit Participant",
    assignCompany: "Assign Company",
    noCompany: "No company",
    saveChanges: "Save",
    cancelEdit: "Cancel",
    backToStart: "Back to Start",
    backToReports: "Back to Reports",
    savedAutomatically: "Saved automatically",
    lastUpdated: "Last updated",
    teamReport: "Team Report",
    teamReportBody: "Aggregate motivator scores across all saved reports.",
    viewTeamReport: "View Team Report",
    filterByCompany: "Filter by company",
    allCompanies: "All companies",
    timesSelected: "Selected",
    positiveSum: "Positive",
    negativeSum: "Negative",
    netScore: "Net",
    motivator: "Motivator",
    category: "Category",
    noReportsForCompany: "No completed reports for this company.",
    participants: "participants",
    loginTitle: "Welcome",
    loginSubtitle: "Choose your role to continue.",
    roleParticipant: "Participant",
    roleParticipantDesc: "Play the game and see your own report.",
    roleFacilitator: "Facilitator",
    roleFacilitatorDesc: "Access all reports and team analytics.",
    facilitatorPassword: "Facilitator password",
    passwordPlaceholder: "Enter password",
    wrongPassword: "Incorrect password.",
    signOut: "Sign out",
    settings: "Settings",
    changePassword: "Change facilitator password",
    newPassword: "New password",
    currentPassword: "Current password",
    savePassword: "Save password",
    passwordSaved: "Password saved.",
    passwordMismatch: "Current password is incorrect.",
    myReport: "My Report",
    roleAdmin: "Admin",
    roleAdminDesc: "Manage companies and view all reports.",
    adminPanel: "Admin Panel",
    adminPassword: "Admin password",
    companies: "Companies",
    addCompany: "Add company",
    companyFacilitatorPw: "Facilitator password",
    companyNameTaken: "A company with that name already exists.",
    noCompanies: "No companies yet. Add one below.",
    copyLink: "Copy link",
    copied: "Copied!",
    reportsCount: "reports",
    companyCodeLabel: "Company access code (optional)",
    companyCodePlaceholder: "e.g. ABCD1234",
    invalidCode: "Invalid company code.",
    linkedTo: "Linked to",
    applyCode: "Apply",
    facilitatorCode: "Company code",
    facilitatorCodePlaceholder: "8-character code",
    facilitatorLoginError: "Wrong company code or password.",
    resetCode: "Reset code",
    viewingReportsFor: "Viewing reports for",
    deleteCompany: "Delete",
    yearOfBirth: "Year of birth",
    sex: "Sex",
    seniority: "Seniority level",
    department: "Department",
    selectYear: "Select year",
    selectSex: "Select",
    selectSeniority: "Select",
    selectDepartment: "Select department",
    sexMale: "Male",
    sexFemale: "Female",
    sexPreferNot: "Prefer not to say",
    seniorityJunior: "Junior",
    seniorityMid: "Mid-Level",
    senioritySenior: "Senior",
    seniorityLead: "Lead",
    seniorityManager: "Manager",
    seniorityDirector: "Director or Executive",
    testLimit: "Test limit",
    testLimitPlaceholder: "Unlimited",
    departments: "Departments",
    addDepartment: "Add department",
    departmentName: "Department name",
    departmentLimit: "Limit",
    saveSettings: "Save Settings",
    companySettings: "Settings",
    limitReached: "This session could not be saved — the company's test limit has been reached.",
    departmentLimitReached: "This session could not be saved — the department's test limit has been reached.",
    companyLimitBlockStart: "This company has reached its maximum number of tests. Please contact your facilitator.",
    departmentLimitBlockStart: "This department has reached its maximum number of tests. Please contact your facilitator.",
    filterBySex: "Filter by sex",
    filterBySeniority: "Filter by seniority",
    filterByDepartment: "Filter by department",
    filterByBirthDecade: "Filter by birth decade",
    allSex: "All",
    allSeniority: "All",
    allDepartments: "All departments",
    allDecades: "All decades",
    numberAnalysis: "Number Analysis",
    valueAnalysis: "Value Analysis",
    categoryAnalysis: "Category Breakdown",
    adoptionRate: "Adoption",
    ofParticipants: "of participants",
    avgScore: "Avg. score",
    totalSelectionsLabel: "total selections",
    sortedByAdoption: "Sorted by: share of all motivator selections",
    sortedByNetCount: "Sorted by: total times selected",
    sortedByValue: "Sorted by: positive sum + |negative sum|",
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
    back: "بازگشت",
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
    editReport: "ویرایش",
    deleteReport: "حذف",
    editParticipant: "ویرایش شرکت‌کننده",
    assignCompany: "تخصیص شرکت",
    noCompany: "بدون شرکت",
    saveChanges: "ذخیره",
    cancelEdit: "انصراف",
    backToStart: "بازگشت به شروع",
    backToReports: "بازگشت به گزارش‌ها",
    savedAutomatically: "ذخیره خودکار",
    lastUpdated: "آخرین به روزرسانی",
    teamReport: "گزارش تیمی",
    teamReportBody: "مجموع امتیازات انگیزاننده ها در تمام گزارش های ذخیره شده.",
    viewTeamReport: "مشاهده گزارش تیمی",
    filterByCompany: "فیلتر بر اساس شرکت",
    allCompanies: "همه شرکت ها",
    timesSelected: "انتخاب شده",
    positiveSum: "مثبت",
    negativeSum: "منفی",
    netScore: "خالص",
    motivator: "انگیزاننده",
    category: "دسته",
    noReportsForCompany: "هیچ گزارش کاملی برای این شرکت وجود ندارد.",
    participants: "شرکت کننده",
    loginTitle: "خوش آمدید",
    loginSubtitle: "نقش خود را انتخاب کنید.",
    roleParticipant: "شرکت کننده",
    roleParticipantDesc: "بازی کنید و گزارش خود را ببینید.",
    roleFacilitator: "تسهیل گر",
    roleFacilitatorDesc: "دسترسی به همه گزارش ها و تحلیل تیمی.",
    facilitatorPassword: "رمز عبور تسهیل گر",
    passwordPlaceholder: "رمز عبور را وارد کنید",
    wrongPassword: "رمز عبور اشتباه است.",
    signOut: "خروج",
    settings: "تنظیمات",
    changePassword: "تغییر رمز عبور تسهیل گر",
    newPassword: "رمز عبور جدید",
    currentPassword: "رمز عبور فعلی",
    savePassword: "ذخیره رمز عبور",
    passwordSaved: "رمز عبور ذخیره شد.",
    passwordMismatch: "رمز عبور فعلی اشتباه است.",
    myReport: "گزارش من",
    roleAdmin: "مدیر سیستم",
    roleAdminDesc: "مدیریت شرکت‌ها و مشاهده همه گزارش‌ها.",
    adminPanel: "پنل مدیریت",
    adminPassword: "رمز عبور مدیر",
    companies: "شرکت‌ها",
    addCompany: "افزودن شرکت",
    companyFacilitatorPw: "رمز عبور تسهیل‌گر",
    companyNameTaken: "شرکتی با این نام از قبل وجود دارد.",
    noCompanies: "هنوز شرکتی اضافه نشده.",
    copyLink: "کپی لینک",
    copied: "کپی شد!",
    reportsCount: "گزارش",
    companyCodeLabel: "کد دسترسی شرکت (اختیاری)",
    companyCodePlaceholder: "مثلاً ABCD1234",
    invalidCode: "کد شرکت نامعتبر است.",
    linkedTo: "متصل به",
    applyCode: "اعمال",
    facilitatorCode: "کد شرکت",
    facilitatorCodePlaceholder: "کد ۸ کاراکتری",
    facilitatorLoginError: "کد شرکت یا رمز عبور اشتباه است.",
    resetCode: "بازنشانی کد",
    viewingReportsFor: "نمایش گزارش‌های",
    deleteCompany: "حذف",
    yearOfBirth: "سال تولد",
    sex: "جنسیت",
    seniority: "سطح ارشدیت",
    department: "دپارتمان",
    selectYear: "انتخاب سال",
    selectSex: "انتخاب",
    selectSeniority: "انتخاب",
    selectDepartment: "انتخاب دپارتمان",
    sexMale: "مرد",
    sexFemale: "زن",
    sexPreferNot: "ترجیح می‌دهم نگویم",
    seniorityJunior: "جونیور",
    seniorityMid: "میانی",
    senioritySenior: "ارشد",
    seniorityLead: "سرپرست",
    seniorityManager: "مدیر",
    seniorityDirector: "مدیر ارشد",
    testLimit: "محدودیت تست",
    testLimitPlaceholder: "نامحدود",
    departments: "دپارتمان‌ها",
    addDepartment: "افزودن دپارتمان",
    departmentName: "نام دپارتمان",
    departmentLimit: "محدودیت",
    saveSettings: "ذخیره تنظیمات",
    companySettings: "تنظیمات",
    limitReached: "این جلسه ذخیره نشد — سقف تست شرکت پر شده است.",
    departmentLimitReached: "این جلسه ذخیره نشد — سقف تست دپارتمان پر شده است.",
    companyLimitBlockStart: "این شرکت به حداکثر تعداد تست‌های خود رسیده است. با تسهیل‌گر خود تماس بگیرید.",
    departmentLimitBlockStart: "این دپارتمان به حداکثر تعداد تست‌های خود رسیده است. با تسهیل‌گر خود تماس بگیرید.",
    filterBySex: "فیلتر بر اساس جنسیت",
    filterBySeniority: "فیلتر بر اساس ارشدیت",
    filterByDepartment: "فیلتر بر اساس دپارتمان",
    filterByBirthDecade: "فیلتر بر اساس دهه تولد",
    allSex: "همه",
    allSeniority: "همه",
    allDepartments: "همه دپارتمان‌ها",
    allDecades: "همه دهه‌ها",
    numberAnalysis: "تحلیل تعدادی",
    valueAnalysis: "تحلیل ارزشی",
    categoryAnalysis: "تفکیک دسته‌ها",
    adoptionRate: "کاربرد",
    ofParticipants: "از شرکت‌کنندگان",
    avgScore: "میانگین امتیاز",
    totalSelectionsLabel: "کل انتخاب‌ها",
    sortedByAdoption: "مرتب‌سازی: سهم از کل انتخاب‌های انگیزاننده",
    sortedByNetCount: "مرتب‌سازی: کل تعداد انتخاب‌شدن",
    sortedByValue: "مرتب‌سازی: مجموع مثبت + قدر مطلق مجموع منفی",
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
  onSignOut?: () => void;
  onSettings?: () => void;
  role?: Role | null;
  settingsLabel?: string;
  signOutLabel?: string;
  forceDir?: "ltr" | "rtl";
}

const Shell: React.FC<ShellProps> = ({ children, language, onToggleLanguage, compact, onSignOut, onSettings, role, settingsLabel, signOutLabel, forceDir }) => {
  const t = TEXT[language];

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 ${language === "fa" ? "font-fa" : ""}`} dir={forceDir ?? (language === "fa" ? "rtl" : "ltr")}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className={`relative mx-auto w-full ${compact ? "max-w-3xl" : "max-w-7xl"} px-4 py-5 sm:px-6 lg:px-8`}>
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Languages size={16} />
              {t.languageName}
            </button>
            {role === "admin" && onSettings && (
              <button type="button" onClick={onSettings} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                {settingsLabel}
              </button>
            )}
            {onSignOut && (
              <button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                {signOutLabel}
              </button>
            )}
          </div>
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
      companyId: null,
      yearOfBirth: null,
      sex: "",
      seniority: "",
      department: "",
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
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("__all__");
  const [teamReportTab, setTeamReportTab] = useState<"count" | "value" | "category">("count");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ participantName: "", participantPosition: "", companyName: "", companyId: "" });
  const [playHistory, setPlayHistory] = useState<Array<Pick<GameState, "activeCards" | "discardedCards" | "currentIndex" | "newestCardId" | "stage">>>([]);
  const [resultSource, setResultSource] = useState<"game" | "saved_reports">("game");
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("hr_motivator_role");
    const role = (saved === "facilitator" || saved === "participant" || saved === "admin") ? saved as Role : null;
    if ((role === "facilitator" || role === "admin") && !api.getToken()) return { role: null };
    if (role === "facilitator") {
      const companyId = localStorage.getItem("hr_motivator_company_id") || undefined;
      const companyName = localStorage.getItem("hr_motivator_company_name") || undefined;
      return { role, companyId, companyName };
    }
    return { role };
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState(false);

  // Limit error state (results screen)
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitCheckError, setLimitCheckError] = useState<string | null>(null);

  // Team report filters
  const [teamFilterSex, setTeamFilterSex] = useState<string>("__all__");
  const [teamFilterSeniority, setTeamFilterSeniority] = useState<string>("__all__");
  const [teamFilterDepartment, setTeamFilterDepartment] = useState<string>("__all__");
  const [teamFilterDecade, setTeamFilterDecade] = useState<string>("__all__");

  // Company settings editing (admin panel)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companySettingsForm, setCompanySettingsForm] = useState<{
    testLimit: string;
    departments: { name: string; limit: string }[];
  }>({ testLimit: "", departments: [] });

  // Company code resolution (participant welcome screen)
  const [resolvedCompany, setResolvedCompany] = useState<{ id: string; name: string; code: string; departments: { name: string; limit?: number | null }[] } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  // Facilitator login
  const [facCodeInput, setFacCodeInput] = useState("");
  const [facPasswordInput, setFacPasswordInput] = useState("");
  const [facLoginError, setFacLoginError] = useState(false);

  // Admin panel
  const [companies, setCompanies] = useState<api.Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyPassword, setNewCompanyPassword] = useState("");
  const [companyFormError, setCompanyFormError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  // Parse ?code= URL param on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    const upper = code.toUpperCase();
    setCodeInput(upper);
    setFacCodeInput(upper);
    api.resolveCompanyCode(upper).then((company) => {
      if (company) setResolvedCompany(company);
      else setCodeError(true);
    }).catch(() => setCodeError(true));
  }, []);

  // Persist report to server whenever results are shown
  useEffect(() => {
    if (state.stage !== "results" || !state.currentReportId || state.activeCards.length !== 6) return;
    setLimitError(null);
    const now = new Date().toISOString();
    const existing = savedReports.find((r) => r.id === state.currentReportId);
    const report: SavedReport = {
      id: state.currentReportId!,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      participantName: state.participantName,
      participantPosition: state.participantPosition,
      companyName: state.companyName,
      language: state.language,
      activeCards: state.activeCards,
      scores: state.scores,
      companyId: state.companyId,
      yearOfBirth: state.yearOfBirth,
      sex: state.sex || null,
      seniority: state.seniority || null,
      department: state.department || null,
    };
    api.upsertReport(report).then(() => {
      setSavedReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    }).catch((err: any) => {
      if (err?.status === 403) {
        const errCode = err?.message;
        if (errCode === "department_limit_reached") {
          setLimitError(TEXT[state.language].departmentLimitReached);
        } else {
          setLimitError(TEXT[state.language].limitReached);
        }
      } else {
        setSavedReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
        console.error(err);
      }
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
    state.yearOfBirth,
    state.sex,
    state.seniority,
    state.department,
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

  const startGame = async () => {
    const participantName = state.participantName.trim();
    const participantPosition = state.participantPosition.trim();
    const companyName = resolvedCompany ? resolvedCompany.name : state.companyName.trim();
    if (!participantName || !participantPosition || !companyName) return;

    setLimitCheckError(null);
    if (resolvedCompany) {
      const check = await api.checkCompanyLimit(resolvedCompany.id, state.department || undefined).catch(() => ({ allowed: true as const, reason: undefined }));
      if (!check.allowed) {
        const msg = check.reason === "department_limit_reached" ? t.departmentLimitBlockStart : t.companyLimitBlockStart;
        setLimitCheckError(msg);
        return;
      }
    }

    const deck = shuffle(MOTIVATORS);
    setPlayHistory([]);
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
      companyId: resolvedCompany?.id ?? null,
      yearOfBirth: prev.yearOfBirth,
      sex: prev.sex,
      seniority: prev.seniority,
      department: prev.department,
    }));
  };

  const nextStage = () => {
    if (state.stage === "instructions") setState((prev) => ({ ...prev, stage: "playing" }));
    if (state.stage === "level2_intro") setState((prev) => ({ ...prev, stage: "level2_scoring" }));
  };

  const pushPlaySnapshot = () => {
    setPlayHistory((prev) => [
      ...prev,
      { activeCards: state.activeCards, discardedCards: state.discardedCards, currentIndex: state.currentIndex, newestCardId: state.newestCardId, stage: state.stage },
    ]);
  };

  const undoPlay = () => {
    setPlayHistory((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setState((s) => ({ ...s, ...snapshot }));
      return prev.slice(0, -1);
    });
  };

  const nextCard = () => {
    if (state.currentIndex >= state.shuffledDeck.length) return;
    const card = state.shuffledDeck[state.currentIndex];
    pushPlaySnapshot();
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

    pushPlaySnapshot();
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
    setResultSource("game");
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
      companyId: null,
      yearOfBirth: null,
      sex: "",
      seniority: "",
      department: "",
    }));
  };

  const openSavedReports = () => {
    api.fetchReports().then(setSavedReports).catch(console.error);
    setState((prev) => ({ ...prev, stage: "saved_reports" }));
  };

  const openTeamReport = () => {
    api.fetchReports().then(setSavedReports).catch(console.error);
    setState((prev) => ({ ...prev, stage: "team_report" }));
  };

  const openSavedReport = (report: SavedReport) => {
    setResultSource("saved_reports");
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
      currentReportId: report.id,
      yearOfBirth: report.yearOfBirth ?? null,
      sex: report.sex ?? "",
      seniority: report.seniority ?? "",
      department: report.department ?? "",
    }));
  };

  const deleteSavedReport = (id: string) => {
    api.deleteReport(id).catch(console.error);
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
    if (state.currentReportId === id) {
      setState((prev) => ({ ...prev, currentReportId: null }));
    }
  };

  const startEditReport = (report: SavedReport) => {
    if (auth.role === "admin") api.fetchCompanies().then(setCompanies).catch(console.error);
    setEditForm({
      participantName: report.participantName,
      participantPosition: report.participantPosition,
      companyName: report.companyName,
      companyId: report.companyId ?? "",
    });
    setEditingReportId(report.id);
  };

  const saveReportEdit = async () => {
    if (!editingReportId) return;
    const fields = auth.role === "admin"
      ? { participantName: editForm.participantName, participantPosition: editForm.participantPosition, companyName: editForm.companyName, companyId: editForm.companyId || null }
      : { participantName: editForm.participantName, participantPosition: editForm.participantPosition };
    await api.patchReport(editingReportId, fields).catch(console.error);
    setSavedReports((prev) => prev.map((r) => r.id === editingReportId ? { ...r, ...fields, companyId: (fields as any).companyId ?? r.companyId, companyName: (fields as any).companyName ?? r.companyName } : r));
    setEditingReportId(null);
  };

  const backToStart = () => {
    setState((prev) => ({ ...prev, stage: "welcome" }));
  };

  const loginAsParticipant = () => {
    setAuth({ role: "participant" });
    localStorage.setItem("hr_motivator_role", "participant");
  };

  const loginAsFacilitator = async () => {
    const result = await api.verifyFacilitatorPassword(facCodeInput, facPasswordInput);
    if (result) {
      setAuth({ role: "facilitator", companyId: result.companyId, companyName: result.companyName });
      localStorage.setItem("hr_motivator_role", "facilitator");
      localStorage.setItem("hr_motivator_company_id", result.companyId);
      localStorage.setItem("hr_motivator_company_name", result.companyName);
      setFacCodeInput(""); setFacPasswordInput(""); setFacLoginError(false);
      api.fetchReports().then(setSavedReports).catch(console.error);
    } else {
      setFacLoginError(true);
    }
  };

  const loginAsAdmin = async () => {
    const ok = await api.verifyAdminPassword(passwordInput);
    if (ok) {
      setAuth({ role: "admin" });
      localStorage.setItem("hr_motivator_role", "admin");
      setPasswordInput(""); setPasswordError(false);
      api.fetchReports().then(setSavedReports).catch(console.error);
    } else {
      setPasswordError(true);
    }
  };

  const signOut = async () => {
    await api.signOut();
    localStorage.removeItem("hr_motivator_role");
    localStorage.removeItem("hr_motivator_company_id");
    localStorage.removeItem("hr_motivator_company_name");
    setAuth({ role: null });
    setPasswordInput(""); setPasswordError(false);
    setFacCodeInput(""); setFacPasswordInput(""); setFacLoginError(false);
    setState((prev) => ({ ...prev, stage: "welcome" }));
  };

  const saveNewPassword = async () => {
    const ok = await api.changeAdminPassword(pwCurrent, pwNew);
    if (!ok) { setPwError(true); return; }
    localStorage.removeItem("hr_motivator_role");
    setAuth({ role: null });
    setPwCurrent(""); setPwNew(""); setPwError(false); setPwSaved(true);
  };

  const resolveCode = async (code: string) => {
    if (!code.trim()) return;
    setCodeLoading(true);
    setCodeError(false);
    const company = await api.resolveCompanyCode(code.trim());
    setCodeLoading(false);
    if (company) { setResolvedCompany(company); setFacCodeInput(company.code); }
    else setCodeError(true);
  };

  const openAdminPanel = () => {
    api.fetchCompanies().then(setCompanies).catch(console.error);
    setState((prev) => ({ ...prev, stage: "admin_panel" }));
  };

  const createCompany = async () => {
    if (!newCompanyName.trim() || !newCompanyPassword) return;
    setCompanyFormError("");
    try {
      const company = await api.createCompany(newCompanyName.trim(), newCompanyPassword);
      setCompanies((prev) => [company, ...prev]);
      setNewCompanyName(""); setNewCompanyPassword("");
    } catch (err: any) {
      setCompanyFormError(err?.message === "company_name_taken" ? t.companyNameTaken : "Failed to create company.");
    }
  };

  const deleteCompanyById = async (id: string) => {
    await api.deleteCompany(id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const resetCompanyCodeById = async (id: string) => {
    const newCode = await api.resetCompanyCode(id);
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, accessCode: newCode } : c));
  };

  const saveCompanySettings = async (companyId: string) => {
    const departments = companySettingsForm.departments
      .filter((d) => d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        limit: d.limit.trim() ? parseInt(d.limit.trim(), 10) : null,
      }));
    const testLimit = companySettingsForm.testLimit.trim() ? parseInt(companySettingsForm.testLimit.trim(), 10) : null;
    await api.updateCompanySettings(companyId, departments, testLimit);
    setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, departments, testLimit } : c));
    setEditingCompanyId(null);
  };

  const copyShareLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const exportPDF = () => {
    const previousTitle = document.title;
    document.title = getReportFileBase(state.participantName);
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  };

  const exportTeamReportPDF = (
    rows: { motivator: Motivator; positiveCount: number; negativeCount: number; positiveSum: number; negativeSum: number; timesSelected: number }[],
    participantCount: number,
    company: string,
    lang: Language,
    maxC: number,
    maxV: number,
    activeFilters?: Record<string, string>,
  ) => {
    const filterSuffix = activeFilters ? Object.values(activeFilters).filter(Boolean).join(", ") : "";
    const title = `Team Motivator Report${company !== "__all__" ? ` — ${company}` : ""}`;
    const isFA = lang === "fa";
    const dir = isFA ? "rtl" : "ltr";
    const dateStr = new Date().toLocaleDateString(isFA ? "fa-IR" : "en-US");
    const totalSel = rows.reduce((s, r) => s + r.timesSelected, 0);

    // Category breakdown
    const CATCOLORS: Record<string, string> = {
      "Working Style": "#2563eb", Environment: "#059669", Growth: "#9333ea",
      Leadership: "#d97706", "Personal Flow": "#e11d48", Rewards: "#ca8a04",
      Security: "#4f46e5", Social: "#ea580c", Wellbeing: "#0d9488",
    };
    const catBreakdown = [...new Set(rows.map((r) => r.motivator.category))]
      .map((cat) => {
        const cs = rows.filter((r) => r.motivator.category === cat);
        const sel  = cs.reduce((s, r) => s + r.timesSelected, 0);
        const posS = cs.reduce((s, r) => s + r.positiveSum, 0);
        const negS = cs.reduce((s, r) => s + r.negativeSum, 0);
        const posC = cs.reduce((s, r) => s + r.positiveCount, 0);
        const negC = cs.reduce((s, r) => s + r.negativeCount, 0);
        const avg  = sel > 0 ? (posS + negS) / sel : 0;
        const pct  = totalSel > 0 ? (sel / totalSel) * 100 : 0;
        const adp  = participantCount > 0 && cs.length > 0 ? (sel / (participantCount * cs.length)) * 100 : 0;
        return { cat, sel, pct, avg, net: posS + negS, posC, negC, adp, color: CATCOLORS[cat] || "#64748b" };
      })
      .sort((a, b) => b.sel - a.sel);

    const countRowsLocal = [...rows].sort((a, b) => b.timesSelected - a.timesSelected);
    const valueRowsLocal = [...rows].sort((a, b) => (b.positiveSum + Math.abs(b.negativeSum)) - (a.positiveSum + Math.abs(a.negativeSum)));
    const topCategory = catBreakdown[0];
    const topMotivator = [...rows].sort((a, b) => b.timesSelected - a.timesSelected)[0];
    const topMotivatorCopy = topMotivator ? getMotivatorText(topMotivator.motivator, lang) : null;
    const topCatName = topCategory ? (isFA ? (CATEGORY_FA[topCategory.cat] || topCategory.cat) : topCategory.cat) : "";

    const pc = `print-color-adjust:exact;-webkit-print-color-adjust:exact`;

    const barRow = (label: string, adoptPct: number, posW: number, negW: number, posLabel: string, negLabel: string, idx: number) => {
      const bg = idx % 2 === 1 ? "background:#f8fafc;" : "";
      return `<tr style="${bg}">
        <td style="width:44px;text-align:right;padding:4px 5px;font-size:11px;color:#ef4444;font-weight:800;white-space:nowrap;vertical-align:middle">${negLabel}</td>
        <td style="width:36%;padding:4px 3px;vertical-align:middle">
          <div style="height:9px;background:#fee2e2;border-radius:4px 0 0 4px;overflow:hidden;${pc}">
            <div style="height:100%;width:${negW}%;background:#f87171;margin-left:auto;${pc}"></div>
          </div>
        </td>
        <td style="padding:4px 8px;text-align:center;vertical-align:middle">
          <div style="font-weight:800;font-size:11px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:700;margin-top:1px">${adoptPct}%</div>
        </td>
        <td style="width:36%;padding:4px 3px;vertical-align:middle">
          <div style="height:9px;background:#d1fae5;border-radius:0 4px 4px 0;overflow:hidden;${pc}">
            <div style="height:100%;width:${posW}%;background:#34d399;${pc}"></div>
          </div>
        </td>
        <td style="width:44px;text-align:left;padding:4px 5px;font-size:11px;color:#10b981;font-weight:800;white-space:nowrap;vertical-align:middle">${posLabel}</td>
      </tr>`;
    };

    const countTable = countRowsLocal.map((r, i) => {
      const copy = getMotivatorText(r.motivator, lang);
      const adp = participantCount > 0 ? Math.round((r.timesSelected / participantCount) * 100) : 0;
      return barRow(copy.title, adp, (r.positiveCount / maxC) * 100, (r.negativeCount / maxC) * 100, `+${r.positiveCount}`, `−${r.negativeCount}`, i);
    }).join("");

    const valueTable = valueRowsLocal.map((r, i) => {
      const copy = getMotivatorText(r.motivator, lang);
      const adp = participantCount > 0 ? Math.round((r.timesSelected / participantCount) * 100) : 0;
      return barRow(copy.title, adp, (r.positiveSum / maxV) * 100, (Math.abs(r.negativeSum) / maxV) * 100,
        r.positiveSum > 0 ? `+${r.positiveSum}` : "—",
        r.negativeSum < 0 ? `${r.negativeSum}` : "—", i);
    }).join("");

    const catRows = catBreakdown.map((c, i) => {
      const bg = i % 2 === 1 ? "background:#f8fafc;" : "";
      const name = isFA ? (CATEGORY_FA[c.cat] || c.cat) : c.cat;
      const avgColor = c.avg > 0 ? "#059669" : c.avg < 0 ? "#ef4444" : "#94a3b8";
      const netColor = c.net > 0 ? "#059669" : c.net < 0 ? "#ef4444" : "#94a3b8";
      return `<tr style="${bg}">
        <td style="padding:5px 6px;vertical-align:middle;white-space:nowrap">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c.color};margin-right:6px;vertical-align:middle;${pc}"></span>
          <span style="font-size:11px;font-weight:800;color:#0f172a">${name}</span>
        </td>
        <td style="padding:5px 3px;vertical-align:middle;width:44%">
          <div style="height:10px;background:#f1f5f9;border-radius:20px;overflow:hidden;${pc}">
            <div style="height:100%;width:${c.pct}%;background:${c.color};border-radius:20px;${pc}"></div>
          </div>
        </td>
        <td style="padding:5px 6px;font-size:11px;font-weight:900;color:#334155;text-align:right;white-space:nowrap;vertical-align:middle">${c.pct.toFixed(1)}%</td>
        <td style="padding:5px 6px;font-size:10px;font-weight:700;color:#64748b;text-align:right;white-space:nowrap;vertical-align:middle">${Math.round(c.adp)}% adp</td>
        <td style="padding:5px 6px;font-size:11px;font-weight:800;color:${avgColor};text-align:right;white-space:nowrap;vertical-align:middle">${c.avg >= 0 ? "+" : ""}${c.avg.toFixed(1)} avg</td>
        <td style="padding:5px 6px;font-size:11px;font-weight:900;color:${netColor};text-align:right;white-space:nowrap;vertical-align:middle">${c.net > 0 ? "+" : ""}${c.net} net</td>
      </tr>`;
    }).join("");

    const section = (heading: string, subtitle: string, body: string) => `
      <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:18px;break-inside:avoid">
        <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:2px">${heading}</div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">${subtitle}</div>
        ${body}
      </div>`;

    const statCard = (value: string, label: string) =>
      `<div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;text-align:center">
        <div style="font-size:20px;font-weight:900;color:#0f172a">${value}</div>
        <div style="font-size:10px;color:#64748b;font-weight:700;margin-top:3px">${label}</div>
      </div>`;

    const legend = (items: { color: string; label: string }[]) =>
      `<div style="display:flex;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9">
        ${items.map(it => `<span style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#64748b">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${it.color};${pc}"></span>${it.label}</span>`).join("")}
      </div>`;

    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a}
  .page{max-width:800px;margin:0 auto;padding:28px 24px}
  @media print{
    @page{margin:1.2cm;size:A4}
    body{background:white}
    .page{padding:0;max-width:none}
    *{${pc}}
  }
</style>
</head><body><div class="page">

  <!-- Header -->
  <div style="background:#0f172a;border-radius:12px;padding:24px 28px;margin-bottom:20px;${pc}">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.3px">${title}</div>
    <div style="font-size:11px;color:#64748b;margin-top:6px">${dateStr}${filterSuffix ? ` &nbsp;·&nbsp; <span style="font-style:italic">${filterSuffix}</span>` : ""}</div>
  </div>

  <!-- Summary cards -->
  <div style="display:flex;gap:12px;margin-bottom:18px">
    ${statCard(String(participantCount), isFA ? "شرکت‌کننده" : "Participants")}
    ${statCard(String(totalSel), isFA ? "کل انتخاب‌ها" : "Total Selections")}
    ${topCatName ? statCard(topCatName, isFA ? "محبوب‌ترین دسته" : "Top Category") : ""}
    ${topMotivatorCopy ? statCard(topMotivatorCopy.title, isFA ? "محبوب‌ترین انگیزاننده" : "Most Chosen") : ""}
  </div>

  <!-- Number Analysis -->
  ${section(
    isFA ? "تحلیل تعدادی" : "Number Analysis",
    isFA ? "مرتب‌سازی: کل تعداد انتخاب‌شدن  ·  درصد زیر نام = نرخ کاربرد" : "sorted by total times selected  ·  % below name = adoption rate",
    `<table style="width:100%;border-collapse:collapse;table-layout:fixed">${countTable}</table>
     ${legend([{ color: "#f87171", label: isFA ? "تعداد منفی" : "Negative count" }, { color: "#34d399", label: isFA ? "تعداد مثبت" : "Positive count" }])}`
  )}

  <!-- Value Analysis -->
  ${section(
    isFA ? "تحلیل ارزشی" : "Value Analysis",
    isFA ? "مرتب‌سازی: مجموع مثبت + قدر مطلق مجموع منفی  ·  درصد زیر نام = نرخ کاربرد" : "sorted by positive sum + |negative sum|  ·  % below name = adoption rate",
    `<table style="width:100%;border-collapse:collapse;table-layout:fixed">${valueTable}</table>
     ${legend([{ color: "#f87171", label: isFA ? "مجموع منفی" : "Negative sum" }, { color: "#34d399", label: isFA ? "مجموع مثبت" : "Positive sum" }])}`
  )}

  <!-- Category Breakdown -->
  ${section(
    isFA ? "تفکیک دسته‌ها" : "Category Breakdown",
    isFA ? "مرتب‌سازی: سهم از کل انتخاب‌ها" : "sorted by share of all motivator selections",
    `<table style="width:100%;border-collapse:collapse">${catRows}</table>
     <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:9px;color:#94a3b8;font-weight:700">
       ${totalSel} ${isFA ? "کل انتخاب‌ها" : "total selections"} · ${participantCount} ${isFA ? "شرکت‌کننده" : "participants"}
     </div>`
  )}

</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const exportTeamReportExcel = async (
    rows: { motivator: Motivator; positiveCount: number; negativeCount: number; positiveSum: number; negativeSum: number; timesSelected: number }[],
    participants: SavedReport[],
    company: string,
    lang: Language,
    activeFilters?: Record<string, string>,
  ) => {
    const ExcelJS = (await import("exceljs")).default;
    const isFA = lang === "fa";
    const filterSuffix = activeFilters ? Object.values(activeFilters).filter(Boolean).join(", ") : "";
    const reportTitle = `Team Motivator Report${company !== "__all__" ? ` — ${company}` : ""}`;
    const dateStr = new Date().toLocaleDateString(isFA ? "fa-IR" : "en-US");

    const countRowsSorted = [...rows].sort((a, b) => b.timesSelected - a.timesSelected);
    const valueRowsSorted = [...rows].sort((a, b) => (b.positiveSum + Math.abs(b.negativeSum)) - (a.positiveSum + Math.abs(a.negativeSum)));

    const totalSelectionsExcel = rows.reduce((sum, r) => sum + r.timesSelected, 0);
    const categoryBreakdownExcel = [...new Set(rows.map((r) => r.motivator.category))]
      .map((cat) => {
        const catStats = rows.filter((r) => r.motivator.category === cat);
        const selected = catStats.reduce((sum, r) => sum + r.timesSelected, 0);
        const posSum   = catStats.reduce((sum, r) => sum + r.positiveSum, 0);
        const negSum   = catStats.reduce((sum, r) => sum + r.negativeSum, 0);
        const posCount = catStats.reduce((sum, r) => sum + r.positiveCount, 0);
        const negCount = catStats.reduce((sum, r) => sum + r.negativeCount, 0);
        const avgScore = selected > 0 ? (posSum + negSum) / selected : 0;
        const pct      = totalSelectionsExcel > 0 ? (selected / totalSelectionsExcel) * 100 : 0;
        const adoptionPct = participants.length > 0 && catStats.length > 0
          ? (selected / (participants.length * catStats.length)) * 100 : 0;
        return { category: cat, selected, pct, posSum, negSum, posCount, negCount, avgScore, netScore: posSum + negSum, adoptionPct };
      })
      .sort((a, b) => b.selected - a.selected);

    const wb = new ExcelJS.Workbook();
    wb.creator = "HR Motivator Game";
    wb.created = new Date();

    const addSheet = (
      sheetName: string,
      sheetRows: typeof rows,
      mode: "count" | "value",
    ) => {
      const ws = wb.addWorksheet(sheetName);
      const maxNeg = Math.max(...sheetRows.map(r => mode === "count" ? r.negativeCount : Math.abs(r.negativeSum)), 1);
      const maxPos = Math.max(...sheetRows.map(r => mode === "count" ? r.positiveCount : r.positiveSum), 1);

      ws.columns = [
        { key: "rank",      width: 5  },
        { key: "negval",    width: 10 },
        { key: "negbar",    width: 18 },
        { key: "name",      width: 30 },
        { key: "posbar",    width: 18 },
        { key: "posval",    width: 10 },
        { key: "extra",     width: 12 },
        { key: "adoption",  width: 12 },
      ];

      // ── Title row ────────────────────────────────────────────────────
      ws.mergeCells("A1:H1");
      const titleCell = ws.getCell("A1");
      titleCell.value = reportTitle;
      titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 26;

      // ── Date / filter row ─────────────────────────────────────────────
      ws.mergeCells("A2:C2");
      ws.getCell("A2").value = dateStr;
      ws.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
      if (filterSuffix) {
        ws.mergeCells("D2:H2");
        ws.getCell("D2").value = (isFA ? "فیلترها: " : "Filters: ") + filterSuffix;
        ws.getCell("D2").font = { size: 10, italic: true, color: { argb: "FF64748B" } };
      }

      ws.addRow([]); // spacer

      // ── Column headers ────────────────────────────────────────────────
      const negLabel   = mode === "count" ? (isFA ? "← تعداد منفی" : "Neg Count →") : (isFA ? "← مجموع منفی" : "Neg Sum →");
      const posLabel   = mode === "count" ? (isFA ? "← تعداد مثبت" : "← Pos Count") : (isFA ? "← مجموع مثبت" : "← Pos Sum");
      const extraLabel = mode === "count" ? (isFA ? "انتخاب شده" : "Selected") : (isFA ? "خالص" : "Net Score");
      const adoptLabel = isFA ? "% کاربرد" : "% Adoption";
      const hdr = ws.addRow([
        "#",
        negLabel,
        "",
        isFA ? "انگیزاننده" : "Motivator",
        "",
        posLabel,
        extraLabel,
        adoptLabel,
      ]);
      hdr.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      hdr.height = 20;

      // ── Data rows ─────────────────────────────────────────────────────
      sheetRows.forEach((r, i) => {
        const copy  = getMotivatorText(r.motivator, lang);
        const negN  = mode === "count" ? r.negativeCount : Math.abs(r.negativeSum);
        const posN  = mode === "count" ? r.positiveCount : r.positiveSum;
        const negRaw = mode === "count" ? r.negativeCount : r.negativeSum;
        const posRaw = mode === "count" ? r.positiveCount : r.positiveSum;
        const netVal = mode === "count" ? r.positiveCount - r.negativeCount : r.positiveSum + r.negativeSum;
        const extraVal = mode === "count" ? r.timesSelected : netVal;

        const negBarStr = ("░".repeat(15 - Math.round((negN / maxNeg) * 15)) + "█".repeat(Math.round((negN / maxNeg) * 15)));
        const posBarStr = ("█".repeat(Math.round((posN / maxPos) * 15)) + "░".repeat(15 - Math.round((posN / maxPos) * 15)));

        const negLabel  = negRaw < 0 ? `${negRaw}` : negRaw > 0 ? `-${negRaw}` : "—";
        const posLabelV = posRaw > 0 ? `+${posRaw}` : "—";
        const adoptPct  = participants.length > 0 ? `${Math.round((r.timesSelected / participants.length) * 100)}%` : "—";

        const dr = ws.addRow([i + 1, negLabel, negBarStr, copy.title, posBarStr, posLabelV, extraVal, adoptPct]);

        const zebra = i % 2 === 1;
        const zebraFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };

        // Rank
        dr.getCell(1).font = { size: 10, color: { argb: "FF94A3B8" } };
        dr.getCell(1).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(1).fill = zebraFill;

        // Neg count/sum
        dr.getCell(2).font = { bold: true, size: 10, color: { argb: "FFEF4444" } };
        dr.getCell(2).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        dr.getCell(2).alignment = { horizontal: "center" };

        // Neg bar
        dr.getCell(3).font = { name: "Courier New", size: 9, color: { argb: "FFEF4444" } };
        dr.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        dr.getCell(3).alignment = { horizontal: "right" };

        // Motivator name
        dr.getCell(4).font = { bold: true, size: 11 };
        dr.getCell(4).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(4).fill = zebraFill;

        // Pos bar
        dr.getCell(5).font = { name: "Courier New", size: 9, color: { argb: "FF059669" } };
        dr.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        dr.getCell(5).alignment = { horizontal: "left" };

        // Pos count/sum
        dr.getCell(6).font = { bold: true, size: 10, color: { argb: "FF059669" } };
        dr.getCell(6).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        dr.getCell(6).alignment = { horizontal: "center" };

        // Extra (selected / net)
        const isPositive = (mode === "count" ? netVal : extraVal) >= 0;
        dr.getCell(7).font = { bold: true, size: 10, color: { argb: isPositive ? "FF059669" : "FFEF4444" } };
        dr.getCell(7).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(7).fill = zebraFill;

        // Adoption %
        dr.getCell(8).font = { size: 10, color: { argb: "FF475569" } };
        dr.getCell(8).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(8).fill = zebraFill;

        dr.height = 18;
        dr.commit();
      });
    };

    addSheet(isFA ? "تحلیل تعدادی" : "Count Analysis", countRowsSorted, "count");
    addSheet(isFA ? "تحلیل ارزشی"  : "Value Analysis",  valueRowsSorted,  "value");

    // ── Category Breakdown sheet ───────────────────────────────────────────────
    {
      const ws = wb.addWorksheet(isFA ? "تفکیک دسته‌ها" : "Category Breakdown");

      ws.columns = [
        { key: "cat",      width: 22 },
        { key: "n",        width: 8  },
        { key: "bar",      width: 20 },
        { key: "pct",      width: 10 },
        { key: "adopt",    width: 14 },
        { key: "avg",      width: 14 },
        { key: "net",      width: 12 },
        { key: "pos",      width: 10 },
        { key: "neg",      width: 10 },
      ];

      ws.mergeCells("A1:I1");
      const tCell = ws.getCell("A1");
      tCell.value = reportTitle;
      tCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
      tCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 26;

      ws.mergeCells("A2:D2");
      ws.getCell("A2").value = dateStr;
      ws.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
      if (filterSuffix) {
        ws.mergeCells("E2:I2");
        ws.getCell("E2").value = (isFA ? "فیلترها: " : "Filters: ") + filterSuffix;
        ws.getCell("E2").font = { size: 10, italic: true, color: { argb: "FF64748B" } };
      }
      ws.addRow([]);

      const catHdr = ws.addRow([
        isFA ? "دسته" : "Category",
        isFA ? "تعداد" : "Selections",
        "",
        isFA ? "% از کل" : "% of Total",
        isFA ? "% کاربرد" : "% Adoption",
        isFA ? "میانگین امتیاز" : "Avg. Score",
        isFA ? "خالص" : "Net Score",
        isFA ? "مثبت" : "Positive",
        isFA ? "منفی" : "Negative",
      ]);
      catHdr.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      catHdr.height = 20;

      categoryBreakdownExcel.forEach((c, i) => {
        const catName = isFA ? (CATEGORY_FA[c.category] || c.category) : c.category;
        const barWidth = Math.round((c.pct / 100) * 18);
        const barStr = "█".repeat(barWidth) + "░".repeat(18 - barWidth);
        const avgStr = `${c.avgScore >= 0 ? "+" : ""}${c.avgScore.toFixed(1)}`;
        const netStr = `${c.netScore > 0 ? "+" : ""}${c.netScore}`;
        const zebra = i % 2 === 1;
        const zebraFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };

        const dr = ws.addRow([catName, c.selected, barStr, `${c.pct.toFixed(1)}%`, `${c.adoptionPct.toFixed(0)}%`, avgStr, netStr, c.posCount, c.negCount]);

        dr.getCell(1).font = { bold: true, size: 11 };
        if (zebra) dr.getCell(1).fill = zebraFill;

        dr.getCell(2).font = { size: 10, color: { argb: "FF475569" } };
        dr.getCell(2).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(2).fill = zebraFill;

        dr.getCell(3).font = { name: "Courier New", size: 9, color: { argb: "FF6366F1" } };
        dr.getCell(3).alignment = { horizontal: "left" };
        if (zebra) dr.getCell(3).fill = zebraFill;

        dr.getCell(4).font = { bold: true, size: 10, color: { argb: "FF334155" } };
        dr.getCell(4).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(4).fill = zebraFill;

        dr.getCell(5).font = { size: 10, color: { argb: "FF475569" } };
        dr.getCell(5).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(5).fill = zebraFill;

        const avgColor = c.avgScore > 0 ? "FF059669" : c.avgScore < 0 ? "FFEF4444" : "FF94A3B8";
        dr.getCell(6).font = { bold: true, size: 10, color: { argb: avgColor } };
        dr.getCell(6).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(6).fill = zebraFill;

        const netColor = c.netScore > 0 ? "FF059669" : c.netScore < 0 ? "FFEF4444" : "FF94A3B8";
        dr.getCell(7).font = { bold: true, size: 10, color: { argb: netColor } };
        dr.getCell(7).alignment = { horizontal: "center" };
        if (zebra) dr.getCell(7).fill = zebraFill;

        dr.getCell(8).font = { bold: true, size: 10, color: { argb: "FF059669" } };
        dr.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        dr.getCell(8).alignment = { horizontal: "center" };

        dr.getCell(9).font = { bold: true, size: 10, color: { argb: "FFEF4444" } };
        dr.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        dr.getCell(9).alignment = { horizontal: "center" };

        dr.height = 18;
        dr.commit();
      });

      // Footer
      const footerRow = ws.addRow([isFA ? `${totalSelectionsExcel} کل انتخاب‌ها · ${participants.length} شرکت‌کننده` : `${totalSelectionsExcel} total selections · ${participants.length} participants`]);
      ws.mergeCells(`A${footerRow.number}:I${footerRow.number}`);
      footerRow.getCell(1).font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };
    }

    // ── Participants sheet ─────────────────────────────────────────────────────
    {
      // Sort: department → seniority → name
      const sortedParticipants = [...participants].sort((a, b) => {
        const deptCmp = (a.department || "").localeCompare(b.department || "");
        if (deptCmp !== 0) return deptCmp;
        const senCmp = (a.seniority || "").localeCompare(b.seniority || "");
        if (senCmp !== 0) return senCmp;
        return a.participantName.localeCompare(b.participantName);
      });

      const ws = wb.addWorksheet(isFA ? "شرکت‌کنندگان" : "Participants");

      // Title row
      ws.mergeCells("A1:L1");
      const titleCell = ws.getCell("A1");
      titleCell.value = reportTitle;
      titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 26;

      ws.mergeCells("A2:D2");
      ws.getCell("A2").value = dateStr;
      ws.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
      if (filterSuffix) {
        ws.mergeCells("E2:L2");
        ws.getCell("E2").value = (isFA ? "فیلترها: " : "Filters: ") + filterSuffix;
        ws.getCell("E2").font = { size: 10, italic: true, color: { argb: "FF64748B" } };
      }
      ws.addRow([]);

      // How many scored motivators each participant has (level 2 picks)
      const MAX_MOTIVATORS = 6;

      // Column headers
      const baseHeaders = [
        isFA ? "نام" : "Name",
        isFA ? "سمت" : "Position",
        isFA ? "شرکت" : "Company",
        isFA ? "دپارتمان" : "Department",
        isFA ? "جنسیت" : "Sex",
        isFA ? "سطح ارشدیت" : "Seniority",
        isFA ? "سال تولد" : "Year of Birth",
        isFA ? "تاریخ" : "Date",
      ];
      const motivatorHeaders: string[] = [];
      for (let i = 1; i <= MAX_MOTIVATORS; i++) {
        motivatorHeaders.push(`${isFA ? "انگیزاننده" : "Motivator"} ${i}`);
        motivatorHeaders.push(`${isFA ? "امتیاز" : "Score"} ${i}`);
      }
      const hdr = ws.addRow([...baseHeaders, ...motivatorHeaders]);
      hdr.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
      hdr.height = 22;

      // Column widths
      const colWidths = [22, 18, 18, 16, 10, 14, 12, 12,
        ...Array(MAX_MOTIVATORS * 2).fill(0).map((_, i) => i % 2 === 0 ? 22 : 8)];
      ws.columns = colWidths.map((width) => ({ width }));

      const getSexLabelLocal = (val: string | null | undefined) => {
        if (!val) return "";
        const o = SEX_OPTIONS.find((x) => x.value === val);
        return o ? (isFA ? o.labelFa : o.labelEn) : val;
      };
      const getSeniorityLabelLocal = (val: string | null | undefined) => {
        if (!val) return "";
        const o = SENIORITY_OPTIONS.find((x) => x.value === val);
        return o ? (isFA ? o.labelFa : o.labelEn) : val;
      };

      sortedParticipants.forEach((p, i) => {
        // Scored motivators sorted by absolute score descending, then by score sign (pos first)
        const scoredMotivators = Object.entries(p.scores)
          .filter(([, score]) => score !== 0)
          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a) || b - a)
          .slice(0, MAX_MOTIVATORS);

        const motivatorCells: (string | number)[] = [];
        for (let mi = 0; mi < MAX_MOTIVATORS; mi++) {
          if (mi < scoredMotivators.length) {
            const [motId, score] = scoredMotivators[mi];
            const mot = MOTIVATORS.find((m) => m.id === motId);
            const copy = mot ? getMotivatorText(mot, lang) : { title: motId, category: "" };
            motivatorCells.push(copy.title, score);
          } else {
            motivatorCells.push("", "");
          }
        }

        const dateVal = p.createdAt ? new Date(p.createdAt).toLocaleDateString(isFA ? "fa-IR" : "en-US") : "";
        const dr = ws.addRow([
          p.participantName,
          p.participantPosition,
          p.companyName,
          p.department || "",
          getSexLabelLocal(p.sex),
          getSeniorityLabelLocal(p.seniority),
          p.yearOfBirth || "",
          dateVal,
          ...motivatorCells,
        ]);

        const zebra = i % 2 === 1;
        const zebraFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };

        // Name: bold
        dr.getCell(1).font = { bold: true, size: 11 };
        // Dept: slate
        dr.getCell(4).font = { color: { argb: "FF64748B" } };
        // Sex: slate
        dr.getCell(5).font = { color: { argb: "FF64748B" } };
        // Seniority: slate
        dr.getCell(6).font = { color: { argb: "FF64748B" } };
        // Year of birth: slate
        dr.getCell(7).font = { color: { argb: "FF64748B" } };
        dr.getCell(7).alignment = { horizontal: "center" };
        // Date
        dr.getCell(8).font = { size: 10, color: { argb: "FF94A3B8" } };
        dr.getCell(8).alignment = { horizontal: "center" };

        // Score cells: colored by sign
        for (let mi = 0; mi < MAX_MOTIVATORS; mi++) {
          const scoreCell = dr.getCell(8 + 2 + mi * 2); // 9 = first motivator name, 10 = first score
          const score = scoredMotivators[mi]?.[1];
          if (score !== undefined) {
            scoreCell.font = { bold: true, color: { argb: score > 0 ? "FF059669" : score < 0 ? "FFEF4444" : "FF94A3B8" } };
            scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: score > 0 ? "FFF0FDF4" : score < 0 ? "FFFEF2F2" : "FFFAFAFA" } };
            scoreCell.alignment = { horizontal: "center" };
            // Format the value with sign
            scoreCell.value = score > 0 ? `+${score}` : `${score}`;
          }
        }

        if (zebra) {
          [1, 2, 3, 4, 5, 6, 7, 8].forEach((col) => {
            const cell = dr.getCell(col);
            if (!(cell.fill as ExcelJS.FillPattern)?.fgColor) cell.fill = zebraFill;
          });
        }

        dr.height = 18;
        dr.commit();
      });

      // Freeze header rows
      ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4, topLeftCell: "A5", activeCell: "A5" }];
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `Team Motivator Report${company !== "__all__" ? ` - ${company}` : ""}${filterSuffix ? ` (${filterSuffix})` : ""}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasDepartments = resolvedCompany ? resolvedCompany.departments.length > 0 : false;
  const isReadyToStart = Boolean(
    state.participantName.trim() &&
    state.participantPosition.trim() &&
    (resolvedCompany || state.companyName.trim()) &&
    state.yearOfBirth !== null &&
    state.sex &&
    state.seniority &&
    (!hasDepartments || state.department)
  );

  // Login screen
  if (!auth.role) {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-950 p-8 text-white sm:p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-white/10">
              <BarChart3 size={26} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{t.loginTitle}</h1>
            <p className="mt-2 text-slate-300 font-medium">{t.loginSubtitle}</p>
          </div>
          <div className="space-y-4 p-6 sm:p-8">
            {/* Participant */}
            <button
              type="button"
              onClick={loginAsParticipant}
              className="w-full rounded-lg border-2 border-slate-200 p-5 text-start transition hover:border-blue-400 hover:bg-blue-50"
            >
              <p className="text-lg font-black text-slate-900">{t.roleParticipant}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{t.roleParticipantDesc}</p>
            </button>
            {/* Facilitator */}
            <div className="rounded-lg border-2 border-slate-200 p-5 transition hover:border-emerald-400">
              <p className="text-lg font-black text-slate-900">{t.roleFacilitator}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{t.roleFacilitatorDesc}</p>
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  placeholder={t.facilitatorCodePlaceholder}
                  value={facCodeInput}
                  onChange={(e) => { setFacCodeInput(e.target.value.toUpperCase()); setFacLoginError(false); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm uppercase outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    value={facPasswordInput}
                    onChange={(e) => { setFacPasswordInput(e.target.value); setFacLoginError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && loginAsFacilitator()}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                  <button type="button" onClick={loginAsFacilitator} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">→</button>
                </div>
              </div>
              {facLoginError && <p className="mt-2 text-xs font-bold text-red-500">{t.facilitatorLoginError}</p>}
            </div>
            {/* Admin */}
            <div className="rounded-lg border-2 border-slate-200 p-5 transition hover:border-amber-400">
              <p className="text-lg font-black text-slate-900">{t.roleAdmin}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{t.roleAdminDesc}</p>
              <div className="mt-4 flex gap-2">
                <input
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && loginAsAdmin()}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <button type="button" onClick={loginAsAdmin} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">→</button>
              </div>
              {passwordError && <p className="mt-2 text-xs font-bold text-red-500">{t.wrongPassword}</p>}
            </div>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // Admin settings screen
  if (state.stage === "admin_settings") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-black tracking-tight text-slate-950">{t.settings}</h1>
              <button type="button" onClick={backToStart} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                <ChevronLeft size={16} />{t.backToStart}
              </button>
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-lg font-black text-slate-900">{t.changePassword}</h2>
            <div className="space-y-3">
              <input
                type="password"
                placeholder={t.currentPassword}
                value={pwCurrent}
                onChange={(e) => { setPwCurrent(e.target.value); setPwError(false); setPwSaved(false); }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <input
                type="password"
                placeholder={t.newPassword}
                value={pwNew}
                onChange={(e) => { setPwNew(e.target.value); setPwError(false); setPwSaved(false); }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              {pwError && <p className="text-xs font-bold text-red-500">{t.passwordMismatch}</p>}
              {pwSaved && <p className="text-xs font-bold text-emerald-600">{t.passwordSaved}</p>}
              <button
                type="button"
                onClick={saveNewPassword}
                disabled={!pwCurrent || !pwNew}
                className="inline-flex w-full items-center justify-center rounded-lg bg-slate-950 py-3 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {t.savePassword}
              </button>
            </div>
          </section>
        </div>
      </Shell>
    );
  }

  // Admin panel
  if (state.stage === "admin_panel") {
    if (auth.role !== "admin") { setState((prev) => ({ ...prev, stage: "welcome" })); return null; }
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{t.adminPanel}</h1>
              <button type="button" onClick={backToStart} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                <ChevronLeft size={16} />{t.backToStart}
              </button>
            </div>
          </section>

          {/* Add company form */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">{t.addCompany}</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder={t.companyPlaceholder}
                value={newCompanyName}
                onChange={(e) => { setNewCompanyName(e.target.value); setCompanyFormError(""); }}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <input
                type="password"
                placeholder={t.companyFacilitatorPw}
                value={newCompanyPassword}
                onChange={(e) => { setNewCompanyPassword(e.target.value); setCompanyFormError(""); }}
                onKeyDown={(e) => e.key === "Enter" && createCompany()}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={createCompany}
                disabled={!newCompanyName.trim() || !newCompanyPassword}
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {t.addCompany}
              </button>
            </div>
            {companyFormError && <p className="mt-2 text-xs font-bold text-red-500">{companyFormError}</p>}
          </section>

          {/* Company list */}
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            {companies.length === 0 ? (
              <p className="p-8 text-center font-bold text-slate-400">{t.noCompanies}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {companies.map((company) => (
                  <div key={company.id} className="flex flex-col">
                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-slate-950">{company.name}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold tracking-widest text-slate-400">{company.accessCode}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">
                          {company.reportCount} {t.reportsCount} · {new Date(company.createdAt).toLocaleDateString(isRtl ? "fa-IR" : "en-US")}
                          {company.testLimit !== null && company.testLimit !== undefined && ` · limit: ${company.testLimit}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyShareLink(company.accessCode)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          {copiedCode === company.accessCode ? t.copied : t.copyLink}
                        </button>
                        <button
                          type="button"
                          onClick={() => resetCompanyCodeById(company.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          {t.resetCode}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingCompanyId === company.id) {
                              setEditingCompanyId(null);
                            } else {
                              setEditingCompanyId(company.id);
                              setCompanySettingsForm({
                                testLimit: company.testLimit !== null && company.testLimit !== undefined ? String(company.testLimit) : "",
                                departments: (company.departments || []).map((d) => ({
                                  name: d.name,
                                  limit: d.limit !== null && d.limit !== undefined ? String(d.limit) : "",
                                })),
                              });
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black transition ${editingCompanyId === company.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          {t.companySettings}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCompanyById(company.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-red-500 transition hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={14} />{t.deleteCompany}
                        </button>
                      </div>
                    </div>
                    {/* Inline settings panel */}
                    {editingCompanyId === company.id && (
                      <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-5">
                        {/* Test limit */}
                        <div>
                          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.testLimit}</label>
                          <input
                            type="number"
                            min={1}
                            placeholder={t.testLimitPlaceholder}
                            value={companySettingsForm.testLimit}
                            onChange={(e) => setCompanySettingsForm((f) => ({ ...f, testLimit: e.target.value }))}
                            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                          />
                        </div>
                        {/* Departments */}
                        <div>
                          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.departments}</label>
                          <div className="space-y-2">
                            {companySettingsForm.departments.map((dept, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder={t.departmentName}
                                  value={dept.name}
                                  onChange={(e) => setCompanySettingsForm((f) => {
                                    const depts = [...f.departments];
                                    depts[idx] = { ...depts[idx], name: e.target.value };
                                    return { ...f, departments: depts };
                                  })}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  placeholder={t.departmentLimit}
                                  value={dept.limit}
                                  onChange={(e) => setCompanySettingsForm((f) => {
                                    const depts = [...f.departments];
                                    depts[idx] = { ...depts[idx], limit: e.target.value };
                                    return { ...f, departments: depts };
                                  })}
                                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCompanySettingsForm((f) => ({ ...f, departments: f.departments.filter((_, i) => i !== idx) }))}
                                  className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCompanySettingsForm((f) => ({ ...f, departments: [...f.departments, { name: "", limit: "" }] }))}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                            >
                              + {t.addDepartment}
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => saveCompanySettings(company.id)}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                          {t.saveSettings}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </Shell>
    );
  }

  if (state.stage === "welcome") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-950 p-8 text-white sm:p-10">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-lg bg-white/10">
              <Play className={isRtl ? "" : "ml-1"} size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight">{t.appTitle}</h1>
            <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-slate-300">{t.appSubtitle}</p>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            {/* Facilitator scope badge */}
            {auth.role === "facilitator" && auth.companyName && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {t.viewingReportsFor} <strong>{auth.companyName}</strong>
              </div>
            )}

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

            {/* Company: locked badge when resolved via code, free input otherwise */}
            {resolvedCompany ? (
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t.linkedTo}</p>
                <p className="mt-1 font-black text-slate-900">{resolvedCompany.name}</p>
                <p className="mt-0.5 font-mono text-xs font-bold text-emerald-500">{resolvedCompany.code}</p>
              </div>
            ) : (
              <>
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
                {/* Optional company code */}
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t.companyCodeLabel}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t.companyCodePlaceholder}
                      value={codeInput}
                      maxLength={8}
                      onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(false); }}
                      onKeyDown={(e) => e.key === "Enter" && resolveCode(codeInput)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm uppercase outline-none transition focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => resolveCode(codeInput)}
                      disabled={!codeInput.trim() || codeLoading}
                      className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {codeLoading ? "…" : t.applyCode}
                    </button>
                  </div>
                  {codeError && <p className="mt-2 text-xs font-bold text-red-500">{t.invalidCode}</p>}
                </div>
              </>
            )}

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

            {/* Year of birth */}
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.yearOfBirth}</span>
              <select
                value={state.yearOfBirth ?? ""}
                onChange={(e) => setState((prev) => ({ ...prev, yearOfBirth: e.target.value ? parseInt(e.target.value, 10) : null }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              >
                <option value="">{t.selectYear}</option>
                {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>

            {/* Sex */}
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.sex}</span>
              <select
                value={state.sex}
                onChange={(e) => setState((prev) => ({ ...prev, sex: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              >
                <option value="">{t.selectSex}</option>
                {SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{state.language === "fa" ? o.labelFa : o.labelEn}</option>
                ))}
              </select>
            </label>

            {/* Seniority */}
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.seniority}</span>
              <select
                value={state.seniority}
                onChange={(e) => setState((prev) => ({ ...prev, seniority: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              >
                <option value="">{t.selectSeniority}</option>
                {SENIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{state.language === "fa" ? o.labelFa : o.labelEn}</option>
                ))}
              </select>
            </label>

            {/* Department — only when resolved company has departments */}
            {hasDepartments && (
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">{t.department}</span>
                <select
                  value={state.department}
                  onChange={(e) => { setLimitCheckError(null); setState((prev) => ({ ...prev, department: e.target.value })); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">{t.selectDepartment}</option>
                  {resolvedCompany!.departments.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </label>
            )}

            {limitCheckError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {limitCheckError}
              </div>
            )}

            <button
              type="button"
              onClick={startGame}
              disabled={!isReadyToStart}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg py-4 text-base font-black shadow-lg transition ${
                isReadyToStart ? "bg-slate-950 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-100 text-slate-300 shadow-none"
              }`}
            >
              {t.startLevel1}
              <NextIcon size={20} />
            </button>

            {(auth.role === "facilitator" || auth.role === "admin") && (
              <>
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
                <button
                  type="button"
                  onClick={openTeamReport}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <BarChart3 size={18} />
                  {t.viewTeamReport}
                </button>
              </>
            )}
            {auth.role === "admin" && (
              <button
                type="button"
                onClick={openAdminPanel}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
              >
                <Building2 size={18} />
                {t.adminPanel}
              </button>
            )}
          </div>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "saved_reports") {
    if (auth.role !== "facilitator" && auth.role !== "admin") { setState((prev) => ({ ...prev, stage: "welcome" })); return null; }
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
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
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold text-slate-400">
                          {report.yearOfBirth && <span>{report.yearOfBirth}</span>}
                          {report.sex && <span>{SEX_OPTIONS.find((o) => o.value === report.sex)?.[state.language === "fa" ? "labelFa" : "labelEn"] ?? report.sex}</span>}
                          {report.seniority && <span>{SENIORITY_OPTIONS.find((o) => o.value === report.seniority)?.[state.language === "fa" ? "labelFa" : "labelEn"] ?? report.seniority}</span>}
                          {report.department && <span>{report.department}</span>}
                        </div>
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

                    {editingReportId === report.id && (
                      <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t.editParticipant}</p>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400"
                          value={editForm.participantName}
                          onChange={(e) => setEditForm((f) => ({ ...f, participantName: e.target.value }))}
                          placeholder={t.participantName}
                        />
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400"
                          value={editForm.participantPosition}
                          onChange={(e) => setEditForm((f) => ({ ...f, participantPosition: e.target.value }))}
                          placeholder={t.position}
                        />
                        {auth.role === "admin" && (
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t.assignCompany}</p>
                            <select
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                              value={editForm.companyId}
                              onChange={(e) => {
                                const c = companies.find((c) => c.id === e.target.value);
                                setEditForm((f) => ({ ...f, companyId: e.target.value, companyName: c?.name ?? "" }));
                              }}
                            >
                              <option value="">{t.noCompany}</option>
                              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={saveReportEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">
                            {t.saveChanges}
                          </button>
                          <button type="button" onClick={() => setEditingReportId(null)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-500 transition hover:bg-slate-50">
                            {t.cancelEdit}
                          </button>
                        </div>
                      </div>
                    )}

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
                        onClick={() => startEditReport(report)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                      >
                        <Pencil size={16} />
                        {t.editReport}
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

  if (state.stage === "team_report") {
    if (auth.role !== "facilitator" && auth.role !== "admin") { setState((prev) => ({ ...prev, stage: "welcome" })); return null; }
    const companies = Array.from(new Set(savedReports.map((r) => r.companyName).filter(Boolean))).sort();

    const filteredByCompany = selectedCompany === "__all__"
      ? savedReports
      : savedReports.filter((r) => r.companyName === selectedCompany);

    // Unique values for additional filters
    const uniqueDepartments = Array.from(new Set(filteredByCompany.map((r) => r.department).filter(Boolean))).sort() as string[];
    const uniqueSex = Array.from(new Set(filteredByCompany.map((r) => r.sex).filter(Boolean))).sort() as string[];
    const uniqueSeniority = Array.from(new Set(filteredByCompany.map((r) => r.seniority).filter(Boolean))).sort() as string[];
    const uniqueDecades = Array.from(new Set(
      filteredByCompany
        .map((r) => r.yearOfBirth ? Math.floor(r.yearOfBirth / 10) * 10 : null)
        .filter((d): d is number => d !== null)
    )).sort() as number[];

    const getSexLabel = (val: string) => {
      const o = SEX_OPTIONS.find((x) => x.value === val);
      return o ? (state.language === "fa" ? o.labelFa : o.labelEn) : val;
    };
    const getSeniorityLabel = (val: string) => {
      const o = SENIORITY_OPTIONS.find((x) => x.value === val);
      return o ? (state.language === "fa" ? o.labelFa : o.labelEn) : val;
    };

    const filtered = filteredByCompany.filter((r) => {
      if (teamFilterSex !== "__all__" && r.sex !== teamFilterSex) return false;
      if (teamFilterSeniority !== "__all__" && r.seniority !== teamFilterSeniority) return false;
      if (teamFilterDepartment !== "__all__" && r.department !== teamFilterDepartment) return false;
      if (teamFilterDecade !== "__all__") {
        const decade = r.yearOfBirth ? Math.floor(r.yearOfBirth / 10) * 10 : null;
        if (decade === null || String(decade) !== teamFilterDecade) return false;
      }
      return true;
    });

    // Compute per-motivator stats
    const stats = MOTIVATORS.map((motivator) => {
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      let positiveSum = 0;
      let negativeSum = 0;
      for (const report of filtered) {
        const score = report.scores[motivator.id];
        if (score === undefined) continue;
        if (score > 0) { positiveCount++; positiveSum += score; }
        else if (score < 0) { negativeCount++; negativeSum += score; }
        else neutralCount++;
      }
      const timesSelected = positiveCount + negativeCount + neutralCount;
      return { motivator, timesSelected, positiveCount, negativeCount, neutralCount, positiveSum, negativeSum };
    });

    // Page 1: sorted by net count (positive - negative)
    const countRows = [...stats].sort((a, b) => b.timesSelected - a.timesSelected);
    const maxCount = Math.max(...countRows.map((r) => r.timesSelected), 1);

    // Page 2: sorted by total absolute value activity
    const valueRows = [...stats].sort((a, b) => (b.positiveSum + Math.abs(b.negativeSum)) - (a.positiveSum + Math.abs(a.negativeSum)));
    const maxValue = Math.max(...valueRows.map((r) => r.positiveSum + Math.abs(r.negativeSum)), 1);

    // Page 3: category breakdown
    const totalSelections = stats.reduce((sum, s) => sum + s.timesSelected, 0);
    const categoryBreakdown = [...new Set(MOTIVATORS.map((m) => m.category))]
      .map((cat) => {
        const catStats = stats.filter((s) => s.motivator.category === cat);
        const selected  = catStats.reduce((sum, s) => sum + s.timesSelected, 0);
        const posSum    = catStats.reduce((sum, s) => sum + s.positiveSum, 0);
        const negSum    = catStats.reduce((sum, s) => sum + s.negativeSum, 0);
        const posCount  = catStats.reduce((sum, s) => sum + s.positiveCount, 0);
        const negCount  = catStats.reduce((sum, s) => sum + s.negativeCount, 0);
        const avgScore  = selected > 0 ? (posSum + negSum) / selected : 0;
        return { category: cat, selected, pct: totalSelections > 0 ? (selected / totalSelections) * 100 : 0, posSum, negSum, posCount, negCount, avgScore, netScore: posSum + negSum };
      })
      .sort((a, b) => b.selected - a.selected);

    const tabs = [
      { key: "count",    label: t.numberAnalysis },
      { key: "value",    label: t.valueAnalysis },
      { key: "category", label: t.categoryAnalysis },
    ] as const;
    type Tab = typeof tabs[number]["key"];

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut} forceDir="ltr">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t.teamReport}</h1>
                <p className="mt-2 max-w-2xl font-medium leading-relaxed text-slate-500">{t.teamReportBody}</p>
              </div>
              <button type="button" onClick={backToStart} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                <ChevronLeft size={16} />
                {t.backToStart}
              </button>
              <button type="button" onClick={() => exportTeamReportPDF(stats, filtered.length, selectedCompany, state.language, maxCount, maxValue, {
                dept: teamFilterDepartment !== "__all__" ? teamFilterDepartment : "",
                sex: teamFilterSex !== "__all__" ? teamFilterSex : "",
                seniority: teamFilterSeniority !== "__all__" ? teamFilterSeniority : "",
                decade: teamFilterDecade !== "__all__" ? `${teamFilterDecade}s` : "",
              })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 print:hidden">
                <Printer size={16} />
                PDF
              </button>
              <button type="button" onClick={() => exportTeamReportExcel(stats, filtered, selectedCompany, state.language, {
                dept: teamFilterDepartment !== "__all__" ? teamFilterDepartment : "",
                sex: teamFilterSex !== "__all__" ? teamFilterSex : "",
                seniority: teamFilterSeniority !== "__all__" ? teamFilterSeniority : "",
                decade: teamFilterDecade !== "__all__" ? `${teamFilterDecade}s` : "",
              })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 print:hidden">
                <FileDown size={16} />
                Excel
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.filterByCompany}</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => { setSelectedCompany(e.target.value); setTeamFilterDepartment("__all__"); }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="__all__">{t.allCompanies} ({savedReports.length} {t.participants})</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>{c} ({savedReports.filter((r) => r.companyName === c).length} {t.participants})</option>
                  ))}
                </select>
              </div>
              {uniqueDepartments.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.filterByDepartment}</label>
                  <select
                    value={teamFilterDepartment}
                    onChange={(e) => setTeamFilterDepartment(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="__all__">{t.allDepartments}</option>
                    {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {uniqueSex.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.filterBySex}</label>
                  <select
                    value={teamFilterSex}
                    onChange={(e) => setTeamFilterSex(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="__all__">{t.allSex}</option>
                    {uniqueSex.map((s) => <option key={s} value={s}>{getSexLabel(s)}</option>)}
                  </select>
                </div>
              )}
              {uniqueSeniority.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.filterBySeniority}</label>
                  <select
                    value={teamFilterSeniority}
                    onChange={(e) => setTeamFilterSeniority(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="__all__">{t.allSeniority}</option>
                    {uniqueSeniority.map((s) => <option key={s} value={s}>{getSeniorityLabel(s)}</option>)}
                  </select>
                </div>
              )}
              {uniqueDecades.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.filterByBirthDecade}</label>
                  <select
                    value={teamFilterDecade}
                    onChange={(e) => setTeamFilterDecade(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="__all__">{t.allDecades}</option>
                    {uniqueDecades.map((d) => <option key={d} value={String(d)}>{d}s</option>)}
                  </select>
                </div>
              )}
            </div>
          </section>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-black text-slate-700">{t.noReportsForCompany}</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTeamReportTab(tab.key)}
                    className={`flex-1 rounded-md py-2.5 text-sm font-black transition ${teamReportTab === tab.key ? "bg-slate-950 text-white shadow" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Page 1: Number Analysis */}
              {teamReportTab === "count" && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="mb-4 text-xs font-bold text-slate-400">{t.sortedByNetCount}</p>
                  {countRows.map(({ motivator, positiveCount, negativeCount, timesSelected }) => {
                    const copy = getMotivatorText(motivator, state.language);
                    const posW = (positiveCount / maxCount) * 100;
                    const negW = (negativeCount / maxCount) * 100;
                    const adoptionPct = filtered.length > 0 ? Math.round((timesSelected / filtered.length) * 100) : 0;
                    return (
                      <div key={motivator.id} className="grid grid-cols-[1fr_180px_1fr] items-center gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-6 text-end text-xs font-black text-red-500">−{negativeCount}</span>
                          <div className="h-4 w-full overflow-hidden rounded-l-full bg-slate-100">
                            <div className="ml-auto h-full rounded-l-full bg-red-400 transition-all" style={{ width: `${negW}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 px-1">
                          <span className="w-full truncate text-center text-sm font-bold text-slate-800" title={copy.title}>{copy.title}</span>
                          <span className="text-[10px] font-bold text-slate-400">{adoptionPct}% {t.adoptionRate.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-full overflow-hidden rounded-r-full bg-slate-100">
                            <div className="h-full rounded-r-full bg-emerald-500 transition-all" style={{ width: `${posW}%` }} />
                          </div>
                          <span className="w-6 text-xs font-black text-emerald-600">+{positiveCount}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-400" />{state.language === "fa" ? "تعداد منفی" : "Negative count"}</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" />{state.language === "fa" ? "تعداد مثبت" : "Positive count"}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{totalSelections} {t.totalSelectionsLabel} / {filtered.length} {t.participants}</span>
                  </div>
                </div>
              )}

              {/* Page 2: Value Analysis */}
              {teamReportTab === "value" && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="mb-4 text-xs font-bold text-slate-400">{t.sortedByValue}</p>
                  {valueRows.map(({ motivator, positiveSum, negativeSum, timesSelected }) => {
                    const copy = getMotivatorText(motivator, state.language);
                    const absNeg = Math.abs(negativeSum);
                    const posW = (positiveSum / maxValue) * 100;
                    const negW = (absNeg / maxValue) * 100;
                    const adoptionPct = filtered.length > 0 ? Math.round((timesSelected / filtered.length) * 100) : 0;
                    return (
                      <div key={motivator.id} className="grid grid-cols-[1fr_180px_1fr] items-center gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-8 text-end text-xs font-black text-red-500">{negativeSum < 0 ? negativeSum : "—"}</span>
                          <div className="h-4 w-full overflow-hidden rounded-l-full bg-slate-100">
                            <div className="ml-auto h-full rounded-l-full bg-red-400 transition-all" style={{ width: `${negW}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 px-1">
                          <span className="w-full truncate text-center text-sm font-bold text-slate-800" title={copy.title}>{copy.title}</span>
                          <span className="text-[10px] font-bold text-slate-400">{adoptionPct}% {t.adoptionRate.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-full overflow-hidden rounded-r-full bg-slate-100">
                            <div className="h-full rounded-r-full bg-emerald-500 transition-all" style={{ width: `${posW}%` }} />
                          </div>
                          <span className="w-8 text-xs font-black text-emerald-600">{positiveSum > 0 ? `+${positiveSum}` : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-400" />{state.language === "fa" ? "مجموع منفی" : "Negative sum"}</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" />{state.language === "fa" ? "مجموع مثبت" : "Positive sum"}</span>
                  </div>
                </div>
              )}

              {/* Page 3: Category Breakdown */}
              {teamReportTab === "category" && (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">{t.sortedByAdoption}</p>
                  {categoryBreakdown.map(({ category, selected, pct, posCount, negCount, avgScore, netScore }) => {
                    const colors = CATEGORY_COLORS[category] || { bg: "bg-slate-600", text: "text-slate-600", light: "bg-slate-50" };
                    const catName = state.language === "fa" ? (CATEGORY_FA[category] || category) : category;
                    const catMotivatorCount = MOTIVATORS.filter((m) => m.category === category).length;
                    const adoptionPct = filtered.length > 0 && catMotivatorCount > 0
                      ? Math.round((selected / (filtered.length * catMotivatorCount)) * 100)
                      : 0;
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2.5 w-2.5 flex-none rounded-full ${colors.bg}`} />
                            <span className="truncate text-sm font-bold text-slate-800">{catName}</span>
                            <span className="text-xs font-medium text-slate-400">({catMotivatorCount} {state.language === "fa" ? "انگیزاننده" : "motivators"})</span>
                          </div>
                          <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold">
                            <span className="text-slate-400">{selected} {t.timesSelected.toLowerCase()}</span>
                            <span className="text-slate-500">{adoptionPct}% {t.adoptionRate.toLowerCase()}</span>
                            <span className={avgScore > 0 ? "text-emerald-600" : avgScore < 0 ? "text-red-500" : "text-slate-400"}>
                              {t.avgScore}: {avgScore >= 0 ? "+" : ""}{avgScore.toFixed(1)}
                            </span>
                            <span className={`font-black ${netScore > 0 ? "text-emerald-600" : netScore < 0 ? "text-red-500" : "text-slate-400"}`}>
                              {t.netScore}: {netScore > 0 ? "+" : ""}{netScore}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full transition-all opacity-80 ${colors.bg}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs font-black text-slate-600">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />{state.language === "fa" ? "مثبت" : "Positive"}: {posCount}</span>
                          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" />{state.language === "fa" ? "منفی" : "Negative"}: {negCount}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
                    {totalSelections} {t.totalSelectionsLabel} · {filtered.length} {t.participants}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Shell>
    );
  }

  if (state.stage === "instructions") {
    const instructions = [t.instruction1, t.instruction2, t.instruction3];

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
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
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => setState((prev) => ({ ...prev, stage: "welcome" }))} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-4 font-black text-slate-600 transition hover:bg-slate-50">
              <ChevronLeft size={18} />
              {t.back}
            </button>
            <button type="button" onClick={nextStage} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white shadow-lg transition hover:bg-slate-800">
              {t.gotIt}
              <NextIcon size={20} />
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "playing") {
    const isFull = state.activeCards.length === 7;
    const totalChoices = MOTIVATORS.length - 6;
    const progress = Math.round((state.discardedCards.length / totalChoices) * 100);

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
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
              <div className="flex gap-2">
                <button type="button" onClick={resetGame} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                  <RefreshCcw size={16} />
                  {t.restart}
                </button>
                <button type="button" onClick={undoPlay} disabled={playHistory.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft size={16} />
                  {t.back}
                </button>
              </div>
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
      <Shell language={state.language} onToggleLanguage={toggleLanguage} compact onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={42} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">{t.level1Complete}</h2>
          <p className="mx-auto mt-4 max-w-md text-base font-medium leading-relaxed text-slate-500">{t.level1CompleteBody}</p>
          <div className="mt-9 flex gap-3">
            <button type="button" onClick={() => setState((prev) => ({ ...prev, stage: "playing" }))} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-4 font-black text-slate-600 transition hover:bg-slate-50">
              <ChevronLeft size={18} />
              {t.back}
            </button>
            <button type="button" onClick={nextStage} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white shadow-lg transition hover:bg-slate-800">
              {t.forwardLevel2}
              <NextIcon size={20} />
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  if (state.stage === "level2_scoring") {
    const scoredCount = Object.keys(state.scores).length;
    const isComplete = scoredCount === 6;
    const scoringProgress = Math.round((scoredCount / 6) * 100);

    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
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

          <div className="flex gap-3">
            <button type="button" onClick={() => setState((prev) => ({ ...prev, stage: "level2_intro" }))} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-5 font-black text-slate-600 transition hover:bg-slate-50">
              <ChevronLeft size={18} />
              {t.back}
            </button>
            <button
              type="button"
              onClick={finishGame}
              disabled={!isComplete}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-5 text-lg font-black shadow-lg transition ${
                isComplete ? "bg-slate-950 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
              }`}
            >
              {t.showReport}
              <NextIcon size={20} />
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.stage === "results") {
    return (
      <Shell language={state.language} onToggleLanguage={toggleLanguage} onSignOut={signOut} onSettings={() => setState((prev) => ({ ...prev, stage: "admin_settings" }))} role={auth.role} settingsLabel={t.settings} signOutLabel={t.signOut}>
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
                  {state.yearOfBirth && (
                    <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                      <span>{t.yearOfBirth}</span>
                      <strong className="text-slate-950">{state.yearOfBirth}</strong>
                    </div>
                  )}
                  {state.sex && (
                    <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                      <span>{t.sex}</span>
                      <strong className="text-slate-950">{SEX_OPTIONS.find((o) => o.value === state.sex)?.[state.language === "fa" ? "labelFa" : "labelEn"] ?? state.sex}</strong>
                    </div>
                  )}
                  {state.seniority && (
                    <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                      <span>{t.seniority}</span>
                      <strong className="text-slate-950">{SENIORITY_OPTIONS.find((o) => o.value === state.seniority)?.[state.language === "fa" ? "labelFa" : "labelEn"] ?? state.seniority}</strong>
                    </div>
                  )}
                  {state.department && (
                    <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-3">
                      <span>{t.department}</span>
                      <strong className="text-slate-950">{state.department}</strong>
                    </div>
                  )}
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
                    const width = `${(Math.abs(item.score) / 3) * 100}%`;
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

          {limitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 print:hidden">
              {limitError}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row print:hidden">
            {resultSource === "saved_reports" && (
              <button type="button" onClick={() => setState((prev) => ({ ...prev, stage: "saved_reports" }))} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-4 font-black text-slate-600 transition hover:bg-slate-50">
                <ChevronLeft size={20} />
                {t.backToReports}
              </button>
            )}
            <button type="button" onClick={exportPDF} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 py-4 font-black text-white transition hover:bg-slate-800">
              <Printer size={20} />
              {t.exportPDF}
            </button>
            {resultSource === "game" && (
              <button type="button" onClick={resetGame} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-4 font-black text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                <RefreshCcw size={20} />
                {t.newSession}
              </button>
            )}
          </div>
        </main>
      </Shell>
    );
  }

  return null;
}
