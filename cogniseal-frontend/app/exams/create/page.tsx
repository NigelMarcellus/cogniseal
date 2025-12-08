"use client";

import { useState } from "react";
import { useCogniSeal } from "@/hooks/useCogniSeal";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useRouter } from "next/navigation";

type Question = {
  questionText: string;
  questionType: number; // 0 = MultipleChoice, 1 = FillInBlank
  correctAnswer: string;
  options?: string[]; // For MultipleChoice: array of option texts
};

export default function CreateExamPage() {
  const router = useRouter();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: isConnected,
  });

  const cogniSeal = useCogniSeal({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: "", questionType: 0, correctAnswer: "", options: ["", "", "", ""] },
  ]);
  const [passingScore, setPassingScore] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [cooldownMinutes, setCooldownMinutes] = useState(5);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Create Exam
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Please connect your wallet to create an exam.
            </p>
            <button
              onClick={connect}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: "", questionType: 0, correctAnswer: "", options: ["", "", "", ""] },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: string | number | string[]
  ) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateQuestionOption = (
    index: number,
    optionIndex: number,
    value: string
  ) => {
    const updated = [...questions];
    if (!updated[index].options) {
      updated[index].options = ["", "", "", ""];
    }
    updated[index].options![optionIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fhevmInstance || !ethersSigner) {
      return;
    }

    // Format question texts: for MultipleChoice, append options to question text
    const questionTexts = questions.map((q) => {
      if (q.questionType === 0 && q.options) {
        // MultipleChoice: format as "Question Text\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4"
        const optionLabels = ["A", "B", "C", "D"];
        const optionsText = q.options
          .map((opt, idx) => {
            if (opt.trim()) {
              return `${optionLabels[idx]}) ${opt}`;
            }
            return "";
          })
          .filter((opt) => opt !== "")
          .join("\n");
        return optionsText ? `${q.questionText}\n${optionsText}` : q.questionText;
      }
      return q.questionText;
    });
    const questionTypes = questions.map((q) => q.questionType);
    const correctAnswers = questions.map((q) => q.correctAnswer);

    await cogniSeal.createExam(
      title,
      description,
      questionTexts,
      questionTypes,
      correctAnswers,
      passingScore,
      timeLimitMinutes,
      maxAttempts,
      cooldownMinutes
    );

    router.push("/exams");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Create Exam
          </h1>
          <p className="text-muted-foreground text-lg">
            Create a new encrypted exam with zero-knowledge answer verification
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
        <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
          <label className="block text-sm font-semibold mb-3 text-foreground">Exam Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="Enter exam title"
          />
        </div>

        <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
          <label className="block text-sm font-semibold mb-3 text-foreground">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            placeholder="Enter exam description"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
            <div>
              <label className="block text-lg font-semibold text-foreground mb-1">Questions</label>
              <p className="text-sm text-muted-foreground">Add questions with encrypted answers</p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>

          {questions.map((question, index) => (
            <div
              key={index}
              className="p-6 border border-border rounded-xl bg-card/50 backdrop-blur-sm shadow-md hover:shadow-lg transition-all space-y-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <span className="text-base font-semibold text-foreground">Question {index + 1}</span>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">
                  Question Text
                </label>
                <input
                  type="text"
                  value={question.questionText}
                  onChange={(e) =>
                    updateQuestion(index, "questionText", e.target.value)
                  }
                  required
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Enter question text"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">
                  Question Type
                </label>
                <select
                  value={question.questionType}
                  onChange={(e) => {
                    const newType = Number(e.target.value);
                    updateQuestion(index, "questionType", newType);
                    // Initialize options for MultipleChoice
                    if (newType === 0 && !question.options) {
                      updateQuestion(index, "options", ["", "", "", ""]);
                    }
                  }}
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value={0}>Multiple Choice</option>
                  <option value={1}>Fill in the Blank</option>
                </select>
              </div>

              {question.questionType === 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-foreground">
                    Options
                  </label>
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <span className="w-6 text-sm font-medium text-muted-foreground">
                          {String.fromCharCode(65 + optionIndex)})
                        </span>
                        <input
                          type="text"
                          value={question.options?.[optionIndex] || ""}
                          onChange={(e) =>
                            updateQuestionOption(index, optionIndex, e.target.value)
                          }
                          required={optionIndex < 2}
                          className="flex-1 px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                          placeholder={`Enter option ${optionIndex + 1} text`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">
                  Correct Answer
                </label>
                {question.questionType === 0 ? (
                  <select
                    value={question.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(index, "correctAnswer", e.target.value)
                    }
                    required
                    className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  >
                    <option value="">Select correct option</option>
                    {[1, 2, 3, 4].map((optNum) => (
                      <option key={optNum} value={optNum.toString()}>
                        Option {optNum} {question.options?.[optNum - 1] ? `(${question.options[optNum - 1]})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={question.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(index, "correctAnswer", e.target.value)
                    }
                    required
                    className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Enter correct answer text"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Exam Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Passing Score
              </label>
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                required
                min={1}
                max={questions.length}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                required
                min={1}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Max Attempts
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                required
                min={1}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Cooldown (minutes)
              </label>
              <input
                type="number"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                required
                min={0}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={cogniSeal.isSubmitting || !fhevmInstance}
          className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {cogniSeal.isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Exam...
            </>
          ) : fhevmStatus !== "ready" ? (
            "Initializing FHEVM..."
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Exam
            </>
          )}
        </button>

        {cogniSeal.message && (
          <div className="p-4 bg-muted/50 backdrop-blur-sm rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">{cogniSeal.message}</p>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}
