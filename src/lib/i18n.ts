// ─── Internationalization ─────────────────────────────────────────────
// Simple key-based i18n with Chinese (zh) and English (en)

export type Locale = "en" | "zh";

const strings: Record<string, Record<Locale, string>> = {
  // ─── App Shell ─────────────────────────────────────────────────
  "app.title": { en: "Billionaire Cart", zh: "亿万富翁购物车" },
  "app.subtitle": {
    en: "Universal Checkout Simulation",
    zh: "终极消费模拟",
  },
  "app.reset": { en: "Reset", zh: "重置" },
  "app.footer": {
    en: "Simulation only — no real purchases are made",
    zh: "仅为模拟 · 不会产生真实消费",
  },

  // ─── Identity Selector ─────────────────────────────────────────
  "identity.title": { en: "Select Identity", zh: "选择身份" },

  // ─── Balance Display ───────────────────────────────────────────
  "balance.title": { en: "Available Balance", zh: "可用余额" },
  "balance.spent": { en: "Spent", zh: "已花费" },
  "balance.burn": { en: "Burn / Mo", zh: "月开销" },
  "balance.items": { en: "Items", zh: "项目数" },

  // ─── Catalog ───────────────────────────────────────────────────
  "catalog.title": { en: "Quick Buy", zh: "快速购买" },
  "catalog.search": { en: "Search items…", zh: "搜索商品…" },
  "catalog.sort.default": { en: "Default", zh: "默认" },
  "catalog.sort.priceAsc": { en: "Price ↑", zh: "价格 ↑" },
  "catalog.sort.priceDesc": { en: "Price ↓", zh: "价格 ↓" },
  "catalog.sort.name": { en: "Name", zh: "名称" },
  "catalog.buy": { en: "Buy", zh: "购买" },
  "catalog.buyMax": { en: "BUY MAX", zh: "全买" },
  "catalog.all": { en: "All", zh: "全部" },
  "catalog.noResults": { en: "No items found", zh: "未找到商品" },
  "tier.everyday": { en: "☕ Everyday", zh: "☕ 日常" },
  "tier.aspirational": { en: "💫 Aspirational", zh: "💫 进阶" },
  "tier.luxury": { en: "💎 Luxury", zh: "💎 奢华" },
  "tier.ultra": { en: "👑 Ultra", zh: "👑 至尊" },
  "tier.absurd": { en: "🤯 Absurd", zh: "🤯 疯狂" },

  // ─── Vault ─────────────────────────────────────────────────────
  "vault.title": { en: "The Vault", zh: "保险库" },
  "vault.empty": { en: "The Vault is Empty", zh: "保险库为空" },
  "vault.emptyHint": {
    en: "Paste a URL above to make your first acquisition",
    zh: "在上方粘贴链接或从目录购买",
  },
  "vault.deployed": { en: "Deployed", zh: "已部署" },
  "vault.burn": { en: "Burn", zh: "烧钱" },

  // ─── Wealth Context ────────────────────────────────────────────
  "wealth.title": { en: "Spending Context", zh: "消费洞察" },
  "wealth.nextMilestone": { en: "Next milestone", zh: "下一里程碑" },
  "wealth.toGo": { en: "to go", zh: "还差" },
  "wealth.equivalentTo": { en: "That's equivalent to…", zh: "相当于…" },
  "wealth.earnBack": {
    en: "earns all this back in",
    zh: "赚回这些钱只需",
  },

  // ─── Spending Speed ────────────────────────────────────────────
  "speed.title": { en: "Spending Velocity", zh: "消费速度" },
  "speed.perSec": { en: "/sec", zh: "/秒" },
  "speed.last60": { en: "Last 60s", zh: "过去60秒" },
  "speed.vsEarnings": { en: "vs earnings", zh: "对比收入" },
  "speed.faster": { en: "faster", zh: "更快" },
  "speed.slower": { en: "slower", zh: "更慢" },
  "speed.bankruptIn": {
    en: "At this rate, bankrupt in",
    zh: "照此速度，破产倒计时",
  },
  "speed.idle": { en: "Idle", zh: "闲置" },
  "speed.barelyDent": { en: "Barely a dent", zh: "九牛一毛" },
  "speed.spendingFast": { en: "Spending fast", zh: "花得挺快" },
  "speed.outpacing": { en: "Outpacing earnings!", zh: "花的比赚的快！" },
  "speed.onFire": { en: "On fire! 🔥", zh: "着了！🔥" },
  "speed.carnage": { en: "ABSOLUTE CARNAGE 💀", zh: "疯狂烧钱 💀" },

  // ─── Earnings Ticker ───────────────────────────────────────────
  "earnings.title": { en: "Earnings Velocity", zh: "赚钱速度" },
  "earnings.rate": { en: "Earning Rate", zh: "赚钱速率" },
  "earnings.since": { en: "Earned Since You Started", zh: "开始以来赚取" },
  "earnings.earnBack": { en: "Earn-back Time", zh: "赚回时间" },
  "earnings.earnedBack": { en: "Earned back!", zh: "已赚回！" },

  // ─── OmniBox ───────────────────────────────────────────────────
  "omni.placeholder": {
    en: "Paste any URL to purchase…",
    zh: "粘贴任意商品链接…",
  },
  "omni.parse": { en: "Parse", zh: "解析" },
  "omni.parsing": { en: "Parsing…", zh: "解析中…" },
  "omni.manual": { en: "Or enter manually →", zh: "或手动输入 →" },
  "omni.backToUrl": { en: "← Back to URL", zh: "← 返回链接" },
  "omni.productName": { en: "Product name…", zh: "商品名称…" },
  "omni.price": { en: "Price (USD)…", zh: "价格 (美元)…" },
  "omni.addItem": { en: "Add Item", zh: "添加商品" },

  // ─── Share Receipt ─────────────────────────────────────────────
  "share.title": { en: "Share Receipt", zh: "分享" },
  "share.download": { en: "📥 Download PNG", zh: "📥 下载图片" },
  "share.copy": { en: "📋 Copy Text", zh: "📋 复制文本" },
  "share.copied": { en: "✓ Copied!", zh: "✓ 已复制！" },
  "share.close": { en: "Close", zh: "关闭" },
  "share.receipt": { en: "Transaction Receipt", zh: "消费收据" },
  "share.netWorth": { en: "Net Worth", zh: "净资产" },
  "share.deployed": { en: "Deployed", zh: "已部署" },
  "share.remaining": { en: "Remaining", zh: "余额" },
  "share.topAcq": { en: "Top Acquisitions", zh: "最大手笔" },

  // ─── Achievements ──────────────────────────────────────────────
  "achievements.title": { en: "Achievements", zh: "成就" },

  // ─── Speedrun ──────────────────────────────────────────────────
  "speedrun.title": { en: "⚡ Speedrun Mode", zh: "⚡ 极速挑战" },
  "speedrun.best": { en: "Best", zh: "最佳" },
  "speedrun.prompt": {
    en: "Bankrupt {name} as fast as you can!",
    zh: "以最快速度花光 {name} 的钱！",
  },
  "speedrun.start": { en: "🏁 Start Speedrun", zh: "🏁 开始挑战" },
  "speedrun.items": { en: "items", zh: "件商品" },
  "speedrun.spent": { en: "spent", zh: "花掉" },
  "speedrun.newRecord": { en: "New Record!", zh: "新纪录！" },
  "speedrun.complete": { en: "Speedrun Complete", zh: "挑战完成" },
  "speedrun.tryAgain": { en: "🔄 Try Again", zh: "🔄 再来一次" },
  "speedrun.copyResult": { en: "📋 Copy Result", zh: "📋 复制结果" },
  "speedrun.abort": { en: "✕ Abort", zh: "✕ 放弃" },
  "speedrun.remaining": { en: "Remaining", zh: "剩余" },

  // ─── Bankrupt Overlay ──────────────────────────────────────────
  "bankrupt.status": { en: "Account Status", zh: "账户状态" },
  "bankrupt.depleted": { en: "DEPLETED", zh: "已清零" },
  "bankrupt.cancelled": { en: "✕ CANCELLED", zh: "✕ 已注销" },
  "bankrupt.fortune": { en: "Fortune", zh: "总资产" },
  "bankrupt.items": { en: "Items", zh: "件数" },
  "bankrupt.trophies": { en: "Trophies", zh: "成就" },
  "bankrupt.mostExpensive": {
    en: "Most expensive acquisition",
    zh: "最大手笔",
  },
  "bankrupt.keepGoing": { en: "Keep Going (Debt Mode)", zh: "继续（负债模式）" },
  "bankrupt.newIdentity": { en: "New Identity", zh: "换个身份" },

  // ─── Category Breakdown ────────────────────────────────────────
  "category.title": { en: "Portfolio Breakdown", zh: "消费分布" },
  "category.items": { en: "Items", zh: "项目" },
  "category.biggest": { en: "Biggest category", zh: "最大品类" },
  "category.item": { en: "item", zh: "件" },
  "category.itemPlural": { en: "items", zh: "件" },
  "category.moreCategories": {
    en: "+{n} more categories",
    zh: "另有 {n} 个品类",
  },

  // ─── Guilt Meter ───────────────────────────────────────────────
  "guilt.title": { en: "Real-World Impact", zh: "现实影响" },
  "guilt.couldHave": {
    en: "What {amount} could have done instead…",
    zh: "这 {amount} 本来可以…",
  },
  "guilt.gdpBeaten": {
    en: "You've spent more than the entire GDP of",
    zh: "你的花费已经超过了整个",
  },
  "guilt.gdpBeatSuffix": { en: "", zh: "的GDP" },
  "guilt.gdpNext": { en: "Next", zh: "下一个" },
  "guilt.guiltLevel": { en: "Guilt Level", zh: "内疚指数" },
  "guilt.beyondRedemption": { en: "😈 Beyond Redemption", zh: "😈 无可救药" },
  "guilt.devastating": { en: "🫣 Devastating", zh: "🫣 触目惊心" },
  "guilt.uncomfortable": { en: "😬 Uncomfortable", zh: "😬 开始不安" },
  "guilt.slightTwinge": { en: "😅 Slight Twinge", zh: "😅 略有愧意" },
  "guilt.innocent": { en: "😇 Innocent", zh: "😇 心安理得" },

  // ─── Wealth Comparisons ────────────────────────────────────────
  "compare.avgSalary": { en: "average US yearly salary", zh: "美国人年均工资" },
  "compare.avgSalaryPlural": {
    en: "years of average US salary",
    zh: "年的美国人均工资",
  },
  "compare.coffee": { en: "cup of coffee", zh: "杯咖啡" },
  "compare.coffeePlural": { en: "cups of coffee", zh: "杯咖啡" },
  "compare.iphone": { en: "iPhone", zh: "部 iPhone" },
  "compare.iphonePlural": { en: "iPhones", zh: "部 iPhone" },
  "compare.corolla": { en: "Toyota Corolla", zh: "辆丰田卡罗拉" },
  "compare.corollaPlural": { en: "Toyota Corollas", zh: "辆丰田卡罗拉" },
  "compare.lifetime": {
    en: "average American's lifetime earnings",
    zh: "个普通美国人一生的收入",
  },
  "compare.lifetimePlural": {
    en: "lifetimes of average earnings",
    zh: "个普通美国人一生的收入",
  },

  // ─── Impact Items ──────────────────────────────────────────────
  "impact.homes": { en: "median US homes", zh: "套美国中位价住房" },
  "impact.homesDesc": {
    en: "Could house an entire neighborhood",
    zh: "足以让一整个社区有房住",
  },
  "impact.salaryYears": {
    en: "years of average salary",
    zh: "年的人均工资",
  },
  "impact.salaryDesc": {
    en: "{n} average lifetimes of work",
    zh: "相当于 {n} 个人一辈子的收入",
  },
  "impact.meals": { en: "meals", zh: "顿饭" },
  "impact.mealsDesc": {
    en: "Could feed a family of 4 for {n} years",
    zh: "可以养活一家四口 {n} 年",
  },
  "impact.wells": { en: "clean water wells", zh: "口净水井" },
  "impact.wellsDesc": {
    en: "Clean water for ~{n} people",
    zh: "为约 {n} 人提供清洁饮水",
  },
  "impact.schools": { en: "schools built", zh: "所学校" },
  "impact.schoolsDesc": {
    en: "Educating ~{n} students",
    zh: "培养约 {n} 名学生",
  },
  "impact.vaccines": { en: "children vaccinated", zh: "名儿童接种疫苗" },
  "impact.vaccinesDesc": {
    en: "Full immunization packages",
    zh: "完整的免疫接种方案",
  },
  "impact.trees": { en: "trees planted", zh: "棵树" },
  "impact.treesDesc": {
    en: "~{n} acres of forest",
    zh: "约 {n} 英亩的森林",
  },
  "impact.nets": { en: "malaria bed nets", zh: "顶疟疾防护蚊帐" },
  "impact.netsDesc": {
    en: "Protecting ~{n} families",
    zh: "保护约 {n} 个家庭",
  },
  "impact.scholarships": {
    en: "full college scholarships",
    zh: "个大学全额奖学金",
  },
  "impact.scholarshipsDesc": {
    en: "4-year degree fully funded",
    zh: "四年学费全包",
  },

  // ─── Billionaire Reactions ─────────────────────────────────────
  "reactions.title": { en: "Billionaire Reactions", zh: "富豪反应" },

  // ─── Combo Streak ──────────────────────────────────────────────
  "combo.streak": { en: "COMBO", zh: "连击" },
};

/**
 * Get a translated string by key and locale.
 * Supports simple `{placeholder}` substitution via the `vars` parameter.
 */
export function t(
  key: string,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  let str = strings[key]?.[locale] ?? strings[key]?.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

/** Tier label lookup by locale */
export function tierLabel(
  tier: string,
  locale: Locale
): string {
  return t(`tier.${tier}`, locale);
}
