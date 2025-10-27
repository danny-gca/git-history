#!/usr/bin/env node
import { generateOvertimeByDay } from './overtime-by-day-lib.js';

function parseArgs(): { csvPath: string; outputPath: string } {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage:');
    console.error('./overtime-by-day <CSV_file_path> <Output_folder_path>');
    process.exit(1);
  }

  return {
    csvPath: args[0],
    outputPath: args[1],
  };
}

async function main() {
  const { csvPath, outputPath } = parseArgs();

  console.log(`⛏️  Calcul des heures supp depuis : ${csvPath}`);

  const outputFile = await generateOvertimeByDay(csvPath, outputPath);

  console.log('✅  Fichier CSV généré :');
  console.log(`"${outputFile}"`);
}

main();
