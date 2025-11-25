# CogniSeal

CogniSeal is a zero-knowledge exam platform built on FHEVM (Fully Homomorphic Encryption Virtual Machine). It enables secure, on-chain exam creation and grading where correct answers remain encrypted and never revealed.

## Features

- **Zero-Knowledge Grading**: Answers are encrypted using FHEVM and compared homomorphically without revealing correct answers
- **Secure Exam Creation**: Create exams with encrypted answer keys that remain secret forever
- **Automatic Grading**: Exams are automatically graded using homomorphic encryption
- **Certificate Minting**: Mint on-chain certificates as proof of competence after passing exams
- **Anti-Brute-Force**: Built-in protection against brute-force attacks with attempt limits and cooldown periods

## Architecture

### Smart Contracts (`fhevm-hardhat-template/`)
- **CogniSeal.sol**: Main contract implementing zero-knowledge exam functionality
- Uses FHEVM for homomorphic encryption operations
- Supports multiple choice and fill-in-the-blank question types

### Frontend (`cogniseal-frontend/`)
- Next.js 15 with static export
- React 19 with TypeScript
- FHEVM integration with Relayer SDK
- Wallet connection via MetaMask/EIP-6963
- Responsive UI with Tailwind CSS

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Hardhat (for contract development)
- MetaMask or compatible wallet

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CogniSeal
```

2. Install dependencies for contracts:
```bash
cd fhevm-hardhat-template
npm install
```

3. Install dependencies for frontend:
```bash
cd ../cogniseal-frontend
npm install
```

### Development

#### Contract Development
```bash
cd fhevm-hardhat-template
npx hardhat compile
npx hardhat test
npx hardhat deploy --network sepolia
```

#### Frontend Development
```bash
cd cogniseal-frontend
npm run genabi
npm run dev
```

For mock mode (local Hardhat node):
```bash
npm run dev:mock
```

### Deployment

#### Deploy Contract to Sepolia
```bash
cd fhevm-hardhat-template
npx hardhat deploy --network sepolia
```

#### Deploy Frontend to Vercel
```bash
cd cogniseal-frontend
vercel --prod
```

## Contract Addresses

- **Sepolia**: `0x8256e70Ebc544FF7BfE5129A46A64D633Da95697`
- **Localhost**: Check `deployments/localhost/`

## Project Structure

```
CogniSeal/
├── fhevm-hardhat-template/    # Smart contracts
│   ├── contracts/              # Solidity contracts
│   ├── deploy/                 # Deployment scripts
│   ├── test/                   # Contract tests
│   └── tasks/                  # Hardhat tasks
├── cogniseal-frontend/         # Frontend application
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── fhevm/                  # FHEVM integration
│   └── abi/                    # Contract ABIs and addresses
└── README.md
```

## License

BSD-3-Clause-Clear

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

