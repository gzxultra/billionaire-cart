"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { billionaires } from "@/data/billionaires";
import { formatCurrency } from "@/lib/format";

interface TriviaQuestion {
  id: string;
  question: string;
  questionZh: string;
  options: string[];
  optionsZh: string[];
  correctIndex: number;
  explanation: string;
  explanationZh: string;
  emoji: string;
}

function generateQuestions(): TriviaQuestion[] {
  const questions: TriviaQuestion[] = [
    {
      id: "musk-twitter",
      question: "How much did Elon Musk pay for Twitter (X)?",
      questionZh: "马斯克花了多少钱买下 Twitter (X)？",
      options: ["$12 Billion", "$44 Billion", "$78 Billion", "$22 Billion"],
      optionsZh: ["120亿美元", "440亿美元", "780亿美元", "220亿美元"],
      correctIndex: 1,
      explanation: "Musk acquired Twitter for $44B in October 2022.",
      explanationZh: "马斯克于2022年10月以440亿美元收购了 Twitter。",
      emoji: "🐦",
    },
    {
      id: "buffett-house",
      question: "How much did Warren Buffett pay for his Omaha house in 1958?",
      questionZh: "巴菲特1958年花多少钱买了他的奥马哈房子？",
      options: ["$31,500", "$150,000", "$500,000", "$1,200,000"],
      optionsZh: ["31,500美元", "150,000美元", "500,000美元", "1,200,000美元"],
      correctIndex: 0,
      explanation: "Buffett bought his modest home for $31,500 — and still lives there!",
      explanationZh: "巴菲特以31,500美元买下这栋朴素的房子——至今仍住在那里！",
      emoji: "🏡",
    },
    {
      id: "bezos-yacht",
      question: "How long is Jeff Bezos's superyacht Koru?",
      questionZh: "贝佐斯的超级游艇 Koru 有多长？",
      options: ["80 meters", "127 meters", "95 meters", "160 meters"],
      optionsZh: ["80米", "127米", "95米", "160米"],
      correctIndex: 1,
      explanation: "The Koru is a 127m sailing yacht — one of the world's largest.",
      explanationZh: "Koru 是一艘127米的帆船游艇——世界上最大的之一。",
      emoji: "⛵",
    },
    {
      id: "zuck-whatsapp",
      question: "How much did Meta (Facebook) pay for WhatsApp?",
      questionZh: "Meta（Facebook）花了多少钱收购 WhatsApp？",
      options: ["$1 Billion", "$5 Billion", "$19 Billion", "$35 Billion"],
      optionsZh: ["10亿美元", "50亿美元", "190亿美元", "350亿美元"],
      correctIndex: 2,
      explanation: "Facebook acquired WhatsApp for $19B in 2014 — the largest tech acquisition at the time.",
      explanationZh: "Facebook于2014年以190亿美元收购了 WhatsApp——当时最大的科技收购。",
      emoji: "💬",
    },
    {
      id: "arnault-tiffany",
      question: "How much did LVMH pay to acquire Tiffany & Co.?",
      questionZh: "LVMH 花了多少钱收购蒂芙尼？",
      options: ["$8.5 Billion", "$15.8 Billion", "$22 Billion", "$5.2 Billion"],
      optionsZh: ["85亿美元", "158亿美元", "220亿美元", "52亿美元"],
      correctIndex: 1,
      explanation: "LVMH acquired Tiffany for $15.8B in 2021 — its largest acquisition ever.",
      explanationZh: "LVMH于2021年以158亿美元收购了蒂芙尼——LVMH史上最大收购。",
      emoji: "💎",
    },
    {
      id: "ambani-home",
      question: "How many floors does Mukesh Ambani's Antilia tower have?",
      questionZh: "穆克什·安巴尼的安蒂利亚塔有多少层？",
      options: ["15 floors", "27 floors", "40 floors", "52 floors"],
      optionsZh: ["15层", "27层", "40层", "52层"],
      correctIndex: 1,
      explanation: "Antilia is a 27-floor, 400,000 sq ft tower — the world's most expensive private home at $2B.",
      explanationZh: "安蒂利亚是一栋27层、40万平方英尺的大楼——世界最贵的私人住宅，价值20亿美元。",
      emoji: "🏗️",
    },
    {
      id: "ellison-lanai",
      question: "What percentage of Lanai island does Larry Ellison own?",
      questionZh: "拉里·埃里森拥有拉奈岛多大比例？",
      options: ["50%", "75%", "98%", "100%"],
      optionsZh: ["50%", "75%", "98%", "100%"],
      correctIndex: 2,
      explanation: "Ellison bought 98% of the Hawaiian island of Lanai for $300M in 2012.",
      explanationZh: "埃里森于2012年以3亿美元买下了夏威夷拉奈岛98%的面积。",
      emoji: "🌴",
    },
    {
      id: "gates-da-vinci",
      question: "Which Leonardo da Vinci manuscript does Bill Gates own?",
      questionZh: "比尔·盖茨拥有达芬奇的哪部手稿？",
      options: ["Codex Atlanticus", "Codex Leicester", "Codex Arundel", "Codex Trivulzianus"],
      optionsZh: ["大西洋手稿", "莱斯特手稿", "阿伦德尔手稿", "特里沃尔齐奥手稿"],
      correctIndex: 1,
      explanation: "Gates bought the Codex Leicester for $30.8M in 1994.",
      explanationZh: "盖茨于1994年以3080万美元买下了莱斯特手稿。",
      emoji: "📜",
    },
    {
      id: "huang-jacket",
      question: "What is Jensen Huang's signature fashion item?",
      questionZh: "黄仁勋的标志性时尚单品是什么？",
      options: ["Silk tie", "Leather jacket", "Turtleneck", "Cowboy hat"],
      optionsZh: ["丝绸领带", "皮夹克", "高领毛衣", "牛仔帽"],
      correctIndex: 1,
      explanation: "Jensen Huang is famously known for always wearing a leather jacket on stage.",
      explanationZh: "黄仁勋以永远穿着皮夹克上台而闻名。",
      emoji: "🧥",
    },
    {
      id: "combined-wealth",
      question: "Roughly how much is the combined net worth of the top 5 richest people?",
      questionZh: "前5大富豪的总资产大约是多少？",
      options: ["$500 Billion", "$750 Billion", "$955 Billion", "$1.2 Trillion"],
      optionsZh: ["5000亿美元", "7500亿美元", "9550亿美元", "1.2万亿美元"],
      correctIndex: 2,
      explanation: `The top 5 (Musk $230B, Arnault $200B, Bezos $195B, Zuckerberg $180B, Ellison $155B) ≈ $960B.`,
      explanationZh: "前5大（马斯克2300亿、阿尔诺2000亿、贝佐斯1950亿、扎克伯格1800亿、埃里森1550亿）≈ 9600亿美元。",
      emoji: "💰",
    },
    {
      id: "ballmer-clippers",
      question: "How much did Steve Ballmer pay for the LA Clippers?",
      questionZh: "鲍尔默花了多少钱买下洛杉矶快船队？",
      options: ["$550 Million", "$1 Billion", "$2 Billion", "$3.5 Billion"],
      optionsZh: ["5.5亿美元", "10亿美元", "20亿美元", "35亿美元"],
      correctIndex: 2,
      explanation: "Ballmer bought the Clippers for $2B in 2014 — a record NBA price at the time.",
      explanationZh: "鲍尔默于2014年以20亿美元买下快船队——当时NBA最高纪录。",
      emoji: "🏀",
    },
    {
      id: "bezos-blue-origin",
      question: "How much has Bezos invested in Blue Origin cumulatively?",
      questionZh: "贝佐斯累计向蓝色起源投资了多少？",
      options: ["$2 Billion", "$7 Billion", "$13 Billion", "$20 Billion"],
      optionsZh: ["20亿美元", "70亿美元", "130亿美元", "200亿美元"],
      correctIndex: 2,
      explanation: "Bezos has funded Blue Origin by selling Amazon stock — about $13B total.",
      explanationZh: "贝佐斯通过出售亚马逊股票资助蓝色起源——总计约130亿美元。",
      emoji: "🌙",
    },
  ];

  // Shuffle and pick 5
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

export function WealthTrivia() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "result" | "complete">("idle");
  const [streak, setStreak] = useState(0);

  const startQuiz = useCallback(() => {
    setQuestions(generateQuestions());
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setStreak(0);
    setPhase("playing");
  }, []);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === questions[currentIndex]?.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setPhase("result");
  }, [selectedAnswer, questions, currentIndex]);

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setPhase("complete");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setPhase("playing");
    }
  }, [currentIndex, questions.length]);

  const currentQ = questions[currentIndex];
  const scoreGrade = useMemo(() => {
    if (questions.length === 0) return { label: "", labelZh: "", emoji: "" };
    const pct = score / questions.length;
    if (pct === 1) return { label: "Wealth Genius", labelZh: "财富天才", emoji: "🧠" };
    if (pct >= 0.8) return { label: "Finance Expert", labelZh: "金融专家", emoji: "📊" };
    if (pct >= 0.6) return { label: "Smart Investor", labelZh: "聪明投资者", emoji: "💡" };
    if (pct >= 0.4) return { label: "Learning Fast", labelZh: "学习中", emoji: "📚" };
    return { label: "Needs Research", labelZh: "需要补课", emoji: "🔍" };
  }, [score, questions.length]);

  // Only show after 3+ purchases
  if (!selectedBillionaire || purchases.length < 3) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🧠</span>
        <h2 className="section-label !mb-0">
          {locale === "zh" ? "财富冷知识" : "Wealth Trivia"}
        </h2>
        {phase === "playing" && (
          <span className="ml-auto text-[10px] text-ash/60 font-mono">
            {currentIndex + 1}/{questions.length}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center py-4"
          >
            <p className="text-xs text-ash/70 mb-4">
              {locale === "zh"
                ? "测试你对亿万富翁的了解！5道题，看你能答对几个。"
                : "Test your billionaire knowledge! 5 questions, see how many you can get right."}
            </p>
            <button
              onClick={startQuiz}
              className="px-5 py-2.5 rounded-xl bg-stone/15 hover:bg-stone/25 border border-stone/30 text-xs font-medium text-sand transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {locale === "zh" ? "开始答题" : "Start Quiz"} 🎯
            </button>
          </motion.div>
        )}

        {(phase === "playing" || phase === "result") && currentQ && (
          <motion.div
            key={`q-${currentQ.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Score / streak bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-ash/60 font-mono">
                  {locale === "zh" ? "得分" : "Score"}: {score}
                </span>
                {streak >= 2 && (
                  <span className="text-[10px] text-champagne/80 font-medium animate-pulse">
                    🔥 {streak}x {locale === "zh" ? "连对" : "streak"}
                  </span>
                )}
              </div>
              {/* Progress dots */}
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div
                    key={`dot-${i}`}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < currentIndex ? "bg-stone/50" :
                      i === currentIndex ? "bg-champagne/80" : "bg-line/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question */}
            <div className="mb-4">
              <span className="text-lg mr-2">{currentQ.emoji}</span>
              <span className="text-sm text-sand font-medium">
                {locale === "zh" ? currentQ.questionZh : currentQ.question}
              </span>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {(locale === "zh" ? currentQ.optionsZh : currentQ.options).map((opt, i) => {
                const isSelected = selectedAnswer === i;
                const isCorrect = i === currentQ.correctIndex;
                const showResult = phase === "result";

                return (
                  <button
                    key={`opt-${i}`}
                    onClick={() => handleAnswer(i)}
                    disabled={phase === "result"}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all border ${
                      showResult && isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                        : showResult && isSelected && !isCorrect
                        ? "bg-red-500/10 border-red-500/40 text-red-300"
                        : isSelected
                        ? "bg-stone/15 border-stone/40 text-sand"
                        : "bg-surface-dim/60 border-line/40 text-ash/80 hover:border-stone/30 hover:bg-surface/60"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-ash/50 mr-2">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    {showResult && isCorrect && " ✓"}
                    {showResult && isSelected && !isCorrect && " ✗"}
                  </button>
                );
              })}
            </div>

            {/* Explanation + Next */}
            {phase === "result" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-[11px] text-ash/65 bg-surface-dim/50 rounded-lg px-3 py-2 border border-line/30">
                  💡 {locale === "zh" ? currentQ.explanationZh : currentQ.explanation}
                </p>
                <button
                  onClick={nextQuestion}
                  className="w-full py-2 rounded-xl bg-stone/12 hover:bg-stone/20 border border-line/30 text-xs text-sand font-medium transition-all"
                >
                  {currentIndex + 1 >= questions.length
                    ? (locale === "zh" ? "查看结果" : "See Results")
                    : (locale === "zh" ? "下一题 →" : "Next →")}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4 space-y-3"
          >
            <div className="text-3xl mb-2">{scoreGrade.emoji}</div>
            <div className="text-lg font-serif text-sand">
              {locale === "zh" ? scoreGrade.labelZh : scoreGrade.label}
            </div>
            <div className="text-sm text-champagne/80 font-serif">
              {score}/{questions.length} {locale === "zh" ? "正确" : "correct"}
            </div>
            <div className="text-[11px] text-ash/55">
              {score === questions.length
                ? (locale === "zh" ? "满分！你是真正的财富专家！" : "Perfect score! You're a true wealth expert!")
                : score >= 3
                ? (locale === "zh" ? "不错！你对亿万富翁了解不少。" : "Nice! You know your billionaires well.")
                : (locale === "zh" ? "继续关注财经新闻吧！" : "Keep reading those finance headlines!")}
            </div>
            <button
              onClick={startQuiz}
              className="mt-2 px-5 py-2 rounded-xl bg-stone/12 hover:bg-stone/20 border border-line/30 text-xs text-sand font-medium transition-all"
            >
              {locale === "zh" ? "再来一轮" : "Play Again"} 🔄
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
