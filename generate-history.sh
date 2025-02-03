#!/bin/bash
source ./config.sh

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

# Parameters
USER_EMAIL=$1
REPO_PATH=$2

# Variables
CURRENT_DATE=$(date +"%Y-%m-%d-%H-%M")
USER_NAME="${USER_EMAIL%%@*}"
OUTPUT_FILE="git-history/git-history.(${REPO_PATH##*/}).($USER_NAME).($CURRENT_DATE).csv"

# Check if the repository exists and move to it
cd "$REPO_PATH" || { echo "Erreur: Impossible d'accéder au repository"; exit 1; }

# Create the directory for the output file
mkdir -p git-history

# Creation of the CSV file
echo "user;$USER_EMAIL" > "$OUTPUT_FILE"
echo "repository;$REPO_PATH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday" >> "$OUTPUT_FILE"

# Array to store seen commits
declare -A SEEN_COMMITS

# Get the history of the repository for the user
git_log_output=$(git log --all --author="$USER_EMAIL" --pretty=format:'%H,"%s",%ad' --date=format:'%Y-%m-%d,%H:%M')

# Loop through the history
IFS=$'\n'
for line in $git_log_output; do
    commit_id=$(echo $line | awk -F',' '{print $1}')
    commit_title=$(echo $line | awk -F',' '{print $2}' | sed 's/,/;/g')
    commit_date=$(echo $line | awk -F',' '{print $3}')
    commit_time=$(echo $line | awk -F',' '{print $4}')

    if [[ -z "${SEEN_COMMITS[$commit_id]}" ]]; then
        # Get the branch name
        branch=$(git branch --all --contains "$commit_id" | head -n 1 | sed 's/*//g' | awk '{$1=$1};1')

        # use this command to find modified, added and deleted lines
        git_show_stat=$(git show --stat --oneline "$commit_id")
        modified_files=$(echo "$git_show_stat" | grep -oP '^\s+\d+\s+file' | wc -l)
        added_lines=$(echo "$git_show_stat" | grep -oP '\d+(?= insertions?\(\+\))' | awk '{s+=$1} END {print s}')
        deleted_lines=$(echo "$git_show_stat" | grep -oP '\d+(?= deletions?\(-\))' | awk '{s+=$1} END {print s}')
        if [[ -z "$added_lines" ]]; then
            added_lines=0
        fi
        if [[ -z "$deleted_lines" ]]; then
            deleted_lines=0
        fi

        # Check if the commit was done on a weekend
        commit_day=$(date -d "$commit_date" +%u)
        is_overtime=0
        is_saturday=0
        is_sunday=0
        if [[ "$commit_day" -eq 6 ]]; then
            is_saturday=1
            is_overtime=1
        fi
        if [[ "$commit_day" -eq 7 ]]; then
            is_sunday=1
            is_overtime=1
        fi

        # Check if the commit was done outside of working hours
        commit_hour=$(date -d "$commit_time" +%H.%M)
        # check if is before 2024
        if [[ "$commit_date" < "2024-01-01" ]]; then
            if [[ "$commit_hour" < "$BEFORE_2024_WORKING_HOURS_MORNING_START" ]] || [[ "$commit_hour" > "$BEFORE_2024_WORKING_HOURS_MORNING_END" ]] && [[ "$commit_hour" < "$BEFORE_2024_WORKING_HOURS_AFTERNOON_START" ]] || [[ "$commit_hour" > "$BEFORE_2024_WORKING_HOURS_AFTERNOON_END" ]]; then
                is_overtime=1
            fi
        else
            # check if is work from home day
            if [[ " ${CURRENT_HOME_DAYS[@]} " =~ " $commit_day " ]]; then
                # if the commit is before morning start OR
                # if the commit is after morning end AND
                # if the commit is before afternoon start OR
                # if the commit is after afternoon end
                if [[ "$commit_hour" < "$CURRENT_HOME_HOURS_MORNING_START" ]] || [[ "$commit_hour" > "$CURRENT_HOME_HOURS_MORNING_END" ]] && [[ "$commit_hour" < "$CURRENT_HOME_HOURS_AFTERNOON_START" ]] || [[ "$commit_hour" > "$CURRENT_HOME_HOURS_AFTERNOON_END" ]]; then
                    is_overtime=1
                fi
            fi
            # check if is work from office day
            if [[ " ${CURRENT_OFFICE_DAYS[@]} " =~ " $commit_day " ]]; then
                # if the commit is before morning start OR
                # if the commit is after morning end AND
                # if the commit is before afternoon start OR
                # if the commit is after afternoon end
                if [[ "$commit_hour" < "$CURRENT_OFFICE_HOURS_MORNING_START" ]] || [[ "$commit_hour" > "$CURRENT_OFFICE_HOURS_MORNING_END" ]] && [[ "$commit_hour" < "$CURRENT_OFFICE_HOURS_AFTERNOON_START" ]] || [[ "$commit_hour" > "$CURRENT_OFFICE_HOURS_AFTERNOON_END" ]]; then
                    is_overtime=1
                fi
            fi
        fi

        # Write the commit information to the CSV file
        echo "$commit_id;\"$branch\";$commit_title;$modified_files;$added_lines;$deleted_lines;$commit_date;$commit_time;$is_overtime;$is_saturday;$is_sunday" >> "$OUTPUT_FILE"
        
        # Mark the commit as seen
        SEEN_COMMITS["$commit_id"]=1
    fi
done

# Get the absolute path of the output file
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"

echo "Find your git-history generated here :"
echo "$OUTPUT_PATH"