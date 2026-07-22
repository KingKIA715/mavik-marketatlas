import { useCallback, useEffect, useState } from "react";

/**
 * Real infrastructure (language persistence, a translation hook, a
 * switcher, RTL support) covering English, Tamil, Hindi, Chinese, Japanese,
 * and Arabic — the markets this app targets.
 *
 * Deliberately scoped to app chrome — navigation, section headers, the
 * portfolio card, search — not calculator form fields or news content
 * (news is sourced from external RSS feeds already in their original
 * language and can't be meaningfully translated here). Translating the
 * full calculator suite into more languages is a much bigger, separate
 * effort — this covers what a visitor sees before they pick a specific
 * tool, which is where a language switch matters most.
 *
 * RTL caveat: switching to Arabic sets `dir="rtl"` on <html>, which
 * correctly flips text direction and native form controls. It does NOT
 * mirror the app's layout — this codebase positions things with physical
 * Tailwind utilities (`left-3`, `right-0`, etc.) throughout rather than
 * logical ones (`start-3`/`end-0`), so absolutely-positioned elements like
 * the search dropdown or icon insets stay on the visual left/right they
 * were authored for rather than flipping sides. A true mirrored RTL layout
 * means auditing every `left-`/`right-`/`ml-`/`mr-` in the app — worth
 * doing before shipping Arabic as a first-class experience, but a
 * separate, much larger pass than this one.
 */

export type LanguageCode = "en" | "ta" | "hi" | "zh" | "ja" | "ar";

export const LANGUAGES: { code: LanguageCode; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.tools": "Tools",
  "nav.news": "News",
  "footer.tagline": "Global financial hub for common people 🫂",
  "search.placeholder": "Search gold, BTC, Nifty, EUR...",
  "search.alerts": "Price alerts",
  "resources.group.general": "General",
  "resources.group.india": "India",
  "resources.group.usa": "USA",
  "portfolio.title": "Your Holdings",
  "portfolio.addHolding": "Add holding",
  "portfolio.trackPrompt": "Track what you hold — add gold, silver, or crypto",
  "portfolio.valueOverTime": "Value over time",
  "portfolio.disclaimer": "Saved on this device only — no account, nothing sent anywhere.",
  "section.metals": "Precious Metals",
  "section.crypto": "Cryptocurrency",
  "section.stocks": "Stock Market",
  "section.fuel": "Gasoline & Fuel",
  "section.news": "Financial News",
  "section.currencies": "Currencies",
  "pinned.title": "Pinned",
  "language.label": "Language",
  "portfolio.changeDisclaimer": "Change % is today's market move, not your gain/loss since purchase.",
  "portfolio.historyDisclaimer": "Approximate — applies today's exchange rate across the whole period rather than each date's actual rate.",
};

const ta: Dict = {
  "nav.home": "முகப்பு",
  "nav.tools": "கருவிகள்",
  "nav.news": "செய்திகள்",
  "footer.tagline": "பொதுமக்களுக்கான உலகளாவிய நிதி மையம் 🫂",
  "search.placeholder": "தங்கம், BTC, நிஃப்டி, EUR தேடுங்கள்...",
  "search.alerts": "விலை எச்சரிக்கைகள்",
  "resources.group.general": "பொது",
  "resources.group.india": "இந்தியா",
  "resources.group.usa": "அமெரிக்கா",
  "portfolio.title": "உங்கள் சொத்துக்கள்",
  "portfolio.addHolding": "சொத்து சேர்",
  "portfolio.trackPrompt": "உங்கள் சொத்துக்களைக் கண்காணிக்கவும் — தங்கம், வெள்ளி அல்லது கிரிப்டோ சேர்க்கவும்",
  "portfolio.valueOverTime": "காலப்போக்கில் மதிப்பு",
  "portfolio.disclaimer": "இந்தச் சாதனத்தில் மட்டுமே சேமிக்கப்படுகிறது — கணக்கு தேவையில்லை, எங்கும் அனுப்பப்படாது.",
  "section.metals": "விலையுயர்ந்த உலோகங்கள்",
  "section.crypto": "கிரிப்டோகரன்சி",
  "section.stocks": "பங்குச் சந்தை",
  "section.fuel": "பெட்ரோல் & எரிபொருள்",
  "section.news": "நிதி செய்திகள்",
  "section.currencies": "நாணயங்கள்",
  "pinned.title": "பின் செய்யப்பட்டவை",
  "language.label": "மொழி",
  "portfolio.changeDisclaimer": "மாற்றம் % என்பது இன்றைய சந்தை நகர்வு, வாங்கியதிலிருந்து உங்கள் லாபம்/நஷ்டம் அல்ல.",
  "portfolio.historyDisclaimer": "தோராயமானது — ஒவ்வொரு தேதியின் உண்மையான விகிதத்திற்குப் பதிலாக இன்றைய மாற்று விகிதத்தையே முழு காலகட்டத்திற்கும் பயன்படுத்துகிறது.",
};

const hi: Dict = {
  "nav.home": "होम",
  "nav.tools": "टूल्स",
  "nav.news": "समाचार",
  "footer.tagline": "आम लोगों के लिए वैश्विक वित्तीय केंद्र 🫂",
  "search.placeholder": "गोल्ड, BTC, निफ्टी, EUR खोजें...",
  "search.alerts": "प्राइस अलर्ट",
  "resources.group.general": "सामान्य",
  "resources.group.india": "भारत",
  "resources.group.usa": "अमेरिका",
  "portfolio.title": "आपकी होल्डिंग्स",
  "portfolio.addHolding": "होल्डिंग जोड़ें",
  "portfolio.trackPrompt": "अपनी होल्डिंग ट्रैक करें — सोना, चांदी या क्रिप्टो जोड़ें",
  "portfolio.valueOverTime": "समय के साथ मूल्य",
  "portfolio.disclaimer": "सिर्फ़ इस डिवाइस पर सेव — कोई अकाउंट नहीं, कहीं कुछ नहीं भेजा जाता।",
  "section.metals": "कीमती धातुएं",
  "section.crypto": "क्रिप्टोकरेंसी",
  "section.stocks": "शेयर बाज़ार",
  "section.fuel": "पेट्रोल-डीज़ल और ईंधन",
  "section.news": "वित्तीय समाचार",
  "section.currencies": "मुद्राएं",
  "pinned.title": "पिन किए गए",
  "language.label": "भाषा",
  "portfolio.changeDisclaimer": "बदलाव % आज की मार्केट मूवमेंट है, आपकी खरीद के बाद के लाभ/हानि का नहीं।",
  "portfolio.historyDisclaimer": "अनुमानित — पूरी अवधि में आज की विनिमय दर लागू है, न कि हर तारीख़ की वास्तविक दर।",
};

const zh: Dict = {
  "nav.home": "首页",
  "nav.tools": "工具",
  "nav.news": "新闻",
  "footer.tagline": "面向大众的全球金融中心 🫂",
  "search.placeholder": "搜索黄金、BTC、Nifty、欧元...",
  "search.alerts": "价格提醒",
  "resources.group.general": "通用",
  "resources.group.india": "印度",
  "resources.group.usa": "美国",
  "portfolio.title": "我的持仓",
  "portfolio.addHolding": "添加持仓",
  "portfolio.trackPrompt": "记录你的持仓 — 添加黄金、白银或加密货币",
  "portfolio.valueOverTime": "历史价值走势",
  "portfolio.disclaimer": "仅保存在本设备上 — 无需账户，不会上传到任何地方。",
  "section.metals": "贵金属",
  "section.crypto": "加密货币",
  "section.stocks": "股票市场",
  "section.fuel": "汽油与燃料",
  "section.news": "财经新闻",
  "section.currencies": "货币汇率",
  "pinned.title": "已收藏",
  "language.label": "语言",
  "portfolio.changeDisclaimer": "涨跌幅指今日市场变动，并非您自购买以来的实际盈亏。",
  "portfolio.historyDisclaimer": "此为估算值 — 整个时间段均按今日汇率计算，而非每个日期的实际汇率。",
};

const ja: Dict = {
  "nav.home": "ホーム",
  "nav.tools": "ツール",
  "nav.news": "ニュース",
  "footer.tagline": "みんなのためのグローバル金融ハブ 🫂",
  "search.placeholder": "金、BTC、Nifty、ユーロを検索...",
  "search.alerts": "価格アラート",
  "resources.group.general": "一般",
  "resources.group.india": "インド",
  "resources.group.usa": "アメリカ",
  "portfolio.title": "保有資産",
  "portfolio.addHolding": "資産を追加",
  "portfolio.trackPrompt": "保有資産を記録 — 金、銀、暗号資産を追加",
  "portfolio.valueOverTime": "資産価値の推移",
  "portfolio.disclaimer": "このデバイスにのみ保存 — アカウント不要、外部送信なし。",
  "section.metals": "貴金属",
  "section.crypto": "暗号資産",
  "section.stocks": "株式市場",
  "section.fuel": "ガソリン・燃料",
  "section.news": "経済ニュース",
  "section.currencies": "為替レート",
  "pinned.title": "ピン留め",
  "language.label": "言語",
  "portfolio.changeDisclaimer": "騰落率は本日の市場変動であり、購入時からの損益ではありません。",
  "portfolio.historyDisclaimer": "概算値です — 期間全体に本日の為替レートを適用しており、各日の実際のレートではありません。",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.tools": "الأدوات",
  "nav.news": "الأخبار",
  "footer.tagline": "مركز مالي عالمي لعامة الناس 🫂",
  "search.placeholder": "ابحث عن الذهب، BTC، Nifty، اليورو...",
  "search.alerts": "تنبيهات الأسعار",
  "resources.group.general": "عام",
  "resources.group.india": "الهند",
  "resources.group.usa": "الولايات المتحدة",
  "portfolio.title": "ممتلكاتك",
  "portfolio.addHolding": "إضافة ممتلكات",
  "portfolio.trackPrompt": "تتبّع ممتلكاتك — أضف الذهب أو الفضة أو العملات الرقمية",
  "portfolio.valueOverTime": "القيمة عبر الزمن",
  "portfolio.disclaimer": "محفوظ على هذا الجهاز فقط — بلا حساب، ولا يُرسَل إلى أي مكان.",
  "section.metals": "المعادن الثمينة",
  "section.crypto": "العملات الرقمية",
  "section.stocks": "سوق الأسهم",
  "section.fuel": "الوقود والبنزين",
  "section.news": "الأخبار المالية",
  "section.currencies": "العملات",
  "pinned.title": "المثبّتة",
  "language.label": "اللغة",
  "portfolio.changeDisclaimer": "نسبة التغيير تعكس حركة السوق اليوم، وليست ربحك أو خسارتك منذ الشراء.",
  "portfolio.historyDisclaimer": "تقريبي — يطبّق سعر الصرف الحالي على كامل الفترة بدلاً من السعر الفعلي لكل تاريخ.",
};

const DICTS: Record<LanguageCode, Dict> = { en, ta, hi, zh, ja, ar };

const LANG_KEY = "marketatlas:language";
const LANG_EVENT = "marketatlas:language-changed";

function readLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return LANGUAGES.some((l) => l.code === raw) ? (raw as LanguageCode) : "en";
  } catch {
    return "en";
  }
}

function writeLanguage(lang: LanguageCode) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

function applyDocumentDirection(lang: LanguageCode) {
  if (typeof document === "undefined") return;
  const meta = LANGUAGES.find((l) => l.code === lang);
  document.documentElement.dir = meta?.dir ?? "ltr";
  document.documentElement.lang = lang;
}

export function useLanguage() {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const initial = readLanguage();
    setLanguageState(initial);
    applyDocumentDirection(initial);
    const sync = () => {
      const next = readLanguage();
      setLanguageState(next);
      applyDocumentDirection(next);
    };
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    writeLanguage(lang);
    applyDocumentDirection(lang);
  }, []);

  return [language, setLanguage] as const;
}

export function useTranslation() {
  const [language, setLanguage] = useLanguage();
  const t = useCallback(
    (key: string) => DICTS[language]?.[key] ?? DICTS.en[key] ?? key,
    [language],
  );
  return { t, language, setLanguage };
}
