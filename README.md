# 🕵️‍♂️ git-history

## 📖 Description

`git-history` allows you to generate a detailed commit history for any Git repository.  
Simply provide your email and the repository path, and the script will extract all commits associated with the given user.  

A CSV file is generated at the end, containing key details for each commit:  

- ✅ Commit ID  
- 🌿 Branch name  
- 📝 Commit title  
- 🛠️ Number of modified files  
- ➕ Number of added lines  
- ➖ Number of deleted lines  
- 📅 Commit date  
- ⏰ Commit time  
- ⏳ Whether the commit was made during **overtime**  
- 📆 Whether the commit was made on a **Saturday**  
- 📆 Whether the commit was made on a **Sunday**  

---

## 🚀 Installation

1. **Clone this repository**  

   ```bash
   git clone https://github.com/yourusername/git-history.git
   ```

2. **Ensure the script has execution permissions**  

   ```bash
   chmod +x generate-history.sh
   ```

---

## ⚙️ Customization

- **Copy and rename the configuration file:**  

  ```bash
  cp config.sample.sh config.sh
  ```

  Then, modify `config.sh` as needed.  

- **To set default values in VS Code**, edit `.vscode/tasks.json` and update:  

  ```json
  {
    "default": "your@mail.org",
    "default": "~/path/to/your/repo"
  }
  ```

---

## ✏️ Usage

### 🖥️ Running via Terminal

```bash
./generate-history.sh your@mail.org ~/your/project/path
```

### 💻 Running via VS Code

1. Open **VS Code**  
2. Run the task **"git-history:generate"**  
3. Enter your email (or use the default one)  
4. Enter the project path (or use the default one)  
5. The generated CSV file will appear in a folder `git-history` at the root of your project  

---

## 📂 Example Output

Find your git-history generated here:  
📄 [git-history.(git-history).(your).(2025-02-03-19-49).csv](git-history/git-history.(git-history).(your).(2025-02-03-19-49).csv)

---

🔥 **Enjoy tracking your commits!** 🚀
