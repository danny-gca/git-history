#!/bin/bash

# Checking arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <user_email> <repository_path>"
    exit 1
fi

# Checking executable permission
if [ ! -x "$0" ]; then
    echo "Error: You need to execute : chmod +x $0"
    exit 1
fi

USER_EMAIL=$1
REPO_PATH=$2

CURRENT_DATE=$(date +"%Y-%m-%d-%H-%M")
USER_NAME="${USER_EMAIL%%@*}"
OUTPUT_FILE="git-history.[${REPO_PATH##*/}].[$USER_NAME].[$CURRENT_DATE].csv"

cd "$REPO_PATH" || { echo "Erreur: Impossible d'accéder au repository"; exit 1; }

# Creation of the CSV file
echo "commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time" > "$OUTPUT_FILE"

declare -A SEEN_COMMITS # Array to store seen commits

# Get the history of the repository for the user
git_log_output=$(git log --all --author="$USER_EMAIL" --pretty=format:'%H,"%s",%ad' --date=format:'%Y-%m-%d,%H:%M')

# Loop through the history
IFS=$'\n'
for line in $git_log_output; do
    commit_id=$(echo $line | cut -d',' -f1)
    commit_title=$(echo $line | cut -d',' -f2)
    commit_date=$(echo $line | cut -d',' -f3 | cut -d' ' -f1)
    commit_time=$(echo $line | cut -d',' -f3 | cut -d' ' -f2)

    if [[ -z "${SEEN_COMMITS[$commit_id]}" ]]; then
        # Get the branch name
        branch=$(git branch --all --contains "$commit_id" | head -n 1 | sed 's/*//g' | awk '{$1=$1};1')

        # Get the number of modified files
        modified_files=$(git show --stat --oneline "$commit_id" | grep -o '|' | wc -l)

        # Get the number of added and deleted lines
        read added_lines deleted_lines <<< $(git show --numstat "$commit_id" | awk '{added+=$1; deleted+=$2} END {print added, deleted}')

        # Write the commit information to the CSV file
        echo "$commit_id;\"$branch\";$commit_title;$modified_files;$added_lines;$deleted_lines;$commit_date;$commit_time" >> "$OUTPUT_FILE"
        
        # Mark the commit as seen
        SEEN_COMMITS["$commit_id"]=1
    fi
done

# Get the absolute path of the output file
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"

echo "Find your git-history generated here :"
echo "$OUTPUT_PATH"