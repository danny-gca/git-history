#!/bin/bash
source ./config.sh

# Initialize variables
ALL_REPO_IN_FOLDER=false
USER_EMAIL=""
REPO_PATH=""

# Function to display usage
usage() {
    echo "Usage:"
    echo "-----> exemple 1 : $0 --all <user_email> <folder_path>"
    echo "-----> exemple 2 : $0 <user_email> <repository_path>"
    exit 1
}

# Parse arguments
while [[ "$1" == --* ]]; do
    case "$1" in
    --all)
        ALL_REPO_IN_FOLDER=true
        shift
        ;;
    *)
        usage
        ;;
    esac
done

# Check arguments
if [ "$#" -ne 2 ]; then
    usage
else
    USER_EMAIL=$1
    REPO_PATH=$2
fi

# Checking executable permission
if [ ! -x "$0" ]; then
    echo "Error: You need to execute : chmod +x $0"
    exit 1
fi

# Variables
CURRENT_DATE=$(date +"%Y-%m-%d-%H-%M")
USER_NAME="${USER_EMAIL%%@*}"
OUTPUT_FILE="${REPO_PATH}/git-history.$USER_NAME.$CURRENT_DATE.csv"

# function to do the csv file on one repository
generateHistory() {
    PARAM_REPO_PATH=$1
    PARAM_USERMAIL=$2
    PARAM_OUTPUT_FILE=$3

    # Check if the repository exists and move to it
    cd $PARAM_REPO_PATH || {
        echo "Erreur: Impossible d'accéder au repository"
        exit 1
    }

    # Array to store seen commits
    declare -A SEEN_COMMITS

    # Get the history of the repository for the user
    git_log_output=$(git log --all --author="$PARAM_USERMAIL" --pretty=format:'%H|"%s"|%ad' --date=format:'%Y-%m-%d|%H:%M')

    # Loop through the history
    IFS=$'\n'
    for line in $git_log_output; do
        commit_id=$(echo $line | awk -F'|' '{print $1}')
        commit_title=$(echo $line | awk -F'|' '{print $2}' | sed 's/;/,/g')
        commit_date=$(echo $line | awk -F'|' '{print $3}')
        commit_time=$(echo $line | awk -F'|' '{print $4}')

        if [[ -z "${SEEN_COMMITS[$commit_id]}" ]]; then
            # Project name
            project_name=$(basename "$(git rev-parse --show-toplevel)")

            # Get the branch name
            branch=$(git branch --all --contains "$commit_id" | head -n 1 | sed 's/*//g' | awk '{$1=$1};1' | sed 's/;/,/g')

            # use this command to find modified, added and deleted lines
            git_show_stat=$(git show --stat --oneline "$commit_id")
            modified_files=$(echo "$git_show_stat" | grep -oP '^\s*\d+\s+file' | awk '{s+=$1} END {print s}')
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
            # check if is before 2024
            if [[ "$commit_date" < "2024-01-01" ]]; then
                if [[ "$commit_time" < "$BEFORE_2024_WORKING_HOURS_MORNING_START" ]] || [[ "$commit_time" > "$BEFORE_2024_WORKING_HOURS_MORNING_END" ]] && [[ "$commit_time" < "$BEFORE_2024_WORKING_HOURS_AFTERNOON_START" ]] || [[ "$commit_time" > "$BEFORE_2024_WORKING_HOURS_AFTERNOON_END" ]]; then
                    is_overtime=1
                fi
            else
                # check if is work from home day
                if [[ " ${CURRENT_HOME_DAYS[@]} " =~ " $commit_day " ]]; then
                    # if the commit is before morning start OR
                    # if the commit is after morning end AND
                    # if the commit is before afternoon start OR
                    # if the commit is after afternoon end
                    if [[ "$commit_time" < "$CURRENT_HOME_HOURS_MORNING_START" ]] || [[ "$commit_time" > "$CURRENT_HOME_HOURS_MORNING_END" ]] && [[ "$commit_time" < "$CURRENT_HOME_HOURS_AFTERNOON_START" ]] || [[ "$commit_time" > "$CURRENT_HOME_HOURS_AFTERNOON_END" ]]; then
                        is_overtime=1
                    fi
                fi
                # check if is work from office day
                if [[ " ${CURRENT_OFFICE_DAYS[@]} " =~ " $commit_day " ]]; then
                    # if the commit is before morning start OR
                    # if the commit is after morning end AND
                    # if the commit is before afternoon start OR
                    # if the commit is after afternoon end
                    if [[ "$commit_time" < "$CURRENT_OFFICE_HOURS_MORNING_START" ]] || [[ "$commit_time" > "$CURRENT_OFFICE_HOURS_MORNING_END" ]] && [[ "$commit_time" < "$CURRENT_OFFICE_HOURS_AFTERNOON_START" ]] || [[ "$commit_time" > "$CURRENT_OFFICE_HOURS_AFTERNOON_END" ]]; then
                        is_overtime=1
                    fi
                fi
            fi

            # Write the commit information to the CSV file
            echo "$project_name;$commit_id;\"$branch\";$commit_title;$modified_files;$added_lines;$deleted_lines;$commit_date;$commit_time;$is_overtime;$is_saturday;$is_sunday" >> "$PARAM_OUTPUT_FILE"

            # Mark the commit as seen
            SEEN_COMMITS["$commit_id"]=1
        fi
    done
}

# Creation of the CSV file
echo "user;repository" > "$OUTPUT_FILE"
echo "$USER_EMAIL;$REPO_PATH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Before 2024 working hours;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo ";$BEFORE_2024_WORKING_HOURS_MORNING_START;$BEFORE_2024_WORKING_HOURS_MORNING_END;$BEFORE_2024_WORKING_HOURS_AFTERNOON_START;$BEFORE_2024_WORKING_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Current working hours at office;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo "${CURRENT_OFFICE_DAYS[@]};$CURRENT_OFFICE_HOURS_MORNING_START;$CURRENT_OFFICE_HOURS_MORNING_END;$CURRENT_OFFICE_HOURS_AFTERNOON_START;$CURRENT_OFFICE_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Current working hours at home;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo "${CURRENT_HOME_DAYS[@]};$CURRENT_HOME_HOURS_MORNING_START;$CURRENT_HOME_HOURS_MORNING_END;$CURRENT_HOME_HOURS_AFTERNOON_START;$CURRENT_HOME_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday" >> "$OUTPUT_FILE"

# if option ALL_REPO_IN_FOLDER = true
if [ "$ALL_REPO_IN_FOLDER" = true ]; then
    REPOS_TO_CHECK=$(find "$REPO_PATH" -type d -name .git -exec dirname {} \;) || {
        echo "Erreur: Impossible de trouver les repositories"
        exit 1
    }
    for SUB_REPO in $REPOS_TO_CHECK; do
        generateHistory "$SUB_REPO" "$USER_EMAIL" "$OUTPUT_FILE"
    done
else
    generateHistory "$REPO_PATH" "$USER_EMAIL" "$OUTPUT_FILE"
fi

# Get the absolute path of the output file
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"

echo "📄 Find your git-history generated here :"
echo "\"$OUTPUT_PATH\""
