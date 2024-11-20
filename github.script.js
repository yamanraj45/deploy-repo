const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const getCommitMessage = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter commit message: ", (message) => {
      rl.close();
      resolve(message);
    });
  });
};

const deploy = async () => {
  const sourceRepo = path.resolve(process.cwd(), "/home/zerone/sarallagani/saral_next_portfolio-1");
  const targetRepo = "/home/zerone/sarallagani/saral-portfolio";
  console.log(sourceRepo);
  const commitMessage = await getCommitMessage();

  if (!fs.existsSync(targetRepo)) {
    fs.mkdirSync(targetRepo, { recursive: true });
  }

  // Step 1: Sync files
  try {
    execSync(
      `rm -rf "${targetRepo}/*" && rsync -av --exclude='.git' "${sourceRepo}/" "${targetRepo}/"`,
      { maxBuffer: 1024 * 1024 * 10 } 
    );
    process.chdir(targetRepo);
    console.log(process.cwd());
    console.log("Initializing Git repository in dist folder...");

    console.log("Adding all files to Git...");
    await spawnPromise("git", ["add", "."]);

    console.log("Committing with initial commit message...");
    await spawnPromise("git", ["commit", "-m", commitMessage]);

    await spawnPromise("git", ["config", "pull.rebase", "false"]);
    await spawnPromise("git", ["pull", "origin", "main"]);
    await spawnPromise("git", ["push", "origin", "main"]);
  } catch (error) {
    console.error("Error copying files:", error.message);
    process.exit(1);
  }
};

const spawnPromise = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const cp = spawn(command, args);

    cp.stdout.on("data", (data) => {
      console.log(`stdout: ${data.toString()}`);
    });

    cp.stderr.on("data", (data) => {
      console.error(`stderr: ${data.toString()}`);
    });

    cp.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${command}' failed with exit code ${code}`));
      }
    });
  });
};

deploy();
