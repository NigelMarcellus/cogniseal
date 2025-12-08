"use client";

import { useEffect, useState } from "react";
import { useCogniSeal } from "@/hooks/useCogniSeal";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ExamPageClient({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const router = useRouter();
  const [examId, setExamId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setExamId(p.examId));
  }, [params]);

  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
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

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [submissionId, setSubmissionId] = useState<bigint | undefined>(
    undefined
  );

  const examIdBigInt = examId ? BigInt(examId) : BigInt(0);

  useEffect(() => {
    if (isConnected && cogniSeal.isDeployed && examId) {
      cogniSeal.getExamInfo(examIdBigInt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, cogniSeal.isDeployed, examId, examIdBigInt]);

  useEffect(() => {
    if (cogniSeal.examInfo && examId) {
      cogniSeal.getQuestions(examIdBigInt);
      setAnswers(new Array(cogniSeal.examInfo.questionCount).fill(""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cogniSeal.examInfo, examId, examIdBigInt]);

  useEffect(() => {
    if (isConnected && accounts && accounts.length > 0 && examId) {
      cogniSeal.getAttemptInfo(
        examIdBigInt,
        accounts[0] as `0x${string}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected,
    accounts,
    examId,
    examIdBigInt,
  ]);

  useEffect(() => {
    if (submissionId) {
      cogniSeal.getSubmissionScore(submissionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (!examId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Take Exam
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Please connect your wallet to take this exam.
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

  if (cogniSeal.isDeployed === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Take Exam</h1>
          <p className="text-muted-foreground text-lg">
            CogniSeal contract is not deployed on this network.
          </p>
        </div>
      </div>
    );
  }

  if (!cogniSeal.examInfo || cogniSeal.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  const handleAnswerChange = (index: number, value: string | number) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!cogniSeal.examInfo) return;

    const submissionIdResult = await cogniSeal.submitAnswers(examIdBigInt, answers);
    if (submissionIdResult) {
      setSubmissionId(submissionIdResult);
    }
  };

  const handleDecryptScore = () => {
    cogniSeal.decryptScore();
  };

  const handleMintCertificate = async () => {
    if (!cogniSeal.clearScore || !submissionId) return;
    await cogniSeal.mintCertificate(
      submissionId,
      examIdBigInt,
      cogniSeal.clearScore.clear
    );
  };

  const currentQuestion = cogniSeal.questions[currentQuestionIndex];
  const canAttempt =
    cogniSeal.attemptInfo?.canAttempt ?? true;
  const remainingAttempts =
    cogniSeal.attemptInfo && cogniSeal.examInfo
      ? cogniSeal.examInfo.maxAttempts - cogniSeal.attemptInfo.attemptCount
      : cogniSeal.examInfo?.maxAttempts ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {cogniSeal.examInfo.title}
          </h1>
          <p className="text-lg text-muted-foreground">{cogniSeal.examInfo.description}</p>
        </div>

        {cogniSeal.attemptInfo && (
          <div className="mb-6 p-5 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">
                  Remaining Attempts: <span className="text-primary">{remainingAttempts}</span> / {cogniSeal.examInfo.maxAttempts}
                </span>
              </div>
              {cogniSeal.attemptInfo.cooldownEndTime > BigInt(0) &&
                Number(cogniSeal.attemptInfo.cooldownEndTime) * 1000 >
                  Date.now() && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Cooldown:{" "}
                      {Math.ceil(
                        (Number(cogniSeal.attemptInfo.cooldownEndTime) * 1000 -
                          Date.now()) * (1 / 60000)
                      )}{" "}
                      minutes remaining
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}

      {!submissionId ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {currentQuestionIndex + 1} / {cogniSeal.questions.length}
                </span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentQuestionIndex + 1} of {cogniSeal.questions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cogniSeal.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                    index === currentQuestionIndex
                      ? "bg-primary text-primary-foreground shadow-md scale-110"
                      : answers[index]
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-lg">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{currentQuestionIndex + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {currentQuestion.questionText}
                </h3>
              </div>
            </div>

            {currentQuestion.questionType === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      answers[currentQuestionIndex] === option
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={option}
                      checked={answers[currentQuestionIndex] === option}
                      onChange={(e) =>
                        handleAnswerChange(
                          currentQuestionIndex,
                          Number(e.target.value)
                        )
                      }
                      className="w-5 h-5 text-primary mr-4"
                    />
                    <span className="text-base font-medium">Option {option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[currentQuestionIndex] || ""}
                onChange={(e) =>
                  handleAnswerChange(currentQuestionIndex, e.target.value)
                }
                className="w-full px-5 py-4 border-2 border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-lg"
                placeholder="Enter your answer"
              />
            )}
          </div>

          <div className="flex justify-between gap-4 pt-6">
            <button
              onClick={() =>
                setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
              }
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-card border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            {currentQuestionIndex < cogniSeal.questions.length - 1 ? (
              <button
                onClick={() =>
                  setCurrentQuestionIndex(
                    Math.min(
                      cogniSeal.questions.length - 1,
                      currentQuestionIndex + 1
                    )
                  )
                }
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canAttempt || cogniSeal.isSubmitting}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 flex items-center gap-2"
              >
                {cogniSeal.isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Exam
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-8 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Exam Results
                </h2>
                <p className="text-muted-foreground">Your exam has been graded</p>
              </div>
              <Link
                href="/exams"
                className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 font-medium"
              >
                ← Back to Exams
              </Link>
            </div>

            <div className="mb-6 p-4 bg-muted/50 backdrop-blur-sm rounded-lg border border-border/50">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Submission ID: </span>
                  <span className="font-mono font-medium">{submissionId?.toString()}</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div>
                  <span className="text-muted-foreground">Exam: </span>
                  <span className="font-medium">{cogniSeal.examInfo.title}</span>
                </div>
              </div>
            </div>

            {cogniSeal.scoreHandle && !cogniSeal.clearScore && (
              <div className="space-y-4">
                <div className="p-6 bg-primary/10 backdrop-blur-sm rounded-xl border-2 border-primary/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium mb-2">Your exam has been graded</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click the button below to decrypt your score and see your results.
                      </p>
                      <button
                        onClick={handleDecryptScore}
                        disabled={cogniSeal.isDecrypting}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex items-center gap-2"
                      >
                        {cogniSeal.isDecrypting ? (
                          <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Decrypt Score
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {cogniSeal.clearScore && (
              <div className="space-y-6">
                <div className={`p-8 rounded-2xl border-2 shadow-xl ${
                  cogniSeal.clearScore.clear >= cogniSeal.examInfo.passingScore
                    ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-500"
                    : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-500"
                }`}>
                  <div className="text-center">
                    <div className="mb-6">
                      {cogniSeal.clearScore.clear >= cogniSeal.examInfo.passingScore ? (
                        <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                          <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                          <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-5xl font-bold mb-3">
                      {cogniSeal.clearScore.clear} / {cogniSeal.examInfo.questionCount}
                    </p>
                    <p className="text-lg text-muted-foreground mb-6">
                      Passing Score: {cogniSeal.examInfo.passingScore}
                    </p>
                    {cogniSeal.clearScore.clear >= cogniSeal.examInfo.passingScore ? (
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ✓ Congratulations! You Passed!
                        </p>
                        <p className="text-base text-muted-foreground">
                          You can now mint your certificate as proof of competence.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                          ✗ Not Passed
                        </p>
                        <p className="text-base text-muted-foreground">
                          You need {cogniSeal.examInfo.passingScore - cogniSeal.clearScore.clear} more correct answer{cogniSeal.examInfo.passingScore - cogniSeal.clearScore.clear > 1 ? 's' : ''} to pass.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {cogniSeal.clearScore.clear >= cogniSeal.examInfo.passingScore && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleMintCertificate}
                      className="flex-1 px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Mint Certificate
                    </button>
                    <Link
                      href="/certificates"
                      className="flex-1 px-8 py-4 bg-card border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 text-center font-semibold shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      View My Certificates
                    </Link>
                  </div>
                )}

                {cogniSeal.clearScore.clear < cogniSeal.examInfo.passingScore && (
                  <div className="p-5 bg-muted/50 backdrop-blur-sm rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      You can retake this exam after the cooldown period ends.
                    </p>
                    <Link
                      href="/exams"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                    >
                      Browse Other Exams
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {cogniSeal.message && (
        <div className="mt-6 p-4 bg-muted/50 backdrop-blur-sm rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">{cogniSeal.message}</p>
        </div>
      )}
      </div>
    </div>
  );
}

