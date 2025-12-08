"use client";

import Link from "next/link";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export function Navigation() {
  const { isConnected, accounts, connect, chainId } = useMetaMaskEthersSigner();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId: number | undefined) => {
    if (!chainId) return "Unknown";
    if (chainId === 31337) return "Hardhat";
    if (chainId === 11155111) return "Sepolia";
    return `Chain ${chainId}`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold text-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              CogniSeal
            </Link>
            <div className="hidden md:flex gap-1">
              <Link
                href="/exams"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
              >
                Browse Exams
              </Link>
              <Link
                href="/exams/create"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
              >
                Create Exam
              </Link>
              {isConnected && (
                <>
                  <Link
                    href="/results"
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
                  >
                    My Results
                  </Link>
                  <Link
                    href="/certificates"
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
                  >
                    My Certificates
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && accounts && accounts.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-foreground">{formatAddress(accounts[0])}</span>
                <span className="text-muted-foreground">({getChainName(chainId)})</span>
              </div>
            )}
            <button
              onClick={connect}
              disabled={isConnected}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md disabled:hover:shadow-sm"
            >
              {isConnected ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Connected
                </span>
              ) : (
                "Connect Wallet"
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


