"use client";

import { useEffect, useState, useRef } from "react";
import { useCogniSeal } from "@/hooks/useCogniSeal";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import Link from "next/link";
import { ethers } from "ethers";

export default function ExamsPage() {
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
    error: fhevmError,
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

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isConnected && cogniSeal.canGetExamCount && !cogniSeal.isLoading && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      cogniSeal.refreshExamCount();
    }
    // Reset when disconnected
    if (!isConnected) {
      hasLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, cogniSeal.canGetExamCount, cogniSeal.isDeployed]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">Browse Exams</h1>
        <p className="text-muted-foreground mb-4">
          Please connect your wallet to browse exams.
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
        <h1 className="text-3xl font-bold mb-6">Browse Exams</h1>
        <p className="text-muted-foreground">
          CogniSeal contract is not deployed on this network (chainId: {chainId}
          ).
        </p>
      </div>
    );
  }

  // getExamCount returns _nextExamId - 1, so if there's 1 exam, it returns 1, and examId is 1
  const examCount = cogniSeal.examCount
    ? Number(cogniSeal.examCount)
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Browse Exams
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover and take encrypted exams to prove your competence
          </p>
        </div>

        {cogniSeal.isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading exams...</span>
            </div>
          </div>
        )}

        {examCount !== undefined && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">
                  {examCount} {examCount === 1 ? "exam" : "exams"} available
                </span>
              </div>
            </div>

            {examCount === 0 ? (
              <div className="p-12 bg-card/50 backdrop-blur-sm rounded-2xl border border-border text-center shadow-lg">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">No exams available yet</p>
                <p className="text-muted-foreground mb-6">Be the first to create an exam!</p>
                <Link
                  href="/exams/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Exam
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: examCount }, (_, i) => {
                  const examId = i + 1;
                  return (
                    <ExamCard
                      key={examId}
                      examId={BigInt(examId)}
                      contractAddress={cogniSeal.contractAddress}
                      abi={cogniSeal.abi}
                      ethersReadonlyProvider={ethersReadonlyProvider}
                      isDeployed={cogniSeal.isDeployed}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {cogniSeal.message && cogniSeal.message.trim() !== "" && (
          <div className="mt-6 p-4 bg-muted/50 backdrop-blur-sm rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">{cogniSeal.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({
  examId,
  contractAddress,
  abi,
  ethersReadonlyProvider,
  isDeployed,
}: {
  examId: bigint;
  contractAddress: `0x${string}` | undefined;
  abi: typeof import("@/abi/CogniSealABI").CogniSealABI.abi;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  isDeployed: boolean | undefined;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examInfo, setExamInfo] = useState<{
    title: string;
    description: string;
    questionCount: number;
    passingScore: number;
    timeLimitMinutes: number;
    maxAttempts: number;
    cooldownMinutes: number;
    isActive: boolean;
    createdAt: bigint;
  } | null>(null);
  const hasLoadedRef = useRef<string | null>(null);
  const loadingRef = useRef<boolean>(false);
  const propsRef = useRef({ contractAddress, isDeployed, ethersReadonlyProvider, abi });

  // Update props ref when props change (but don't trigger useEffect)
  useEffect(() => {
    propsRef.current = { contractAddress, isDeployed, ethersReadonlyProvider, abi };
  }, [contractAddress, isDeployed, ethersReadonlyProvider, abi]);

  useEffect(() => {
    // Use examId as the key to prevent re-loading when other props change
    const examIdKey = `${examId}`;
    const currentProps = propsRef.current;
    
    // Check if we've already loaded this specific exam or currently loading
    if (
      hasLoadedRef.current === examIdKey ||
      loadingRef.current ||
      !currentProps.contractAddress ||
      !currentProps.isDeployed ||
      !currentProps.ethersReadonlyProvider ||
      !currentProps.abi
    ) {
      console.log(`[ExamCard] Skipping load for exam ${examId}:`, {
        hasLoaded: hasLoadedRef.current === examIdKey,
        loading: loadingRef.current,
        hasContract: !!currentProps.contractAddress,
        isDeployed: currentProps.isDeployed,
      });
      return;
    }

    let cancelled = false;
    const thisExamIdKey = examIdKey; // Capture examIdKey for cleanup
    hasLoadedRef.current = examIdKey;
    loadingRef.current = true;
    console.log(`[ExamCard] Starting load for exam ${examId}, examIdKey=${examIdKey}`);

    const loadExamInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use current props from ref to avoid stale closure
        const props = propsRef.current;
        console.log(`[ExamCard] Loading exam ${examId} from ${props.contractAddress}`);
        console.log(`[ExamCard] Provider:`, props.ethersReadonlyProvider);
        console.log(`[ExamCard] ABI length:`, props.abi.length);
        
        if (!props.contractAddress || !props.ethersReadonlyProvider || !props.abi) {
          throw new Error("Missing required parameters");
        }

        const contract = new ethers.Contract(
          props.contractAddress,
          props.abi,
          props.ethersReadonlyProvider
        );

        console.log(`[ExamCard] Calling getExamInfo(${examId})...`);
        const info = await contract.getExamInfo(examId);
        console.log(`[ExamCard] Exam ${examId} loaded successfully:`, info);
        
        // Check cancelled flag AFTER async operation
        if (cancelled) {
          console.log(`[ExamCard] Component cancelled after load, skipping state update for exam ${examId}`);
          return;
        }

        const examData = {
          title: String(info[0]),
          description: String(info[1]),
          questionCount: Number(info[2]),
          passingScore: Number(info[3]),
          timeLimitMinutes: Number(info[4]),
          maxAttempts: Number(info[5]),
          cooldownMinutes: Number(info[6]),
          isActive: Boolean(info[7]),
          createdAt: BigInt(info[8]),
        };
        console.log(`[ExamCard] Setting examInfo for exam ${examId}:`, examData);
        setExamInfo(examData);
        setIsLoading(false);
        setError(null);
        loadingRef.current = false;
        console.log(`[ExamCard] examInfo state updated for exam ${examId}`);
      } catch (e: unknown) {
        // Check cancelled flag AFTER async operation
        if (cancelled) {
          console.log(`[ExamCard] Component cancelled after error, skipping error state update for exam ${examId}`);
          return;
        }

        let errorMessage = "Unknown error";
        if (e instanceof Error) {
          errorMessage = e.message;
          // Check for common error patterns
          if (e.message.includes("Exam does not exist")) {
            errorMessage = `Exam ${examId.toString()} does not exist`;
          } else if (e.message.includes("Failed to fetch")) {
            errorMessage = "Network error: Failed to connect to blockchain";
          } else if (e.message.includes("user rejected")) {
            errorMessage = "Transaction rejected by user";
          }
        } else if (typeof e === "string") {
          errorMessage = e;
        } else {
          errorMessage = JSON.stringify(e);
        }
        console.error(`[ExamCard] Failed to load exam ${examId}:`, e);
        setError(errorMessage);
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadExamInfo();

    return () => {
      // Only cancel if examId actually changed
      const currentExamIdKey = hasLoadedRef.current;
      if (currentExamIdKey !== thisExamIdKey) {
        // examId changed, cancel the operation
        console.log(`[ExamCard] Cleanup: examId changed from ${thisExamIdKey} to ${currentExamIdKey}, cancelling`);
        cancelled = true;
        loadingRef.current = false;
      } else {
        // Same examId, this is just a re-render or props update - don't cancel
        console.log(`[ExamCard] Cleanup: same examId ${thisExamIdKey}, NOT cancelling (props update)`);
        // Don't set cancelled = true, keep the loading state
      }
    };
  }, [examId]); // Only depend on examId to prevent unnecessary re-runs

  // Debug logging
  useEffect(() => {
    console.log(`[ExamCard] Render for exam ${examId}:`, {
      isLoading,
      hasExamInfo: !!examInfo,
      examInfoTitle: examInfo?.title,
      error,
    });
  }, [examId, isLoading, examInfo, error]);

  if (error) {
    return (
      <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-destructive/50 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-destructive mb-1">Failed to load exam {examId.toString()}</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/50 rounded w-3/4"></div>
          <div className="h-4 bg-muted/50 rounded w-full"></div>
          <div className="h-4 bg-muted/50 rounded w-2/3"></div>
          <div className="h-10 bg-muted/50 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!examInfo) {
    return (
      <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
        <p className="text-sm text-muted-foreground">Loading exam data...</p>
      </div>
    );
  }

  return (
    <div className="group p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
            {examInfo.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {examInfo.description}
          </p>
        </div>
        <div className="ml-4 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-muted-foreground">{examInfo.questionCount} questions</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-muted-foreground">Pass: {examInfo.passingScore}/{examInfo.questionCount}</span>
        </div>
      </div>
      
      <Link
        href={`/exams/${examId}`}
        className="block w-full text-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-sm hover:shadow-md group-hover:scale-[1.02]"
      >
        Take Exam →
      </Link>
    </div>
  );
}
