#!/usr/bin/env node
import { format } from 'date-fns';
import { resolve } from 'path';
import { loadConfig } from './config.js';
import { parseGitHistory, findAllRepositories } from './git-parser.js';
import { processCommits } from './overtime-calc.js';
import { writeCommitsToCSV } from './csv-writer.js';
import { CommitWithOvertime } from './types.js';

interface CliOptions {
  all: boolean;
  userEmail: string;
  path: string;
  exportPath: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let all = false;
  let userEmail = '';
  let path = '';
  let exportPath = '';

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--all') {
      all = true;
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
    console.error('-----> Option 1 (new syntax):');
    console.error('       npm run generate -- -e <email> -p <path> [--all] [-x <export_path>]');
    console.error('');
    console.error('-----> Option 2 (old syntax):');
    console.error('       npm run generate -- [--all] <user_email> <repository_path>');
    console.error('');
    console.error('Options:');
    console.error('  -e, --email      User email');
    console.error('  -p, --path       Repository path (or folder path with --all)');
    console.error('  -x, --export     Custom export path (default: ./export)');
    console.error('  --all            Process all repositories in folder');
    process.exit(1);
  }

  // Default export path
  if (!exportPath) {
    exportPath = resolve(process.cwd(), 'export');
  }

  return { all, userEmail, path, exportPath };
}

function main() {
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
}

main();
