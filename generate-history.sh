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

    echo "⛏️  Génération de l'historique pour le repository : $PARAM_REPO_PATH"

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
        overtime_in_min=0 # Overtime quantity in minutes

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
            if [[ "$commit_date" < $DATE_BEFORE ]]; then
                working_hours_morning_start="$BEFORE_DATE_WORKING_HOURS_MORNING_START"
                working_hours_morning_end="$BEFORE_DATE_WORKING_HOURS_MORNING_END"
                working_hours_afternoon_start="$BEFORE_DATE_WORKING_HOURS_AFTERNOON_START"
                working_hours_afternoon_end="$BEFORE_DATE_WORKING_HOURS_AFTERNOON_END"
            elif [[ " ${CURRENT_HOME_DAYS[@]} " =~ " $commit_day " ]]; then
                working_hours_morning_start="$CURRENT_HOME_HOURS_MORNING_START"
                working_hours_morning_end="$CURRENT_HOME_HOURS_MORNING_END"
                working_hours_afternoon_start="$CURRENT_HOME_HOURS_AFTERNOON_START"
                working_hours_afternoon_end="$CURRENT_HOME_HOURS_AFTERNOON_END"
            elif [[ " ${CURRENT_OFFICE_DAYS[@]} " =~ " $commit_day " ]]; then
                working_hours_morning_start="$CURRENT_OFFICE_HOURS_MORNING_START"
                working_hours_morning_end="$CURRENT_OFFICE_HOURS_MORNING_END"
                working_hours_afternoon_start="$CURRENT_OFFICE_HOURS_AFTERNOON_START"
                working_hours_afternoon_end="$CURRENT_OFFICE_HOURS_AFTERNOON_END"
            fi

            if [[ -n "$working_hours_morning_start" ]]; then
                # check if night time (22h-4h)
                if [[ "$commit_time" > "$NIGHT_TIME_START" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    night_start_in_seconds=$(date -d "$NIGHT_TIME_START" +%s)
                    overtime_in_min=$(( (commit_time_in_seconds - night_start_in_seconds) / 60 ))
                    is_overtime=1
                elif [[ "$commit_time" < "$NIGHT_TIME_END" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    night_start_in_seconds=$(date -d "$NIGHT_TIME_START" +%s)
                    before_midnight_in_seconds=$(date -d "23:59" +%s)
                    midnight_in_seconds=$(date -d "00:00" +%s)
                    # calculate from night start to midnight
                    diff_night=$(( (before_midnight_in_seconds - night_start_in_seconds) / 60 ))
                    # calculate from midnight to commit time
                    diff_commit=$(( (commit_time_in_seconds - midnight_in_seconds) / 60 ))
                    # check if the commit time is before or after midnight
                    overtime_in_min=$(( diff_night + diff_commit ))
                    is_overtime=1
                elif [[ "$commit_time" < "$working_hours_morning_start" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    morning_start_in_seconds=$(date -d "$working_hours_morning_start" +%s)
                    overtime_in_min=$(( (morning_start_in_seconds - commit_time_in_seconds) / 60 ))
                    is_overtime=1
                elif [[ "$commit_time" > "$working_hours_morning_end" && "$commit_time" < "$working_hours_afternoon_start" ]]; then
                    # Prendre le temps le plus proche
                    # (exemple 1 : commit à 12h04 et fin de matinée à 12h00 = 4 minutes)
                    # (exemple 2 : commit à 13h45 et début d'aprem à 14h00 = 15 minutes)
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    morning_end_in_seconds=$(date -d "$working_hours_morning_end" +%s)
                    afternoon_start_in_seconds=$(date -d "$working_hours_afternoon_start" +%s)
                    # calcule de la différence entre le commit et la fin de matinée
                    diff_morning=$(( (commit_time_in_seconds - morning_end_in_seconds) / 60 ))
                    diff_afternoon=$(( (afternoon_start_in_seconds - commit_time_in_seconds) / 60 ))
                    if [[ $diff_morning -lt $diff_afternoon ]]; then
                        overtime_in_min=$(( diff_morning ))
                    else
                        overtime_in_min=$(( diff_afternoon ))
                    fi
                    is_overtime=1
                elif [[ "$commit_time" > "$working_hours_afternoon_end" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    afternoon_end_in_seconds=$(date -d "$working_hours_afternoon_end" +%s)
                    overtime_in_min=$(( (commit_time_in_seconds - afternoon_end_in_seconds) / 60 ))
                fi
            fi

            # Write the commit information to the CSV file
            echo "$project_name;$commit_id;\"$branch\";$commit_title;$modified_files;$added_lines;$deleted_lines;$commit_date;$commit_time;$is_overtime;$is_saturday;$is_sunday;$overtime_in_min" >> "$PARAM_OUTPUT_FILE"

            # Mark the commit as seen
            SEEN_COMMITS["$commit_id"]=1
        fi
    done
}

# Creation of the CSV file
echo "▶️  Création du fichier"
echo "user;repository" > "$OUTPUT_FILE"
echo "$USER_EMAIL;$REPO_PATH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Before $DATE_BEFORE working hours;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo ";$BEFORE_DATE_WORKING_HOURS_MORNING_START;$BEFORE_DATE_WORKING_HOURS_MORNING_END;$BEFORE_DATE_WORKING_HOURS_AFTERNOON_START;$BEFORE_DATE_WORKING_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Current working hours at office;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo "${CURRENT_OFFICE_DAYS[@]};$CURRENT_OFFICE_HOURS_MORNING_START;$CURRENT_OFFICE_HOURS_MORNING_END;$CURRENT_OFFICE_HOURS_AFTERNOON_START;$CURRENT_OFFICE_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Current working hours at home;morning_start;morning_end;afternoon_start;afternoon_end" >> "$OUTPUT_FILE"
echo "${CURRENT_HOME_DAYS[@]};$CURRENT_HOME_HOURS_MORNING_START;$CURRENT_HOME_HOURS_MORNING_END;$CURRENT_HOME_HOURS_AFTERNOON_START;$CURRENT_HOME_HOURS_AFTERNOON_END" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday;overtime_in_min" >> "$OUTPUT_FILE"

# if option ALL_REPO_IN_FOLDER = true
if [ "$ALL_REPO_IN_FOLDER" = true ]; then
    echo "⚙️  Parcours de tous les repo dans : $REPO_PATH"
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
