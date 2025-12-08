"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { CogniSealAddresses } from "@/abi/CogniSealAddresses";
import { CogniSealABI } from "@/abi/CogniSealABI";

type CogniSealInfoType = {
  abi: typeof CogniSealABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getCogniSealByChainId(
  chainId: number | undefined
): CogniSealInfoType {
  if (!chainId) {
    return { abi: CogniSealABI.abi };
  }

  const entry =
    CogniSealAddresses[chainId.toString() as keyof typeof CogniSealAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: CogniSealABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: CogniSealABI.abi,
  };
}

export type ExamInfo = {
  title: string;
  description: string;
  questionCount: number;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  cooldownMinutes: number;
  isActive: boolean;
  createdAt: bigint;
};

export type QuestionInfo = {
  questionText: string;
  questionType: number; // 0 = MultipleChoice, 1 = FillInBlank
};

export type AttemptInfo = {
  attemptCount: number;
  lastAttemptTime: bigint;
  canAttempt: boolean;
  cooldownEndTime: bigint;
};

export type ClearScoreType = {
  handle: string;
  clear: number;
};

export const useCogniSeal = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [examCount, setExamCount] = useState<bigint | undefined>(undefined);
  const [examInfo, setExamInfo] = useState<ExamInfo | undefined>(undefined);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [attemptInfo, setAttemptInfo] = useState<AttemptInfo | undefined>(
    undefined
  );
  const [scoreHandle, setScoreHandle] = useState<string | undefined>(undefined);
  const [clearScore, setClearScore] = useState<ClearScoreType | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const cogniSealRef = useRef<CogniSealInfoType | undefined>(undefined);
  const clearScoreRef = useRef<ClearScoreType | undefined>(undefined);
  const isLoadingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const cogniSeal = useMemo(() => {
    const c = getCogniSealByChainId(chainId);
    cogniSealRef.current = c;

    // Only set error message if chainId is defined but deployment not found
    if (chainId !== undefined && !c.address) {
      setMessage(`CogniSeal deployment not found for chainId=${chainId}.`);
    } else if (chainId === undefined) {
      // Clear message during initialization
      setMessage("");
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!cogniSeal) {
      return undefined;
    }
    return (
      Boolean(cogniSeal.address) && cogniSeal.address !== ethers.ZeroAddress
    );
  }, [cogniSeal]);

  const canGetExamCount = useMemo(() => {
    return cogniSeal.address && ethersReadonlyProvider && !isLoading;
  }, [cogniSeal.address, ethersReadonlyProvider, isLoading]);

  const refreshExamCount = useCallback(() => {
    if (isLoadingRef.current) {
      return;
    }

    if (
      !cogniSealRef.current ||
      !cogniSealRef.current?.chainId ||
      !cogniSealRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setExamCount(undefined);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const thisChainId = cogniSealRef.current.chainId;
    const thisCogniSealAddress = cogniSealRef.current.address;

    const thisCogniSealContract = new ethers.Contract(
      thisCogniSealAddress,
      cogniSealRef.current.abi,
      ethersReadonlyProvider
    );

    thisCogniSealContract
      .getExamCount()
      .then((value: bigint) => {
        console.log("[useCogniSeal] getExamCount()=" + value);
        if (
          sameChain.current(thisChainId) &&
          thisCogniSealAddress === cogniSealRef.current?.address
        ) {
          setExamCount(value);
        }

        isLoadingRef.current = false;
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        setMessage("CogniSeal.getExamCount() call failed! error=" + e);
        isLoadingRef.current = false;
        setIsLoading(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshExamCount();
  }, [refreshExamCount]);

  const getExamInfo = useCallback(
    async (examId: bigint) => {
      if (!cogniSeal.address || !ethersReadonlyProvider) {
        return;
      }

      const contract = new ethers.Contract(
        cogniSeal.address,
        cogniSeal.abi,
        ethersReadonlyProvider
      );

      try {
        const info = await contract.getExamInfo(examId);
        setExamInfo({
          title: info[0],
          description: info[1],
          questionCount: Number(info[2]),
          passingScore: Number(info[3]),
          timeLimitMinutes: Number(info[4]),
          maxAttempts: Number(info[5]),
          cooldownMinutes: Number(info[6]),
          isActive: info[7],
          createdAt: info[8],
        });
      } catch (e) {
        setMessage("getExamInfo() failed! error=" + e);
      }
    },
    [cogniSeal.address, cogniSeal.abi, ethersReadonlyProvider]
  );

  const getQuestions = useCallback(
    async (examId: bigint) => {
      if (!cogniSeal.address || !ethersReadonlyProvider || !examInfo) {
        return;
      }

      const contract = new ethers.Contract(
        cogniSeal.address,
        cogniSeal.abi,
        ethersReadonlyProvider
      );

      const questionList: QuestionInfo[] = [];
      for (let i = 0; i < examInfo.questionCount; i++) {
        try {
          const [questionText, questionType] = await contract.getQuestion(
            examId,
            i
          );
          questionList.push({
            questionText,
            questionType: Number(questionType),
          });
        } catch (e) {
          setMessage(`getQuestion(${i}) failed! error=` + e);
          break;
        }
      }
      setQuestions(questionList);
    },
    [cogniSeal.address, cogniSeal.abi, ethersReadonlyProvider, examInfo]
  );

  const getAttemptInfo = useCallback(
    async (examId: bigint, examineeAddress: `0x${string}`) => {
      if (!cogniSeal.address || !ethersReadonlyProvider) {
        return;
      }

      const contract = new ethers.Contract(
        cogniSeal.address,
        cogniSeal.abi,
        ethersReadonlyProvider
      );

      try {
        const info = await contract.getAttemptInfo(examineeAddress, examId);
        setAttemptInfo({
          attemptCount: Number(info[0]),
          lastAttemptTime: info[1],
          canAttempt: info[2],
          cooldownEndTime: info[3],
        });
      } catch (e) {
        setMessage("getAttemptInfo() failed! error=" + e);
      }
    },
    [cogniSeal.address, cogniSeal.abi, ethersReadonlyProvider]
  );

  const createExam = useCallback(
    async (
      title: string,
      description: string,
      questionTexts: string[],
      questionTypes: number[],
      correctAnswers: (string | number)[],
      passingScore: number,
      timeLimitMinutes: number,
      maxAttempts: number,
      cooldownMinutes: number
    ) => {
      if (
        isSubmittingRef.current ||
        !cogniSeal.address ||
        !instance ||
        !ethersSigner
      ) {
        return;
      }

      const thisChainId = chainId;
      const thisCogniSealAddress = cogniSeal.address;
      const thisEthersSigner = ethersSigner;
      const thisCogniSealContract = new ethers.Contract(
        thisCogniSealAddress,
        cogniSeal.abi,
        thisEthersSigner
      );

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting answers...");

      const run = async () => {
        const isStale = () =>
          thisCogniSealAddress !== cogniSealRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const encryptedAnswers: string[] = [];
          const inputProofs: string[] = [];

          for (let i = 0; i < correctAnswers.length; i++) {
            const input = instance.createEncryptedInput(
              thisCogniSealAddress,
              thisEthersSigner.address
            );

            if (questionTypes[i] === 0) {
              // MultipleChoice: encrypt option number directly
              const optionNumber = Number(correctAnswers[i]);
              input.add32(optionNumber);
            } else {
              // FillInBlank: hash the answer first, then encrypt hash
              const answerString = String(correctAnswers[i]);
              const hash = ethers.keccak256(ethers.toUtf8Bytes(answerString));
              const hashNumber = BigInt(hash.slice(0, 10));
              input.add32(Number(hashNumber));
            }

            const enc = await input.encrypt();
            encryptedAnswers.push(ethers.hexlify(enc.handles[0]));
            inputProofs.push(ethers.hexlify(enc.inputProof));
          }

          if (isStale()) {
            setMessage("Ignore exam creation");
            return;
          }

          setMessage("Submitting exam creation transaction...");

          const tx = await thisCogniSealContract.createExam(
            title,
            description,
            questionTexts,
            questionTypes,
            encryptedAnswers,
            inputProofs,
            passingScore,
            timeLimitMinutes,
            maxAttempts,
            cooldownMinutes
          );

          setMessage(`Wait for tx:${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Exam created! tx:${tx.hash}`);

          if (isStale()) {
            setMessage("Ignore exam creation");
            return;
          }

          refreshExamCount();
        } catch (e) {
          setMessage(`Exam creation failed! error=${e}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      cogniSeal.address,
      cogniSeal.abi,
      instance,
      chainId,
      refreshExamCount,
      sameChain,
      sameSigner,
    ]
  );

  const submitAnswers = useCallback(
    async (examId: bigint, answers: (string | number)[]): Promise<bigint | undefined> => {
      if (
        isSubmittingRef.current ||
        !cogniSeal.address ||
        !instance ||
        !ethersSigner ||
        !examInfo
      ) {
        return;
      }

      if (answers.length !== examInfo.questionCount) {
        setMessage("Answers count mismatch");
        return;
      }

      const thisChainId = chainId;
      const thisCogniSealAddress = cogniSeal.address;
      const thisEthersSigner = ethersSigner;
      const thisCogniSealContract = new ethers.Contract(
        thisCogniSealAddress,
        cogniSeal.abi,
        thisEthersSigner
      );

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting answers...");

      const run = async () => {
        const isStale = () =>
          thisCogniSealAddress !== cogniSealRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const encryptedAnswers: string[] = [];
          const inputProofs: string[] = [];

          for (let i = 0; i < answers.length; i++) {
            const input = instance.createEncryptedInput(
              thisCogniSealAddress,
              thisEthersSigner.address
            );

            if (questions[i]?.questionType === 0) {
              // MultipleChoice: encrypt option number
              const optionNumber = Number(answers[i]);
              input.add32(optionNumber);
            } else {
              // FillInBlank: hash then encrypt
              const answerString = String(answers[i]);
              const hash = ethers.keccak256(ethers.toUtf8Bytes(answerString));
              const hashNumber = BigInt(hash.slice(0, 10));
              input.add32(Number(hashNumber));
            }

            const enc = await input.encrypt();
            encryptedAnswers.push(ethers.hexlify(enc.handles[0]));
            inputProofs.push(ethers.hexlify(enc.inputProof));
          }

          if (isStale()) {
            setMessage("Ignore answer submission");
            return;
          }

          setMessage("Submitting answers...");

          const tx = await thisCogniSealContract.submitAnswers(
            examId,
            encryptedAnswers,
            inputProofs
          );

          setMessage(`Wait for tx:${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Answers submitted! tx:${tx.hash}`);

          if (isStale()) {
            setMessage("Ignore answer submission");
            return;
          }

          // Get submission ID from event
          const submissionEvent = receipt?.logs.find(
            (log: { topics: string[] }) =>
              log.topics[0] ===
              ethers.id("AnswersSubmitted(uint256,uint256,address,uint256)")
          );

          if (submissionEvent) {
            try {
              const decoded = thisCogniSealContract.interface.parseLog({
                topics: submissionEvent.topics as string[],
                data: submissionEvent.data,
              });
              const submissionId = decoded?.args[0] as bigint;
              return submissionId;
            } catch (e) {
              setMessage(`Failed to parse submission event: ${e}`);
            }
          }
          
          return undefined;
        } catch (e) {
          setMessage(`Answer submission failed! error=${e}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      cogniSeal.address,
      cogniSeal.abi,
      instance,
      chainId,
      examInfo,
      questions,
      sameChain,
      sameSigner,
    ]
  );

  const getSubmissionScore = useCallback(
    async (submissionId: bigint) => {
      if (!cogniSeal.address || !ethersReadonlyProvider) {
        return;
      }

      const contract = new ethers.Contract(
        cogniSeal.address,
        cogniSeal.abi,
        ethersReadonlyProvider
      );

      try {
        const encryptedScore = await contract.getSubmissionScore(submissionId);
        setScoreHandle(encryptedScore);
      } catch (e) {
        setMessage("getSubmissionScore() failed! error=" + e);
      }
    },
    [cogniSeal.address, cogniSeal.abi, ethersReadonlyProvider]
  );

  const decryptScore = useCallback(() => {
    if (isDecryptingRef.current || !instance || !ethersSigner || !scoreHandle) {
      return;
    }

    if (scoreHandle === clearScoreRef.current?.handle) {
      return;
    }

    if (!cogniSeal.address) {
      return;
    }

    const thisChainId = chainId;
    const thisCogniSealAddress = cogniSeal.address;
    const thisScoreHandle = scoreHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Requesting decryption authorization...");

    const run = async () => {
      const isStale = () =>
        thisCogniSealAddress !== cogniSealRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [thisCogniSealAddress],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Decrypting score...");

        const res = await instance.userDecrypt(
          [
            {
              handle: thisScoreHandle,
              contractAddress: thisCogniSealAddress,
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

        setMessage("Score decrypted!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        const decryptedValue = res[thisScoreHandle as keyof typeof res];
        if (decryptedValue !== undefined) {
          const scoreValue = Number(decryptedValue);
          setClearScore({
            handle: thisScoreHandle,
            clear: scoreValue,
          });
          clearScoreRef.current = {
            handle: thisScoreHandle,
            clear: scoreValue,
          };
          setMessage(`Score: ${scoreValue}`);
        } else {
          setMessage("Failed to decrypt score");
        }
      } catch (e) {
        setMessage(`Decryption failed! error=${e}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    cogniSeal.address,
    instance,
    scoreHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const mintCertificate = useCallback(
    async (submissionId: bigint, examId: bigint, decryptedScore: number) => {
      if (!cogniSeal.address || !ethersSigner || !clearScore) {
        return;
      }

      const contract = new ethers.Contract(
        cogniSeal.address,
        cogniSeal.abi,
        ethersSigner
      );

      try {
        setMessage("Minting certificate...");
        const tx = await contract.mintCertificate(
          submissionId,
          examId,
          decryptedScore,
          "0x"
        );
        await tx.wait();
        setMessage(`Certificate minted! tx:${tx.hash}`);
      } catch (e) {
        setMessage(`Certificate minting failed! error=${e}`);
      }
    },
    [cogniSeal.address, cogniSeal.abi, ethersSigner, clearScore]
  );

  return {
    contractAddress: cogniSeal.address,
    abi: cogniSeal.abi,
    isDeployed,
    canGetExamCount,
    examCount,
    examInfo,
    questions,
    attemptInfo,
    scoreHandle,
    clearScore,
    isLoading,
    isDecrypting,
    isSubmitting,
    message,
    refreshExamCount,
    getExamInfo,
    getQuestions,
    getAttemptInfo,
    createExam,
    submitAnswers,
    getSubmissionScore,
    decryptScore,
    mintCertificate,
  };
};

