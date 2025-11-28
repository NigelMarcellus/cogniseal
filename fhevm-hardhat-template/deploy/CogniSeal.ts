import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployCogniSeal: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying CogniSeal contract...");

  const deployResult = await deploy("CogniSeal", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`CogniSeal deployed to: ${deployResult.address}`);

  return true;
};

deployCogniSeal.id = "deploy_cogniseal";
deployCogniSeal.tags = ["CogniSeal"];

export default deployCogniSeal;


