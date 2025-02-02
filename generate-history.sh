#!/bin/bash

# Vérification des arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <user_email> <repository_path>"
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
echo "commit_id;branche;commit_title;date;heure" > "$OUTPUT_FILE"

# Récupérer les commits et ajouter la branche
declare -A SEEN_COMMITS # Tableau associatif pour marquer les commits déjà ajoutés
git log --all --author="$USER_EMAIL" --pretty=format:'%H,"%s",%ad' --date=format:'%Y-%m-%d,%H:%M' | while IFS=, read -r commit_id commit_title commit_date commit_time; do
    if [[ -z "${SEEN_COMMITS[$commit_id]}" ]]; then
        branch=$(git branch --all --contains "$commit_id" | head -n 1 | sed 's/*//g' | awk '{$1=$1};1')
        echo "$commit_id;\"$branch\";$commit_title;$commit_date;$commit_time" >> "$OUTPUT_FILE"
        SEEN_COMMITS["$commit_id"]=1  # Marquer le commit comme déjà ajouté
    fi
done

# Obtenir le chemin absolu du fichier généré
OUTPUT_PATH="$(realpath "$OUTPUT_FILE")"
echo "Historique enregistré dans :"
echo "$OUTPUT_PATH"