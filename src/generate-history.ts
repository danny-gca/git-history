#!/usr/bin/env node
import { format } from 'date-fns';
import { loadConfig } from './config.js';
import { parseGitHistory, findAllRepositories } from './git-parser.js';
import { processCommits } from './overtime-calc.js';
import { writeCommitsToCSV } from './csv-writer.js';
import { CommitWithOvertime } from './types.js';

interface CliOptions {
  all: boolean;
  userEmail: string;
  path: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let all = false;
  let userEmail = '';
  let path = '';

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--all') {
      all = true;
      i++;
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
    console.error('-----> exemple 1 : npm run generate -- --all <user_email> <folder_path>');
    console.error('-----> exemple 2 : npm run generate -- <user_email> <repository_path>');
    process.exit(1);
  }

  return { all, userEmail, path };
}

function main() {
  console.log('⚙️  Chargement de la configuration...');
  const config = loadConfig();

  const options = parseArgs();
  const currentDate = format(new Date(), 'yyyy-MM-dd-HH-mm');
  const userName = options.userEmail.split('@')[0];
  const outputFile = `${options.path}/git-history.${userName}.${currentDate}.csv`;

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
