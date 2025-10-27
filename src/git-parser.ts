import { execSync } from 'child_process';
import { GitCommit } from './types.js';
import { parse } from 'date-fns';

export interface GitParserOptions {
  repoPath: string;
  userEmail: string;
}

export function parseGitHistory(options: GitParserOptions): GitCommit[] {
  const { repoPath, userEmail } = options;

  // Change to the repository directory
  process.chdir(repoPath);

  // Get project name
  const projectName = execSync('basename "$(git rev-parse --show-toplevel)"', { encoding: 'utf-8' }).trim();

  // Get git log output
  const gitLogOutput = execSync(
    `git log --all --author="${userEmail}" --pretty=format:'%H|"%s"|%ad' --date=format:'%Y-%m-%d|%H:%M'`,
    { encoding: 'utf-8' }
  );

  const commits: GitCommit[] = [];
  const seenCommits = new Set<string>();
  const lines = gitLogOutput.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 4) continue;

    const commitId = parts[0];
    const commitTitle = parts[1].replace(/"/g, '').replace(/;/g, ',');
    const commitDate = parts[2];
    const commitTime = parts[3];

    // Skip if already seen
    if (seenCommits.has(commitId)) continue;
    seenCommits.add(commitId);

    // Get branch name
    const branchOutput = execSync(`git branch --all --contains "${commitId}" | head -n 1`, { encoding: 'utf-8' });
    const branch = branchOutput.replace(/\*/g, '').trim().replace(/;/g, ',');

    // Get stats
    const gitShowStat = execSync(`git show --stat --oneline "${commitId}"`, { encoding: 'utf-8' });

    const modifiedFilesMatch = gitShowStat.match(/(\d+)\s+file/);
    const modifiedFiles = modifiedFilesMatch ? parseInt(modifiedFilesMatch[1], 10) : 0;

    const addedLinesMatch = gitShowStat.match(/(\d+)\s+insertion/);
    const addedLines = addedLinesMatch ? parseInt(addedLinesMatch[1], 10) : 0;

    const deletedLinesMatch = gitShowStat.match(/(\d+)\s+deletion/);
    const deletedLines = deletedLinesMatch ? parseInt(deletedLinesMatch[1], 10) : 0;

    // Parse date
    const date = parse(`${commitDate} ${commitTime}`, 'yyyy-MM-dd HH:mm', new Date());

    commits.push({
      id: commitId,
      title: commitTitle,
      date,
      time: commitTime,
      projectName,
      branch,
      modifiedFiles,
      addedLines,
      deletedLines,
    });
  }

  return commits;
}

export function findAllRepositories(folderPath: string): string[] {
  const output = execSync(`find "${folderPath}" -type d -name .git -exec dirname {} \\;`, {
    encoding: 'utf-8',
  });

  return output.split('\n').filter(line => line.trim());
}
