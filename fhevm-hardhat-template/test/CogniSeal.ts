import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { CogniSeal, CogniSeal__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  examiner: HardhatEthersSigner;
  examinee: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CogniSeal")) as CogniSeal__factory;
  const cogniSealContract = (await factory.deploy()) as CogniSeal;
  const cogniSealContractAddress = await cogniSealContract.getAddress();

  return { cogniSealContract, cogniSealContractAddress };
}

describe("CogniSeal", function () {
  let signers: Signers;
  let cogniSealContract: CogniSeal;
  let cogniSealContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      examiner: ethSigners[1],
      examinee: ethSigners[2],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cogniSealContract, cogniSealContractAddress } = await deployFixture());
  });

  describe("Exam Creation", function () {
    it("should create an exam with encrypted answers", async function () {
      const title = "Basic Math Test";
      const description = "A simple math test";
      const questionTexts = ["What is 2 + 2?", "What is 3 * 3?"];
      const questionTypes = [0, 0]; // Both MultipleChoice
      const correctAnswers = [4, 9]; // Option 4 and Option 9

      // Encrypt answers
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      for (let i = 0; i < correctAnswers.length; i++) {
        const enc = await fhevm
          .createEncryptedInput(cogniSealContractAddress, signers.examiner.address)
          .add32(correctAnswers[i])
          .encrypt();
        encryptedAnswers.push(enc.handles[0]);
        inputProofs.push(enc.inputProof);
      }

      const passingScore = 1; // Need at least 1 correct answer
      const timeLimitMinutes = 60;
      const maxAttempts = 3;
      const cooldownMinutes = 5;

      const tx = await cogniSealContract
        .connect(signers.examiner)
        .createExam(
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

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Verify exam was created
      const examCount = await cogniSealContract.getExamCount();
      expect(examCount).to.equal(1);

      const examInfo = await cogniSealContract.getExamInfo(1);
      expect(examInfo.title).to.equal(title);
      expect(examInfo.questionCount).to.equal(2);
      expect(examInfo.passingScore).to.equal(passingScore);
    });

    it("should reject exam creation with mismatched array lengths", async function () {
      const questionTexts = ["Question 1", "Question 2"]; // 2 questions
      const questionTypes = [0, 0];
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      // Only provide 1 encrypted answer (missing one)
      const enc = await fhevm
        .createEncryptedInput(cogniSealContractAddress, signers.examiner.address)
        .add32(1)
        .encrypt();
      encryptedAnswers.push(enc.handles[0]);
      inputProofs.push(enc.inputProof);

      await expect(
        cogniSealContract
          .connect(signers.examiner)
          .createExam(
            "Test",
            "Description",
            questionTexts,
            questionTypes,
            encryptedAnswers,
            inputProofs,
            1,
            60,
            3,
            5
          )
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("Answer Submission and Grading", function () {
    let examId: bigint;

    beforeEach(async function () {
      // Create a simple exam with 2 questions
      const questionTexts = ["What is 2 + 2?", "What is 3 * 3?"];
      const questionTypes = [0, 0]; // Both MultipleChoice
      const correctAnswers = [4, 9];

      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      for (let i = 0; i < correctAnswers.length; i++) {
        const enc = await fhevm
          .createEncryptedInput(cogniSealContractAddress, signers.examiner.address)
          .add32(correctAnswers[i])
          .encrypt();
        encryptedAnswers.push(enc.handles[0]);
        inputProofs.push(enc.inputProof);
      }

      const tx = await cogniSealContract
        .connect(signers.examiner)
        .createExam(
          "Test Exam",
          "Description",
          questionTexts,
          questionTypes,
          encryptedAnswers,
          inputProofs,
          1, // passingScore
          60, // timeLimitMinutes
          3, // maxAttempts
          0 // cooldownMinutes (0 for testing)
        );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id("ExamCreated(uint256,address,string,uint32,uint32)")
      );
      if (event) {
        const decoded = cogniSealContract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });
        examId = decoded?.args[0] as bigint;
      } else {
        examId = 1n; // Fallback
      }
    });

    it("should submit answers and grade correctly", async function () {
      const userAnswers = [4, 9]; // Both correct

      // Encrypt user answers
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      for (let i = 0; i < userAnswers.length; i++) {
        const enc = await fhevm
          .createEncryptedInput(cogniSealContractAddress, signers.examinee.address)
          .add32(userAnswers[i])
          .encrypt();
        encryptedAnswers.push(enc.handles[0]);
        inputProofs.push(enc.inputProof);
      }

      const tx = await cogniSealContract
        .connect(signers.examinee)
        .submitAnswers(examId, encryptedAnswers, inputProofs);

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Get submission score
      const submissionId = 1n;
      const encryptedScore = await cogniSealContract.getSubmissionScore(submissionId);

      // Decrypt score
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedScore,
        cogniSealContractAddress,
        signers.examinee
      );

      expect(clearScore).to.equal(2); // Both answers correct
    });

    it("should submit answers and grade partially correct", async function () {
      const userAnswers = [4, 8]; // First correct, second wrong

      // Encrypt user answers
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      for (let i = 0; i < userAnswers.length; i++) {
        const enc = await fhevm
          .createEncryptedInput(cogniSealContractAddress, signers.examinee.address)
          .add32(userAnswers[i])
          .encrypt();
        encryptedAnswers.push(enc.handles[0]);
        inputProofs.push(enc.inputProof);
      }

      const tx = await cogniSealContract
        .connect(signers.examinee)
        .submitAnswers(examId, encryptedAnswers, inputProofs);

      await tx.wait();

      // Get submission score
      const submissionId = 1n;
      const encryptedScore = await cogniSealContract.getSubmissionScore(submissionId);

      // Decrypt score
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedScore,
        cogniSealContractAddress,
        signers.examinee
      );

      expect(clearScore).to.equal(1); // Only first answer correct
    });

    it("should enforce max attempts limit", async function () {
      const userAnswers = [1, 2]; // Wrong answers

      // Encrypt user answers
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      for (let i = 0; i < userAnswers.length; i++) {
        const enc = await fhevm
          .createEncryptedInput(cogniSealContractAddress, signers.examinee.address)
          .add32(userAnswers[i])
          .encrypt();
        encryptedAnswers.push(enc.handles[0]);
        inputProofs.push(enc.inputProof);
      }

      // Submit 3 times (max attempts)
      for (let i = 0; i < 3; i++) {
        const tx = await cogniSealContract
          .connect(signers.examinee)
          .submitAnswers(examId, encryptedAnswers, inputProofs);
        await tx.wait();
      }

      // 4th attempt should fail
      await expect(
        cogniSealContract.connect(signers.examinee).submitAnswers(examId, encryptedAnswers, inputProofs)
      ).to.be.revertedWith("Maximum attempts reached");
    });
  });

  describe("Certificate Minting", function () {
    let examId: bigint;

    beforeEach(async function () {
      // Create an exam
      const questionTexts = ["What is 2 + 2?"];
      const questionTypes = [0];
      const correctAnswers = [4];

      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      const enc = await fhevm
        .createEncryptedInput(cogniSealContractAddress, signers.examiner.address)
        .add32(correctAnswers[0])
        .encrypt();
      encryptedAnswers.push(enc.handles[0]);
      inputProofs.push(enc.inputProof);

      const tx = await cogniSealContract
        .connect(signers.examiner)
        .createExam(
          "Certificate Test",
          "Description",
          questionTexts,
          questionTypes,
          encryptedAnswers,
          inputProofs,
          1, // passingScore
          60,
          3,
          0
        );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id("ExamCreated(uint256,address,string,uint32,uint32)")
      );
      if (event) {
        const decoded = cogniSealContract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });
        examId = decoded?.args[0] as bigint;
      } else {
        examId = 1n;
      }
    });

    it("should mint certificate for passing score", async function () {
      // Submit correct answer
      const userAnswers = [4];
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      const enc = await fhevm
        .createEncryptedInput(cogniSealContractAddress, signers.examinee.address)
        .add32(userAnswers[0])
        .encrypt();
      encryptedAnswers.push(enc.handles[0]);
      inputProofs.push(enc.inputProof);

      const tx = await cogniSealContract
        .connect(signers.examinee)
        .submitAnswers(examId, encryptedAnswers, inputProofs);
      await tx.wait();

      // Mint certificate
      const submissionId = 1n;
      const mintTx = await cogniSealContract
        .connect(signers.examinee)
        .mintCertificate(submissionId, examId, 1, "0x"); // Score = 1, passingScore = 1
      await mintTx.wait();

      // Verify certificate
      const hasCert = await cogniSealContract.hasCertificate(signers.examinee.address, examId);
      expect(hasCert).to.be.true;
    });

    it("should reject certificate minting for failing score", async function () {
      // Submit wrong answer
      const userAnswers = [1];
      const encryptedAnswers: string[] = [];
      const inputProofs: string[] = [];

      const enc = await fhevm
        .createEncryptedInput(cogniSealContractAddress, signers.examinee.address)
        .add32(userAnswers[0])
        .encrypt();
      encryptedAnswers.push(enc.handles[0]);
      inputProofs.push(enc.inputProof);

      const tx = await cogniSealContract
        .connect(signers.examinee)
        .submitAnswers(examId, encryptedAnswers, inputProofs);
      await tx.wait();

      // Try to mint certificate with score 0 (below passingScore 1)
      const submissionId = 1n;
      await expect(
        cogniSealContract.connect(signers.examinee).mintCertificate(submissionId, examId, 0, "0x")
      ).to.be.revertedWith("Score below passing threshold");
    });
  });
});

