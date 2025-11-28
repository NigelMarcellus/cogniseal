// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract CogniSeal is ZamaEthereumConfig {
    enum QuestionType {
        MultipleChoice,
        FillInBlank
    }
    
    struct Question {
        QuestionType questionType;
        string questionText;
        euint32 encryptedAnswer;
    }
    
    struct Exam {
        uint256 examId;
        address creator;
        string title;
        string description;
        Question[] questions;
        uint32 passingScore;
        uint32 timeLimitMinutes;
        uint32 maxAttempts;
        uint32 cooldownMinutes;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Submission {
        address examinee;
        uint256 examId;
        euint32[] encryptedAnswers;
        euint32 encryptedScore;
        uint256 submittedAt;
        bool isGraded;
    }
    
    struct AttemptInfo {
        uint32 attemptCount;
        uint256 lastAttemptTime;
    }
    
    uint256 private _nextExamId;
    uint256 private _nextSubmissionId;
    
    mapping(uint256 => Exam) public exams;
    mapping(uint256 => Submission) public submissions;
    mapping(address => mapping(uint256 => AttemptInfo)) public attemptInfos;
    mapping(address => mapping(uint256 => bool)) public certificates;
    
    event ExamCreated(
        uint256 indexed examId,
        address indexed creator,
        string title,
        uint32 questionCount,
        uint32 passingScore
    );
    
    event AnswersSubmitted(
        uint256 indexed submissionId,
        uint256 indexed examId,
        address indexed examinee,
        uint256 submittedAt
    );
    
    event ExamGraded(
        uint256 indexed submissionId,
        uint256 indexed examId,
        address indexed examinee,
        euint32 encryptedScore
    );
    
    event CertificateMinted(
        uint256 indexed examId,
        address indexed examinee,
        uint256 submissionId
    );
    
    modifier examExists(uint256 examId) {
        require(exams[examId].creator != address(0), "Exam does not exist");
        _;
    }
    
    modifier examActive(uint256 examId) {
        require(exams[examId].isActive, "Exam is not active");
        _;
    }
    
    constructor() {
        _nextExamId = 1;
        _nextSubmissionId = 1;
    }
    
    function createExam(
        string memory title,
        string memory description,
        string[] memory questionTexts,
        QuestionType[] memory questionTypes,
        externalEuint32[] memory encryptedAnswers,
        bytes[] memory inputProofs,
        uint32 passingScore,
        uint32 timeLimitMinutes,
        uint32 maxAttempts,
        uint32 cooldownMinutes
    ) external returns (uint256 examId) {
        require(questionTexts.length > 0, "Must have at least one question");
        require(
            questionTexts.length == questionTypes.length &&
            questionTexts.length == encryptedAnswers.length &&
            questionTexts.length == inputProofs.length,
            "Arrays length mismatch"
        );
        require(passingScore > 0, "Passing score must be greater than 0");
        require(timeLimitMinutes > 0, "Time limit must be greater than 0");
        require(maxAttempts > 0, "Max attempts must be greater than 0");
        
        examId = _nextExamId++;
        
        Exam storage exam = exams[examId];
        exam.examId = examId;
        exam.creator = msg.sender;
        exam.title = title;
        exam.description = description;
        exam.passingScore = passingScore;
        exam.timeLimitMinutes = timeLimitMinutes;
        exam.maxAttempts = maxAttempts;
        exam.cooldownMinutes = cooldownMinutes;
        exam.isActive = true;
        exam.createdAt = block.timestamp;
        
        for (uint256 i = 0; i < questionTexts.length; i++) {
            euint32 encryptedAnswer = FHE.fromExternal(encryptedAnswers[i], inputProofs[i]);
            
            FHE.allowThis(encryptedAnswer);
            FHE.allow(encryptedAnswer, msg.sender);
            
            exam.questions.push(Question({
                questionType: questionTypes[i],
                questionText: questionTexts[i],
                encryptedAnswer: encryptedAnswer
            }));
        }
        
        emit ExamCreated(
            examId,
            msg.sender,
            title,
            uint32(questionTexts.length),
            passingScore
        );
        
        return examId;
    }
    
    function submitAnswers(
        uint256 examId,
        externalEuint32[] memory encryptedAnswers,
        bytes[] memory inputProofs
    ) external examExists(examId) examActive(examId) returns (uint256 submissionId) {
        Exam storage exam = exams[examId];
        
        require(
            encryptedAnswers.length == exam.questions.length,
            "Answers count mismatch"
        );
        require(
            encryptedAnswers.length == inputProofs.length,
            "Input proofs count mismatch"
        );
        
        AttemptInfo storage attemptInfo = attemptInfos[msg.sender][examId];
        require(
            attemptInfo.attemptCount < exam.maxAttempts,
            "Maximum attempts reached"
        );
        
        if (attemptInfo.lastAttemptTime > 0) {
            uint256 cooldownEndTime = attemptInfo.lastAttemptTime + (uint256(exam.cooldownMinutes) * 1 minutes);
            require(
                block.timestamp >= cooldownEndTime,
                "Cooldown period not ended"
            );
        }
        
        attemptInfo.attemptCount++;
        attemptInfo.lastAttemptTime = block.timestamp;
        
        submissionId = _nextSubmissionId++;
        Submission storage submission = submissions[submissionId];
        submission.examinee = msg.sender;
        submission.examId = examId;
        submission.submittedAt = block.timestamp;
        submission.isGraded = false;
        
        for (uint256 i = 0; i < encryptedAnswers.length; i++) {
            euint32 encryptedAnswer = FHE.fromExternal(encryptedAnswers[i], inputProofs[i]);
            
            FHE.allowThis(encryptedAnswer);
            FHE.allow(encryptedAnswer, msg.sender);
            
            submission.encryptedAnswers.push(encryptedAnswer);
        }
        
        emit AnswersSubmitted(submissionId, examId, msg.sender, block.timestamp);
        
        _gradeExam(submissionId, examId);
        
        return submissionId;
    }
    
    function _gradeExam(uint256 submissionId, uint256 examId) internal {
        Submission storage submission = submissions[submissionId];
        Exam storage exam = exams[examId];
        
        require(!submission.isGraded, "Already graded");
        
        euint32 encryptedScore = FHE.asEuint32(0);
        
        for (uint256 i = 0; i < exam.questions.length; i++) {
            euint32 userAnswer = submission.encryptedAnswers[i];
            euint32 correctAnswer = exam.questions[i].encryptedAnswer;
            
            ebool isEqual = FHE.eq(userAnswer, correctAnswer);
            euint32 point = FHE.select(isEqual, FHE.asEuint32(1), FHE.asEuint32(0));
            encryptedScore = FHE.add(encryptedScore, point);
        }
        
        submission.encryptedScore = encryptedScore;
        submission.isGraded = true;
        
        FHE.allowThis(encryptedScore);
        FHE.allow(encryptedScore, submission.examinee);
        
        emit ExamGraded(submissionId, examId, submission.examinee, encryptedScore);
        
        _checkAndMintCertificate(submissionId, examId);
    }
    
    function _checkAndMintCertificate(uint256 submissionId, uint256 examId) internal view {
        Submission storage submission = submissions[submissionId];
        
        if (certificates[submission.examinee][examId]) {
            return;
        }
    }
    
    function mintCertificate(
        uint256 submissionId,
        uint256 examId,
        uint32 decryptedScore,
        bytes memory
    ) external examExists(examId) {
        Submission storage submission = submissions[submissionId];
        Exam storage exam = exams[examId];
        
        require(submission.examinee == msg.sender, "Not the examinee");
        require(submission.examId == examId, "Submission exam mismatch");
        require(submission.isGraded, "Exam not graded yet");
        require(!certificates[msg.sender][examId], "Certificate already minted");
        require(decryptedScore >= exam.passingScore, "Score below passing threshold");
        
        certificates[msg.sender][examId] = true;
        
        emit CertificateMinted(examId, msg.sender, submissionId);
    }
    
    function getExamInfo(uint256 examId)
        external
        view
        examExists(examId)
        returns (
            string memory title,
            string memory description,
            uint32 questionCount,
            uint32 passingScore,
            uint32 timeLimitMinutes,
            uint32 maxAttempts,
            uint32 cooldownMinutes,
            bool isActive,
            uint256 createdAt
        )
    {
        Exam storage exam = exams[examId];
        return (
            exam.title,
            exam.description,
            uint32(exam.questions.length),
            exam.passingScore,
            exam.timeLimitMinutes,
            exam.maxAttempts,
            exam.cooldownMinutes,
            exam.isActive,
            exam.createdAt
        );
    }
    
    function getQuestion(uint256 examId, uint256 questionIndex)
        external
        view
        examExists(examId)
        returns (string memory questionText, QuestionType questionType)
    {
        Exam storage exam = exams[examId];
        require(questionIndex < exam.questions.length, "Question index out of bounds");
        
        Question storage question = exam.questions[questionIndex];
        return (question.questionText, question.questionType);
    }
    
    function getSubmissionScore(uint256 submissionId)
        external
        view
        returns (euint32 encryptedScore)
    {
        Submission storage submission = submissions[submissionId];
        require(submission.examinee != address(0), "Submission does not exist");
        require(submission.isGraded, "Exam not graded yet");
        
        return submission.encryptedScore;
    }
    
    function getAttemptInfo(address examinee, uint256 examId)
        external
        view
        examExists(examId)
        returns (
            uint32 attemptCount,
            uint256 lastAttemptTime,
            bool canAttempt,
            uint256 cooldownEndTime
        )
    {
        Exam storage exam = exams[examId];
        AttemptInfo storage attemptInfo = attemptInfos[examinee][examId];
        
        attemptCount = attemptInfo.attemptCount;
        lastAttemptTime = attemptInfo.lastAttemptTime;
        
        bool withinMaxAttempts = attemptCount < exam.maxAttempts;
        
        if (lastAttemptTime > 0) {
            cooldownEndTime = lastAttemptTime + (uint256(exam.cooldownMinutes) * 1 minutes);
            bool cooldownEnded = block.timestamp >= cooldownEndTime;
            canAttempt = withinMaxAttempts && cooldownEnded;
        } else {
            cooldownEndTime = 0;
            canAttempt = withinMaxAttempts;
        }
        
        return (attemptCount, lastAttemptTime, canAttempt, cooldownEndTime);
    }
    
    function hasCertificate(address examinee, uint256 examId)
        external
        view
        examExists(examId)
        returns (bool)
    {
        return certificates[examinee][examId];
    }
    
    function getExamCount() external view returns (uint256 count) {
        return _nextExamId - 1;
    }
}

