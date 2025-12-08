"use client";

import { useEffect, useState } from "react";
import { useCogniSeal } from "@/hooks/useCogniSeal";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import Link from "next/link";
import { ethers } from "ethers";

type SubmissionResult = {
  submissionId: bigint;
  examId: bigint;
  submittedAt: bigint;
  examTitle: string;
  scoreHandle?: string;
  clearScore?: number;
  isDecrypted: boolean;
  isDecrypting: boolean;
};

export default function ResultsPage() {
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

  const [submissions, setSubmissions] = useState<SubmissionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (
      !isConnected ||
      !accounts ||
      accounts.length === 0 ||
      !cogniSeal.contractAddress ||
      !cogniSeal.isDeployed ||
      !ethersReadonlyProvider ||
      !cogniSeal.abi
    ) {
      return;
    }

    const loadSubmissions = async () => {
      setIsLoading(true);
      try {
        const contract = new ethers.Contract(
          cogniSeal.contractAddress!,
          cogniSeal.abi,
          ethersReadonlyProvider
        );

        // Query AnswersSubmitted events for this user
        const filter = contract.filters.AnswersSubmitted(
          null, // submissionId
          null, // examId
          accounts[0] // examinee (indexed)
        );

        // Get events from block 0 to latest
        const events = await contract.queryFilter(filter, 0);

        const submissionList: SubmissionResult[] = [];

        // Process each event
        for (const event of events) {
          if ('args' in event && event.args) {
            const submissionId = event.args[0] as bigint;
            const examId = event.args[1] as bigint;
            const submittedAt = event.args[3] as bigint;

            // Get exam title
            let examTitle = `Exam ${examId.toString()}`;
            try {
              const examInfo = await contract.getExamInfo(examId);
              examTitle = examInfo[0]; // title
            } catch (e) {
              console.error(`Failed to get exam info for ${examId}:`, e);
            }

            // Try to get encrypted score
            let scoreHandle: string | undefined;
            try {
              const encryptedScore = await contract.getSubmissionScore(
                submissionId
              );
              scoreHandle = encryptedScore;
            } catch (e) {
              // Score might not be available yet
              console.log(
                `Score not available for submission ${submissionId}:`,
                e
              );
            }

            submissionList.push({
              submissionId,
              examId,
              submittedAt,
              examTitle,
              scoreHandle,
              isDecrypted: false,
              isDecrypting: false,
            });
          }
        }

        // Sort by submission time (newest first)
        submissionList.sort((a, b) => {
          if (a.submittedAt > b.submittedAt) return -1;
          if (a.submittedAt < b.submittedAt) return 1;
          return 0;
        });

        setSubmissions(submissionList);
      } catch (e) {
        console.error("Failed to load submissions:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected,
    accounts,
    cogniSeal.contractAddress,
    cogniSeal.isDeployed,
    ethersReadonlyProvider,
    cogniSeal.abi,
  ]);

  const handleDecryptScore = async (
    submissionId: bigint,
    examId: bigint,
    scoreHandle: string
  ) => {
    if (!fhevmInstance || !ethersSigner || !cogniSeal.contractAddress) {
      return;
    }

    const submissionKey = `${submissionId}`;
    setDecryptingIds((prev) => new Set(prev).add(submissionKey));

    try {
      // Get decryption signature
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [cogniSeal.contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        console.error("Failed to get decryption signature");
        return;
      }

      // Decrypt score
      const res = await fhevmInstance.userDecrypt(
        [
          {
            handle: scoreHandle,
            contractAddress: cogniSeal.contractAddress,
          },
        ],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedValue = res[scoreHandle as keyof typeof res];
      if (decryptedValue !== undefined) {
        const score = Number(decryptedValue);

        // Update submission with decrypted score
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.submissionId === submissionId
              ? {
                  ...sub,
                  clearScore: score,
                  isDecrypted: true,
                  isDecrypting: false,
                }
              : sub
          )
        );
      }
    } catch (e) {
      console.error(`Failed to decrypt score for submission ${submissionId}:`, e);
    } finally {
      setDecryptingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(submissionKey);
        return newSet;
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">My Results</h1>
        <p className="text-muted-foreground mb-4">
          Please connect your wallet to view your submission results.
        </p>
        <button
          onClick={connect}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (cogniSeal.isDeployed === false) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">My Results</h1>
        <p className="text-muted-foreground">
          CogniSeal contract is not deployed on this network.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              My Results
            </h1>
            <p className="text-muted-foreground text-lg">View all your exam submissions and scores</p>
          </div>
          <Link
            href="/exams"
            className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 font-medium"
          >
            ← Back to Exams
          </Link>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading your submissions...</span>
            </div>
          </div>
        )}

        {!isLoading && submissions.length === 0 && (
          <div className="p-12 bg-card/50 backdrop-blur-sm rounded-2xl border border-border text-center shadow-lg">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">No submissions yet</p>
            <p className="text-muted-foreground mb-8">
              You haven&apos;t submitted any exams yet.
            </p>
            <Link
              href="/exams"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Browse Exams
            </Link>
          </div>
        )}

        {!isLoading && submissions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">
                {submissions.length} {submissions.length === 1 ? "submission" : "submissions"}
              </span>
            </div>

            <div className="grid gap-6">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.submissionId.toString()}
                  submission={submission}
                  onDecrypt={handleDecryptScore}
                  isDecrypting={decryptingIds.has(submission.submissionId.toString())}
                  cogniSeal={cogniSeal}
                  ethersReadonlyProvider={ethersReadonlyProvider}
                  ethersSigner={ethersSigner}
                  accounts={accounts as readonly `0x${string}`[] | undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({
  submission,
  onDecrypt,
  isDecrypting,
  cogniSeal,
  ethersReadonlyProvider,
  ethersSigner,
  accounts,
}: {
  submission: SubmissionResult;
  onDecrypt: (
    submissionId: bigint,
    examId: bigint,
    scoreHandle: string
  ) => Promise<void>;
  isDecrypting: boolean;
  cogniSeal: ReturnType<typeof useCogniSeal>;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  ethersSigner: ethers.Signer | undefined;
  accounts: readonly `0x${string}`[] | undefined;
}) {
  const [examInfo, setExamInfo] = useState<{
    passingScore: number;
    questionCount: number;
  } | null>(null);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  useEffect(() => {
    const loadExamInfo = async () => {
      if (!cogniSeal.contractAddress || !cogniSeal.abi) return;

      if (!ethersReadonlyProvider) return;

      try {
        const contract = new ethers.Contract(
          cogniSeal.contractAddress,
          cogniSeal.abi,
          ethersReadonlyProvider
        );
        const info = await contract.getExamInfo(submission.examId);
        setExamInfo({
          passingScore: Number(info[3]),
          questionCount: Number(info[2]),
        });
      } catch (e) {
        console.error(`Failed to load exam info:`, e);
      }
    };

    loadExamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.examId, cogniSeal.contractAddress, cogniSeal.abi, ethersReadonlyProvider]);

  // Check if user has certificate for this exam
  useEffect(() => {
    const checkCertificate = async () => {
      if (
        !cogniSeal.contractAddress ||
        !cogniSeal.abi ||
        !ethersReadonlyProvider ||
        !accounts ||
        accounts.length === 0
      ) {
        return;
      }

      try {
        const contract = new ethers.Contract(
          cogniSeal.contractAddress,
          cogniSeal.abi,
          ethersReadonlyProvider
        );
        const hasCert = await contract.hasCertificate(
          accounts[0],
          submission.examId
        );
        setHasCertificate(hasCert);
      } catch (e) {
        console.error(`Failed to check certificate:`, e);
      }
    };

    checkCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    submission.examId,
    cogniSeal.contractAddress,
    cogniSeal.abi,
    ethersReadonlyProvider,
    accounts,
  ]);

  const handleMintCertificate = async () => {
    if (
      !submission.clearScore ||
      !cogniSeal.contractAddress ||
      !cogniSeal.abi ||
      !ethersSigner
    ) {
      return;
    }

    setIsMinting(true);
    try {
      const contract = new ethers.Contract(
        cogniSeal.contractAddress,
        cogniSeal.abi,
        ethersSigner
      );

      const tx = await contract.mintCertificate(
        submission.submissionId,
        submission.examId,
        submission.clearScore,
        "0x"
      );
      await tx.wait();
      
      // Refresh certificate status
      setHasCertificate(true);
      console.log(`Certificate minted! tx: ${tx.hash}`);
    } catch (e) {
      console.error(`Failed to mint certificate:`, e);
    } finally {
      setIsMinting(false);
    }
  };

  const submittedDate = new Date(Number(submission.submittedAt) * 1000);

  return (
    <div className="group p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {submission.examTitle}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-mono">ID: {submission.submissionId.toString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{submittedDate.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/exams/${submission.examId}`}
          className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 font-medium flex items-center gap-1"
        >
          View Exam
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {submission.scoreHandle ? (
        submission.isDecrypted && submission.clearScore !== undefined ? (
          <div className="mt-6 space-y-4">
            <div className={`p-6 rounded-xl border-2 ${
              examInfo && submission.clearScore >= examInfo.passingScore
                ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-500"
                : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-500"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-4xl font-bold mb-2 ${
                    examInfo && submission.clearScore >= examInfo.passingScore
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}>
                    {submission.clearScore} / {examInfo?.questionCount ?? "?"}
                  </p>
                  {examInfo && (
                    <p className={`text-sm font-medium ${
                      examInfo && submission.clearScore >= examInfo.passingScore
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      Passing Score: {examInfo.passingScore}
                    </p>
                  )}
                </div>
                {examInfo &&
                  submission.clearScore >= examInfo.passingScore ? (
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
              </div>
            </div>

            {/* Show Mint Certificate button if passed and no certificate yet */}
            {examInfo &&
              submission.clearScore >= examInfo.passingScore &&
              hasCertificate === false && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleMintCertificate}
                    disabled={isMinting}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isMinting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Minting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Mint Certificate
                      </>
                    )}
                  </button>
                  <Link
                    href="/certificates"
                    className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 text-center font-semibold shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                  >
                    View Certificates
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

            {/* Show certificate badge if already minted */}
            {hasCertificate === true && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                      ✓ Certificate Already Minted
                    </p>
                    <Link
                      href="/certificates"
                      className="text-sm text-green-600 dark:text-green-400 hover:underline mt-1 inline-block"
                    >
                      View Certificate →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={() =>
                onDecrypt(
                  submission.submissionId,
                  submission.examId,
                  submission.scoreHandle!
                )
              }
              disabled={isDecrypting}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex items-center gap-2"
            >
              {isDecrypting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        )
      ) : (
        <div className="mt-4 p-4 bg-muted/50 backdrop-blur-sm rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Score not available yet. The exam may still be grading.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

