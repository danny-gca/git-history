#!/usr/bin/env node
import { format } from 'date-fns';
import { resolve, dirname } from 'path';
import * as readline from 'readline';
import { loadConfig } from './config.js';
import { parseGitHistory, findAllRepositories } from './git-parser.js';
import { processCommits } from './overtime-calc.js';
import { writeCommitsToCSV } from './csv-writer.js';
import { CommitWithOvertime } from './types.js';
import { generateOvertimeByDay } from './overtime-by-day-lib.js';

interface CliOptions {
  all: boolean;
  day: boolean;
  userEmail: string;
  path: string;
  exportPath: string;
}

function getEnvOption(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : undefined;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  // Load defaults from .env
  let all = getEnvOption('PROCESS_ALL') === 'true';
  let day = false;
  let userEmail = getEnvOption('USER_EMAIL') || '';
  let path = getEnvOption('PROJECT_PATH') || '';
  let exportPath = getEnvOption('EXPORT_PATH') || '';

  // Override with command line arguments
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--all') {
      all = true;
      i++;
    } else if (args[i] === '-d' || args[i] === '--day') {
      day = true;
      i++;
    } else if (args[i] === '-e' || args[i] === '--email') {
      userEmail = args[i + 1] || '';
      i += 2;
    } else if (args[i] === '-p' || args[i] === '--path') {
      path = args[i + 1] || '';
      i += 2;
    } else if (args[i] === '-x' || args[i] === '--export') {
      exportPath = args[i + 1] || '';
      i += 2;
    } else if (!userEmail) {
      userEmail = args[i];
      i++;
    } else if (!path) {
      path = args[i];
      i++;
    } else {
      i++;
    }
  }

  if (!userEmail || !path) {
    console.error('Usage:');
    console.error('-----> Option 1 (with options):');
    console.error('       ./git-history -e <email> -p <path> [--all] [-d] [-x <export_path>]');
    console.error('');
    console.error('-----> Option 2 (legacy syntax):');
    console.error('       ./git-history [--all] <user_email> <repository_path>');
    console.error('');
    console.error('-----> Option 3 (using .env defaults):');
    console.error('       ./git-history');
    console.error('       (requires USER_EMAIL and PROJECT_PATH in .env)');
    console.error('');
    console.error('Options:');
    console.error('  -e, --email      User email (overrides USER_EMAIL in .env)');
    console.error('  -p, --path       Repository path (overrides PROJECT_PATH in .env)');
    console.error('  -x, --export     Custom export path (overrides EXPORT_PATH in .env, default: ./export)');
    console.error('  -d, --day        Generate overtime-by-day automatically after git-history');
    console.error('  --all            Process all repositories in folder (overrides PROCESS_ALL in .env)');
    console.error('');
    console.error('Environment variables (.env):');
    console.error('  USER_EMAIL       Default user email');
    console.error('  PROJECT_PATH     Default repository or folder path');
    console.error('  EXPORT_PATH      Default export path (optional)');
    console.error('  PROCESS_ALL      true/false to process all repositories (optional)');
    process.exit(1);
  }

  // Expand ~ to home directory
  if (path.startsWith('~')) {
    path = path.replace('~', process.env.HOME || '~');
  }
  if (exportPath && exportPath.startsWith('~')) {
    exportPath = exportPath.replace('~', process.env.HOME || '~');
  }

  // Default export path
  if (!exportPath) {
    exportPath = resolve(process.cwd(), 'export');
  }

  return { all, day, userEmail, path, exportPath };
}

async function promptOvertimeByDay(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n📊 Générer le fichier overtime-by-day ? (Y/n): ', (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes' || normalized === '');
    });
  });
}

async function main() {
  console.log('⚙️  Chargement de la configuration...');
  const config = loadConfig();

  const options = parseArgs();
  const currentDate = format(new Date(), 'yyyy-MM-dd-HH-mm');
  const userName = options.userEmail.split('@')[0];
  const outputFile = `${options.exportPath}/git-history.${userName}.${currentDate}.csv`;

  let allCommits: CommitWithOvertime[] = [];

  if (options.all) {
    console.log(`⚙️  Parcours de tous les dépôts dans : ${options.path}`);
    const repositories = findAllRepositories(options.path);

    for (const repoPath of repositories) {
      console.log(`⛏️  Génération de l'historique pour le dépôt : ${repoPath}`);
      try {
        const commits = parseGitHistory({ repoPath, userEmail: options.userEmail });
        const commitsWithOvertime = processCommits(commits, config);
        allCommits.push(...commitsWithOvertime);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${repoPath}:`, error);
      }
    }
  } else {
    console.log(`⛏️  Génération de l'historique pour le dépôt : ${options.path}`);
    const commits = parseGitHistory({ repoPath: options.path, userEmail: options.userEmail });
    allCommits = processCommits(commits, config);
  }

  console.log('▶️  Création du fichier CSV...');
  writeCommitsToCSV(allCommits, outputFile, options.userEmail, options.path, config);

  console.log('📄 Historique git généré ici :');
  console.log(`"${outputFile}"`);

  // Generate overtime-by-day if requested or prompt user
  let shouldGenerateDay = options.day;

  if (!shouldGenerateDay) {
    shouldGenerateDay = await promptOvertimeByDay();
  }

  if (shouldGenerateDay) {
    console.log('\n⏰ Génération du fichier overtime-by-day...');
    const overtimeOutputPath = await generateOvertimeByDay(outputFile, options.exportPath);
    console.log('✅ Fichier overtime-by-day généré :');
    console.log(`"${overtimeOutputPath}"`);
  }
}

main();
