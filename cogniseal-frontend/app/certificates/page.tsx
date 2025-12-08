"use client";

import { useEffect, useState } from "react";
import { useCogniSeal } from "@/hooks/useCogniSeal";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { ethers } from "ethers";
import Link from "next/link";

export default function CertificatesPage() {
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

  const [certificates, setCertificates] = useState<
    Array<{ examId: bigint; hasCertificate: boolean }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (
      !isConnected ||
      !cogniSeal.isDeployed ||
      !cogniSeal.contractAddress ||
      !ethersReadonlyProvider ||
      !accounts ||
      !cogniSeal.abi
    ) {
      return;
    }

    const loadCertificates = async () => {
      setIsLoading(true);
      try {
        const contract = new ethers.Contract(
          cogniSeal.contractAddress!,
          cogniSeal.abi,
          ethersReadonlyProvider
        );

        console.log("[CertificatesPage] Loading certificates for:", accounts[0]);
        console.log("[CertificatesPage] Contract address:", cogniSeal.contractAddress);

        // Method 1: Query CertificateMinted events (more efficient)
        const filter = contract.filters.CertificateMinted(
          null, // examId
          accounts[0] // examinee (indexed)
        );

        console.log("[CertificatesPage] Querying CertificateMinted events...");
        const events = await contract.queryFilter(filter, 0);
        console.log("[CertificatesPage] Found", events.length, "CertificateMinted events");

        const certSet = new Set<string>();

        for (const event of events) {
          if ('args' in event && event.args) {
            const examId = event.args[0] as bigint;
            console.log("[CertificatesPage] Found certificate for exam:", examId.toString());
            certSet.add(examId.toString());
          }
        }

        // Method 2: Also check by querying examCount and hasCertificate
        // This ensures we don't miss any certificates
        try {
          console.log("[CertificatesPage] Querying examCount...");
          const examCount = await contract.getExamCount();
          const examCountNum = Number(examCount);
          console.log("[CertificatesPage] Total exams:", examCountNum);

          for (let i = 1; i <= examCountNum; i++) {
            try {
              const hasCert = await contract.hasCertificate(
                accounts[0],
                BigInt(i)
              );
              if (hasCert) {
                console.log("[CertificatesPage] Found certificate via hasCertificate for exam:", i);
                certSet.add(BigInt(i).toString());
              }
            } catch (e) {
              // Exam might not exist, skip
              console.log(`[CertificatesPage] Exam ${i} might not exist:`, e);
            }
          }
        } catch (e) {
          console.error("[CertificatesPage] Failed to get exam count:", e);
        }

        // Convert set to array
        const certList: Array<{ examId: bigint; hasCertificate: boolean }> =
          Array.from(certSet).map((examIdStr) => ({
            examId: BigInt(examIdStr),
            hasCertificate: true,
          }));

        console.log("[CertificatesPage] Total certificates found:", certList.length);

        // Sort by examId
        certList.sort((a, b) => {
          if (a.examId > b.examId) return 1;
          if (a.examId < b.examId) return -1;
          return 0;
        });

        setCertificates(certList);
      } catch (e) {
        console.error("[CertificatesPage] Failed to load certificates:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected,
    cogniSeal.isDeployed,
    cogniSeal.contractAddress,
    cogniSeal.abi,
    ethersReadonlyProvider,
    accounts,
    refreshKey,
  ]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">My Certificates</h1>
        <p className="text-muted-foreground mb-4">
          Please connect your wallet to view your certificates.
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
        <h1 className="text-3xl font-bold mb-6">My Certificates</h1>
        <p className="text-muted-foreground">
          CogniSeal contract is not deployed on this network.
        </p>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              My Certificates
            </h1>
            <p className="text-muted-foreground text-lg">Your proof of competence achievements</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-card border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            )}
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading certificates...</span>
            </div>
          </div>
        )}

        {!isLoading && certificates.length === 0 && (
          <div className="p-12 bg-card/50 backdrop-blur-sm rounded-2xl border border-border text-center shadow-lg">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">No certificates yet</p>
            <p className="text-muted-foreground mb-8">
              Pass an exam to earn a certificate!
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

        {!isLoading && certificates.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-sm font-medium">
                {certificates.length} {certificates.length === 1 ? "certificate" : "certificates"}
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <CertificateCard
                  key={Number(cert.examId)}
                  examId={cert.examId}
                  cogniSeal={cogniSeal}
                  ethersReadonlyProvider={ethersReadonlyProvider}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CertificateCard({
  examId,
  cogniSeal,
  ethersReadonlyProvider,
}: {
  examId: bigint;
  cogniSeal: ReturnType<typeof useCogniSeal>;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [examInfo, setExamInfo] = useState<{
    title: string;
    description: string;
    passingScore: number;
    questionCount: number;
  } | null>(null);

  useEffect(() => {
    const loadExamInfo = async () => {
      if (
        !cogniSeal.contractAddress ||
        !cogniSeal.abi ||
        !ethersReadonlyProvider
      ) {
        return;
      }

      setIsLoading(true);
      try {
        const contract = new ethers.Contract(
          cogniSeal.contractAddress,
          cogniSeal.abi,
          ethersReadonlyProvider
        );
        const info = await contract.getExamInfo(examId);
        setExamInfo({
          title: info[0],
          description: info[1],
          passingScore: Number(info[3]),
          questionCount: Number(info[2]),
        });
      } catch (e) {
        console.error(`Failed to load exam info for ${examId}:`, e);
      } finally {
        setIsLoading(false);
      }
    };

    loadExamInfo();
  }, [examId, cogniSeal.contractAddress, cogniSeal.abi, ethersReadonlyProvider]);

  if (isLoading || !examInfo) {
    return (
      <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/50 rounded w-3/4"></div>
          <div className="h-4 bg-muted/50 rounded w-full"></div>
          <div className="h-4 bg-muted/50 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-8 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
              {examInfo.title}
            </h3>
            <p className="text-sm font-medium text-primary mb-4">
              Certificate of Completion
            </p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border/50">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Passing Score:</span>
              <span className="font-semibold">{examInfo.passingScore}/{examInfo.questionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Exam ID:</span>
              <span className="font-mono font-medium">#{Number(examId)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
