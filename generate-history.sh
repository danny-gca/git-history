#!/bin/bash

# Vérification des arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <user_email> <repository_path>"
    exit 1
fi

# Vérifie si le script est exécutable
if [ ! -x "$0" ]; then
    echo "Error: You need to execute : chmod +x $0"
    exit 1
fi

USER_EMAIL=$1
REPO_PATH=$2

# Extraire le début de l'email (avant le @)
USER_NAME="${USER_EMAIL%%@*}"

# Générer la date et l'heure actuelle au format [YYYY-MM-DD-HH-MM]
CURRENT_DATE=$(date +"%Y-%m-%d-%H-%M")

# Construire le nom du fichier de sortie
OUTPUT_FILE="git-history.[${REPO_PATH##*/}].[$USER_NAME].[$CURRENT_DATE].csv"

# Se déplacer dans le repo
cd "$REPO_PATH" || { echo "Erreur: Impossible d'accéder au repository"; exit 1; }

# Générer le fichier CSV avec les commits de l'utilisateur
echo "commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time" > "$OUTPUT_FILE"

# Récupérer les commits et ajouter la branche
declare -A SEEN_COMMITS # Tableau associatif pour marquer les commits déjà ajoutés

git_log_output=$(git log --all --author="$USER_EMAIL" --pretty=format:'%H,"%s",%ad' --date=format:'%Y-%m-%d,%H:%M')

# Traiter chaque ligne de git_log_output
IFS=$'\n'
for line in $git_log_output; do
    commit_id=$(echo $line | cut -d',' -f1)
    commit_title=$(echo $line | cut -d',' -f2)
    commit_date=$(echo $line | cut -d',' -f3 | cut -d' ' -f1)
    commit_time=$(echo $line | cut -d',' -f3 | cut -d' ' -f2)

    if [[ -z "${SEEN_COMMITS[$commit_id]}" ]]; then
        # Récupérer la branche qui contient ce commit
        branch=$(git branch --all --contains "$commit_id" | head -n 1 | sed 's/*//g' | awk '{$1=$1};1')

        # Récupérer le nombre de fichiers modifiés
        modified_files=$(git show --stat --oneline "$commit_id" | grep -o '|' | wc -l)

        # Récupérer le nombre de lignes ajoutées et supprimées
        read added_lines deleted_lines <<< $(git show --numstat "$commit_id" | awk '{added+=$1; deleted+=$2} END {print added, deleted}')

        # Ajouter la ligne au fichier CSV
        echo "$commit_id;\"$branch\";$commit_title;$modified_files;$added_lines;$deleted_lines;$commit_date;$commit_time" >> "$OUTPUT_FILE"
        
        SEEN_COMMITS["$commit_id"]=1  # Marquer le commit comme déjà ajouté
    fi
done

# Obtenir le chemin absolu du fichier généré
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"
echo "Historique enregistré dans :"
echo "$OUTPUT_PATH"