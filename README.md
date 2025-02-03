# git-history

## Description
This project allows you to get a detailed history by commit of your repository.
You must enter your email and the path to a repository.
The program will browse all the commits that concern the requested user and generate a file in CSV format.
The path to the file is displayed at the end of the program.

It allows you to obtain, on each commit, the following data:
- The commit id
- The branch name
- The commit title
- The number of modified files
- The number of added lines
- The number of deleted lines
- The date of the commit
- The time of the commit

## Initialisation
- Clone this repository where you want
- Make sure to have the full right on the file "generate-history.sh"
```
chmod +x generate-history.sh
```

## Customization
- Copy / paste the "config.sample.sh" file and set it up as you want
- You can change your default inputs in ".vscode/tasks.json"
  - "default": "your@mail.org"
  - "default": "~/path/to/your/repo"

## Usage
- Launch the VsCode task "git-history:generate"
- Enter your email (or use the default one)
- Enter the path of the project (or use the default one)
- It will generate a file at the root of your project

## Sample
- You could find a sample of a CSV generated here : 
[git-history.[git-history].[danny-gca].[2025-02-02-23-58].csv](git-history/git-history.[git-history].[danny-gca].[2025-02-02-23-58].csv)
