const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
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
  const sourceRepo = path.resolve(process.cwd(), "./saral_next_frontend");
  const targetRepo = path.resolve(process.cwd(), "../saral-vercel-frontend");
  console.log("Source Repo:", sourceRepo);
  console.log("Target Repo:", targetRepo);
  const commitMessage = await getCommitMessage();

  try {
    // Step 1: Remove all folders/files except .git in targetRepo
    console.log("Cleaning target folder, excluding .git...");
    const files = fs.readdirSync(targetRepo);
    for (const file of files) {
      if (file !== ".git") {
        const filePath = path.join(targetRepo, file);
        fsExtra.removeSync(filePath);
        console.log(`Deleted: ${filePath}`);
      }
    }

    // Step 2: Copy files from sourceRepo to targetRepo
    console.log("Copying files from source to target, excluding node_modules and .git...");
    await fsExtra.copy(sourceRepo, targetRepo, {
      overwrite: true,
      filter: (src) => {
        const excludedPatterns = [".git", "node_modules"];
        const relativePath = path.relative(sourceRepo, src);
        const isExcluded = excludedPatterns.some((pattern) =>
          relativePath.startsWith(pattern)
        );
        console.log(`Processing: ${relativePath} (Excluded: ${isExcluded})`);
        return !isExcluded;
      },
    });

    console.log("Files copied successfully.");

    process.chdir(targetRepo);

    // Step 3: Ensure Git is initialized
    if (!fs.existsSync(path.join(targetRepo, ".git"))) {
      console.log("Initializing Git repository...");
      await spawnPromise("git", ["init"]);
      console.log("Git repository initialized.");
    }

    // Step 4: Link to remote repository if not already linked
    const remotes = execSync("git remote").toString().trim();
    if (!remotes.includes("origin")) {
      console.log("Setting remote repository...");
      await spawnPromise("git", ["remote", "add", "origin", "YOUR_REMOTE_URL"]);
    }

    // Step 5: Git operations
    console.log("Adding all files to Git...");
    await spawnPromise("git", ["add", "."]);

    console.log("Committing with commit message...");
    await spawnPromise("git", ["commit", "-m", commitMessage]);

    console.log("Pulling latest changes...");
    await spawnPromise("git", ["config", "pull.rebase", "false"]);
    await spawnPromise("git", ["pull", "origin", "main"]);

    console.log("Pushing changes...");
    await spawnPromise("git", ["push", "origin", "main"]);

    console.log("Deployment completed successfully.");
  } catch (error) {
    console.error("Error during deployment:", error.message);
    process.exit(1);
  }
};

const spawnPromise = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const cp = spawn(command, args, { shell: true });

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
