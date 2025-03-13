#!/usr/bin/env node

const inquirer = require('inquirer');
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateManifest } = require('./manifest.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_URL = 'https://github.com/lucas-neynar/frames-v2-quickstart.git';
const SCRIPT_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;

async function init() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is the name of your frame?',
      validate: (input) => {
        if (input.trim() === '') {
          return 'Project name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Give a one-line description of your frame:',
      validate: (input) => {
        if (input.trim() === '') {
          return 'Description cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'fid',
      message: 'Enter your Farcaster FID:',
      validate: (input) => {
        if (input.trim() === '') {
          return 'FID cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'seedPhrase',
      message: 'Enter your Farcaster account seed phrase:',
      validate: (input) => {
        if (input.trim() === '') {
          return 'Seed phrase cannot be empty';
        }
        return true;
      }
    }
  ]);

  const projectName = answers.projectName;
  const projectPath = path.join(process.cwd(), projectName);

  console.log(`\nCreating a new Frames v2 app in ${projectPath}\n`);

  // Clone the repository
  execSync(`git clone ${REPO_URL} "${projectPath}"`);

  // Remove the .git directory
  console.log('\nRemoving .git directory...');
  fs.rmSync(path.join(projectPath, '.git'), { recursive: true, force: true });

  // Generate manifest and write to public folder
  console.log('\nGenerating manifest...');
  const manifest = await generateManifest(answers.fid, answers.seedPhrase);
  fs.writeFileSync(
    path.join(projectPath, 'public/manifest.json'),
    JSON.stringify(manifest)
  );

  // Update package.json
  console.log('\nUpdating package.json...');
  const packageJsonPath = path.join(projectPath, 'package.json');
  let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.name = projectName;
  packageJson.version = '0.1.0';
  delete packageJson.author;
  delete packageJson.keywords;
  delete packageJson.repository;
  delete packageJson.license;
  delete packageJson.bin;
  delete packageJson.files;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Remove the bin directory
  console.log('\nRemoving bin directory...');
  const binPath = path.join(projectPath, 'bin');
  if (fs.existsSync(binPath)) {
    fs.rmSync(binPath, { recursive: true, force: true });
  }

  // Handle .env file
  console.log('\nSetting up environment variables...');
  const envExamplePath = path.join(projectPath, '.env.example');
  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    fs.unlinkSync(envExamplePath);
    // Append project name and description to .env
    fs.appendFileSync(envPath, `\nNEXT_PUBLIC_FRAME_NAME="${answers.projectName}"`);
    fs.appendFileSync(envPath, `\nNEXT_PUBLIC_FRAME_DESCRIPTION="${answers.description}"`);
    console.log('\nCreated .env file from .env.example');
  } else {
    console.log('\n.env.example does not exist, skipping copy and remove operations');
  }

  // Update README
  console.log('\nUpdating README...');
  const readmePath = path.join(projectPath, 'README.md');
  const prependText = `<!-- generated by frames-v2-quickstart version ${SCRIPT_VERSION} -->\n\n`;
  if (fs.existsSync(readmePath)) {
    const originalReadmeContent = fs.readFileSync(readmePath, { encoding: 'utf8' });
    const updatedReadmeContent = prependText + originalReadmeContent;
    fs.writeFileSync(readmePath, updatedReadmeContent);
  } else {
    fs.writeFileSync(readmePath, prependText);
  }

  // Install dependencies
  console.log('\nInstalling dependencies...');
  execSync('npm install', { cwd: projectPath, stdio: 'inherit' });

  // Initialize git repository
  console.log('\nInitializing git repository...');
  execSync('git init', { cwd: projectPath });
  execSync('git add .', { cwd: projectPath });
  execSync('git commit -m "initial commit from frames-v2-quickstart"', { cwd: projectPath });

  console.log(`\n🖼️✨ Successfully created frame ${projectName} with git and dependencies installed! ✨🖼️`);
  console.log('\nTo run the app:');
  console.log(`  cd ${projectName}`);
  console.log('  npm run dev\n');
}

init().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
