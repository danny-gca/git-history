#!/bin/bash
source ./config.sh

# Initialize variables
PATH_TO_CSV=""
OUTPUT_PATH=""

# Function to display usage
usage() {
    echo "Usage:"
    echo "$0 <CSV_file_path> <Output_file_path>"
    exit 1
}

# Check arguments
if [ "$#" -ne 2 ]; then
    usage
else
    PATH_TO_CSV=$1
    OUTPUT_PATH=$2
fi

# Checking executable permission
if [ ! -x "$0" ]; then
    echo "Error: You need to execute : chmod +x $0"
    exit 1
fi

# Variables
CURRENT_DATE=$(date +"%Y-%m-%d-%H-%M")
OUTPUT_FILE="${OUTPUT_PATH}/overtime-by-day.$CURRENT_DATE.csv"

# function to do the csv file on one repository
generateOvertimeByDay() {
    PARAM_CSV_PATH=$1
    PARAM_OUTPUT_PATH=$2
    PARAM_OUTPUT_FILE=$3

    echo "⛏️  Calcul des heures supp depuis : $PARAM_CSV_PATH"

    # Check if CSV file exists 
    if [ ! -f "$PARAM_CSV_PATH" ]; then
        echo "Error: CSV file not found!"
        exit 1
    fi

    # Array to store dates
    declare -A DATES_ARRAY

    # Parcours de chaque ligne du CSV
    IS_INSIDE_ARRAY=0
    while IFS=";" read -r line; do
        # Skip the first line (header)
        if [[ "$line" == "project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday;overtime_in_min" ]]; then
            IS_INSIDE_ARRAY=1
            continue
        fi

        if [[ $IS_INSIDE_ARRAY -eq 1 ]]; then
            # Read the CSV line
            IFS=";" read -r project_name commit_id branch commit_title modified_files added_lines deleted_lines commit_date commit_time is_overtime is_saturday is_sunday overtime_in_min <<< "$line"

            # Variables for output
            commit_day=$(date -d "$commit_date" +%u)
            commit_time=$(echo "$commit_time" | sed 's/;/,/g')
            output_date_time=$(date -d "$commit_date $commit_time" +%Y-%m-%dT%H:%M:%S)
            
            # Initialize the dates in the array
            if [[ -z "${DATES_ARRAY[$commit_date,before_morning]}" ]]; then
                DATES_ARRAY["$commit_date,before_morning"]=0
                DATES_ARRAY["$commit_date,after_morning"]=0
                DATES_ARRAY["$commit_date,before_afternoon"]=0
                DATES_ARRAY["$commit_date,afterwork"]=0
                DATES_ARRAY["$commit_date,min_night"]=0
                DATES_ARRAY["$commit_date,max_night"]=0
                DATES_ARRAY["$commit_date,total_night"]=0
                DATES_ARRAY["$commit_date,min_saturday"]=0
                DATES_ARRAY["$commit_date,max_saturday"]=0
                DATES_ARRAY["$commit_date,total_saturday"]=0
                DATES_ARRAY["$commit_date,min_sunday"]=0
                DATES_ARRAY["$commit_date,max_sunday"]=0
                DATES_ARRAY["$commit_date,total_sunday"]=0
            fi

            # Check if the commit was done on a weekend
            if [[ "$commit_day" -eq 6 ]]; then
                # Check if min_saturday is equal to 0
                if [[ "${DATES_ARRAY[$commit_date,min_saturday]}" == 0 ]]; then
                    DATES_ARRAY["$commit_date,min_saturday"]=$output_date_time
                    continue
                fi
                # Check if min_saturday is greater than the current date
                if [[ "$output_date_time" < "${DATES_ARRAY[$commit_date,min_saturday]}" ]]; then
                    DATES_ARRAY["$commit_date,max_saturday"]="${DATES_ARRAY[$commit_date,min_saturday]}"
                    DATES_ARRAY["$commit_date,min_saturday"]=$output_date_time
                else
                    DATES_ARRAY["$commit_date,max_saturday"]=$output_date_time
                fi
                # Calculate the total time spent on Saturday
                min_saturday="${DATES_ARRAY[$commit_date,min_saturday]}"
                max_saturday="${DATES_ARRAY[$commit_date,max_saturday]}"
                # Calculate the difference in seconds
                min_saturday_in_seconds=$(date -d "$min_saturday" +%s)
                max_saturday_in_seconds=$(date -d "$max_saturday" +%s)
                diff_in_seconds=$(( max_saturday_in_seconds - min_saturday_in_seconds ))
                # Convert to minutes
                diff_in_minutes=$(( diff_in_seconds / 60 ))
                DATES_ARRAY["$commit_date,total_saturday"]=$diff_in_minutes
                continue
            fi
            if [[ "$commit_day" -eq 7 ]]; then
                # Check if min_sunday is equal to 0
                if [[ "${DATES_ARRAY[$commit_date,min_sunday]}" == 0 ]]; then
                    DATES_ARRAY["$commit_date,min_sunday"]=$output_date_time
                    continue
                fi
                # Check if min_sunday is greater than the current date
                if [[ "$output_date_time" < "${DATES_ARRAY[$commit_date,min_sunday]}" ]]; then
                    DATES_ARRAY["$commit_date,max_sunday"]="${DATES_ARRAY[$commit_date,min_sunday]}"
                    DATES_ARRAY["$commit_date,min_sunday"]=$output_date_time
                else
                    DATES_ARRAY["$commit_date,max_sunday"]=$output_date_time
                fi
                # Calculate the total time spent on Sunday
                min_sunday="${DATES_ARRAY[$commit_date,min_sunday]}"
                max_sunday="${DATES_ARRAY[$commit_date,max_sunday]}"
                # Calculate the difference in seconds
                min_sunday_in_seconds=$(date -d "$min_sunday" +%s)
                max_sunday_in_seconds=$(date -d "$max_sunday" +%s)
                diff_in_seconds=$(( max_sunday_in_seconds - min_sunday_in_seconds ))
                # Convert to minutes
                diff_in_minutes=$(( diff_in_seconds / 60 ))
                DATES_ARRAY["$commit_date,total_sunday"]=$diff_in_minutes
                continue
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

            # Check if the commit was done before morning working hours
            if [[ -n "$working_hours_morning_start" ]]; then
                # check if night time (22h-4h)
                if [[ "$commit_time" > "$NIGHT_TIME_START" ]]; then
                    # Check if min_night is equal to 0
                    if [[ "${DATES_ARRAY[$commit_date,min_night]}" == 0 ]]; then
                        DATES_ARRAY["$commit_date,min_night"]=$output_date_time
                        continue
                    fi
                    # Check if min_night is greater than the current date
                    if [[ "$output_date_time" < "${DATES_ARRAY[$commit_date,min_night]}" ]]; then
                        DATES_ARRAY["$commit_date,max_night"]="${DATES_ARRAY[$commit_date,min_night]}"
                        DATES_ARRAY["$commit_date,min_night"]=$output_date_time
                    else
                        DATES_ARRAY["$commit_date,max_night"]=$output_date_time
                    fi
                    # Calculate the total time spent at night
                    min_night="${DATES_ARRAY[$commit_date,min_night]}"
                    max_night="${DATES_ARRAY[$commit_date,max_night]}"
                    # Calculate the difference in seconds
                    min_night_in_seconds=$(date -d "$min_night" +%s)
                    max_night_in_seconds=$(date -d "$max_night" +%s)
                    diff_in_seconds=$(( max_night_in_seconds - min_night_in_seconds ))
                    # Convert to minutes
                    diff_in_minutes=$(( diff_in_seconds / 60 ))
                    DATES_ARRAY["$commit_date,total_night"]=$diff_in_minutes
                    continue
                elif [[ "$commit_time" < "$NIGHT_TIME_END" ]]; then
                    # Check if min_night is equal to 0
                    if [[ "${DATES_ARRAY[$commit_date,min_night]}" == 0 ]]; then
                        DATES_ARRAY["$commit_date,min_night"]=$output_date_time
                        continue
                    fi
                    # Check if min_night is greater than the current date
                    if [[ "$output_date_time" < "${DATES_ARRAY[$commit_date,min_night]}" ]]; then
                        DATES_ARRAY["$commit_date,max_night"]="${DATES_ARRAY[$commit_date,min_night]}"
                        DATES_ARRAY["$commit_date,min_night"]=$output_date_time
                    else
                        DATES_ARRAY["$commit_date,max_night"]=$output_date_time
                    fi
                    # Calculate the total time spent at night
                    min_night="${DATES_ARRAY[$commit_date,min_night]}"
                    max_night="${DATES_ARRAY[$commit_date,max_night]}"
                    # Calculate the difference in seconds
                    min_night_in_seconds=$(date -d "$min_night" +%s)
                    max_night_in_seconds=$(date -d "$max_night" +%s)
                    diff_in_seconds=$(( max_night_in_seconds - min_night_in_seconds ))
                    # Convert to minutes
                    diff_in_minutes=$(( diff_in_seconds / 60 ))
                    DATES_ARRAY["$commit_date,total_night"]=$diff_in_minutes
                    continue
                fi

                if [[ "$commit_time" < "$working_hours_morning_start" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    morning_start_in_seconds=$(date -d "$working_hours_morning_start" +%s)
                    overtime_in_min=$(( (morning_start_in_seconds - commit_time_in_seconds) / 60 ))
                    DATES_ARRAY["$commit_date,before_morning"]=$overtime_in_min
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
                        DATES_ARRAY["$commit_date,after_morning"]=$overtime_in_min
                    else
                        overtime_in_min=$(( diff_afternoon ))
                        DATES_ARRAY["$commit_date,before_afternoon"]=$overtime_in_min
                    fi
                elif [[ "$commit_time" > "$working_hours_afternoon_end" ]]; then
                    commit_time_in_seconds=$(date -d "$commit_time" +%s)
                    afternoon_end_in_seconds=$(date -d "$working_hours_afternoon_end" +%s)
                    overtime_in_min=$(( (commit_time_in_seconds - afternoon_end_in_seconds) / 60 ))
                    DATES_ARRAY["$commit_date,afterwork"]=$overtime_in_min
                fi
            fi
        fi
    done < "$PARAM_CSV_PATH"

    # Write the dates and overtime to the new CSV file
    # Parcourir le tableau associatif
    # Nouveau tableau associatif pour stocker les résultats
    declare -A OUTPUT_DATES_ARRAY
    for key in "${!DATES_ARRAY[@]}"; do
        # Split the key into date and category
        IFS=',' read -r dateinside category <<< "$key" # Example: 2025-05-06 before_morning
        # Get the value from the array
        value=${DATES_ARRAY[$key]} # Example: 15
        # DATES_ARRAY["$commit_date,before_morning"]=0
        # DATES_ARRAY["$commit_date,after_morning"]=0
        # DATES_ARRAY["$commit_date,before_afternoon"]=0
        # DATES_ARRAY["$commit_date,afterwork"]=0
        output_date=$(date -d "$dateinside" +%Y-%m-%d)
        output_before_morning=0
        output_after_morning=0
        output_before_afternoon=0
        output_afterwork=0
        output_night=0
        output_saturday=0
        output_sunday=0
        if [[ "$category" == "before_morning" ]]; then
            output_before_morning=$value
        elif [[ "$category" == "after_morning" ]]; then
            output_after_morning=$value
        elif [[ "$category" == "before_afternoon" ]]; then
            output_before_afternoon=$value
        elif [[ "$category" == "afterwork" ]]; then
            output_afterwork=$value
        elif [[ "$category" == "total_night" ]]; then
            output_night=$value
        elif [[ "$category" == "total_saturday" ]]; then
            output_saturday=$value
        elif [[ "$category" == "total_sunday" ]]; then
            output_sunday=$value
        fi
        # Check if the date already exists in the OUTPUT_DATES_ARRAY
        if [[ -z "${OUTPUT_DATES_ARRAY[$output_date]}" ]]; then
            OUTPUT_DATES_ARRAY["$output_date"]="$output_before_morning;$output_after_morning;$output_before_afternoon;$output_afterwork;$output_night;$output_saturday;$output_sunday"
        else
            # Add the values to the existing date
            IFS=';' read -r before_morning after_morning before_afternoon afterwork night saturday sunday <<< "${OUTPUT_DATES_ARRAY[$output_date]}"
            OUTPUT_DATES_ARRAY["$output_date"]="$(( before_morning + output_before_morning ));$(( after_morning + output_after_morning ));$(( before_afternoon + output_before_afternoon ));$(( afterwork + output_afterwork ));$(( night + output_night ));$(( saturday + output_saturday ));$(( sunday + output_sunday ))"
        fi
    done

    # Write the results to the CSV file
    for key in "${!OUTPUT_DATES_ARRAY[@]}"; do
        IFS=';' read -r before_morning after_morning before_afternoon afterwork night saturday sunday total <<< "${OUTPUT_DATES_ARRAY[$key]}"
        total=$(( before_morning + after_morning + before_afternoon + afterwork + night + saturday + sunday ))
        echo "$key;$before_morning;$after_morning;$before_afternoon;$afterwork;$night;$saturday;$sunday;$total" >> "$PARAM_OUTPUT_FILE"
    done
}

# Creation of the CSV file
echo "▶️  Création du fichier"
echo "date;before_morning;after_morning;before_afternoon;afterwork;night;saturday;sunday;total" >> "$OUTPUT_FILE"

generateOvertimeByDay "$PATH_TO_CSV" "$OUTPUT_PATH" "$OUTPUT_FILE"

# Get the absolute path of the output file
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"

echo "✅  Fichier CSV généré :"
echo "\"$OUTPUT_PATH\""
