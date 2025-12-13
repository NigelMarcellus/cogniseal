
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const CogniSealABI = {
  "abi": [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "submittedAt",
          "type": "uint256"
        }
      ],
      "name": "AnswersSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        }
      ],
      "name": "CertificateMinted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "questionCount",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "passingScore",
          "type": "uint32"
        }
      ],
      "name": "ExamCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "euint32",
          "name": "encryptedScore",
          "type": "bytes32"
        }
      ],
      "name": "ExamGraded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "attemptInfos",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "attemptCount",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "lastAttemptTime",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "certificates",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "confidentialProtocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "questionTexts",
          "type": "string[]"
        },
        {
          "internalType": "enum CogniSeal.QuestionType[]",
          "name": "questionTypes",
          "type": "uint8[]"
        },
        {
          "internalType": "externalEuint32[]",
          "name": "encryptedAnswers",
          "type": "bytes32[]"
        },
        {
          "internalType": "bytes[]",
          "name": "inputProofs",
          "type": "bytes[]"
        },
        {
          "internalType": "uint32",
          "name": "passingScore",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "timeLimitMinutes",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "maxAttempts",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "cooldownMinutes",
          "type": "uint32"
        }
      ],
      "name": "createExam",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "exams",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint32",
          "name": "passingScore",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "timeLimitMinutes",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "maxAttempts",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "cooldownMinutes",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        }
      ],
      "name": "getAttemptInfo",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "attemptCount",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "lastAttemptTime",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "canAttempt",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "cooldownEndTime",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getExamCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "count",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        }
      ],
      "name": "getExamInfo",
      "outputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint32",
          "name": "questionCount",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "passingScore",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "timeLimitMinutes",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "maxAttempts",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "cooldownMinutes",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "questionIndex",
          "type": "uint256"
        }
      ],
      "name": "getQuestion",
      "outputs": [
        {
          "internalType": "string",
          "name": "questionText",
          "type": "string"
        },
        {
          "internalType": "enum CogniSeal.QuestionType",
          "name": "questionType",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        }
      ],
      "name": "getSubmissionScore",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "encryptedScore",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        }
      ],
      "name": "hasCertificate",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "decryptedScore",
          "type": "uint32"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "mintCertificate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "submissions",
      "outputs": [
        {
          "internalType": "address",
          "name": "examinee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "internalType": "euint32",
          "name": "encryptedScore",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "submittedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isGraded",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "examId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32[]",
          "name": "encryptedAnswers",
          "type": "bytes32[]"
        },
        {
          "internalType": "bytes[]",
          "name": "inputProofs",
          "type": "bytes[]"
        }
      ],
      "name": "submitAnswers",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "submissionId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;

