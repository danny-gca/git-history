# 🕵️‍♂️ git-history

## 📖 Description

`git-history` allows you to generate a detailed commit history for any Git repository.
Simply provide your email and the repository path, and the script will extract all commits associated with the given user.

A CSV file is generated at the end, containing key details for each commit:

- ✏️ Project name
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
- ⏱️ **Overtime duration** in minutes

Additionally, you can aggregate overtime by day with the `overtime-by-day` script.

---

## 🚀 Installation

1. **Clone this repository**

   ```bash
   git clone https://github.com/yourusername/git-history.git
   cd git-history
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure your working hours**

   ```bash
   cp .env.sample .env
   ```

   Then, edit `.env` to configure your working hours, night time, and date thresholds.

---

## ⚙️ Configuration

Edit the `.env` file to customize your settings:

### Script defaults (optional)

```env
# Default user email (optional)
USER_EMAIL=your@email.com

# Default repository path (optional)
PROJECT_PATH=~/projects/my-project

# Default export path (optional, defaults to ./export)
# EXPORT_PATH=~/custom-export

# Process all repositories in folder (true/false, optional)
PROCESS_ALL=false
```

### Working hours configuration

```env
# Date before which old working hours apply (YYYY-MM-DD)
DATE_BEFORE=2024-02-01

# Night time range (HH:mm format)
NIGHT_TIME_START=22:00
NIGHT_TIME_END=04:00

# Working hours before DATE_BEFORE
BEFORE_DATE_MORNING_START=09:00
BEFORE_DATE_MORNING_END=12:00
BEFORE_DATE_AFTERNOON_START=14:00
BEFORE_DATE_AFTERNOON_END=18:00

# Current working hours at home (days: 1=Monday, 7=Sunday)
CURRENT_HOME_DAYS=4,5
CURRENT_HOME_MORNING_START=08:30
CURRENT_HOME_MORNING_END=12:00
CURRENT_HOME_AFTERNOON_START=14:00
CURRENT_HOME_AFTERNOON_END=17:30

# Current working hours at office
CURRENT_OFFICE_DAYS=1,2,3
CURRENT_OFFICE_MORNING_START=08:30
CURRENT_OFFICE_MORNING_END=12:30
CURRENT_OFFICE_AFTERNOON_START=13:30
CURRENT_OFFICE_AFTERNOON_END=16:30
```

---

## ✏️ Usage

### 🖥️ Generate commit history

The script generates CSV files in the `./export` folder by default.

#### Method 1: Using .env defaults (recommended)

Configure your defaults in `.env`:

```env
USER_EMAIL=your@email.com
PROJECT_PATH=~/projects/my-folder
PROCESS_ALL=true
```

Then simply run:

```bash
./git-history
```

#### Method 2: With command line options

```bash
# For a single project
./git-history -e your@mail.org -p ~/your/project/path

# For multiple projects
./git-history --all -e your@mail.org -p ~/your/folder/path

# With custom export folder
./git-history --all -e your@mail.org -p ~/your/folder/path -x ~/custom-export

# Generate overtime-by-day automatically (no prompt)
./git-history -d
./git-history --all -e your@mail.org -p ~/your/folder/path -d
```

#### Method 3: Override .env defaults

You can override any .env default with command line options:

```bash
# Use .env defaults but change the email
./git-history -e other@email.com

# Use .env defaults but change the path
./git-history -p ~/different/project
```

#### Method 4: Legacy syntax (still supported)

```bash
# For a single project
./git-history your@mail.org ~/your/project/path

# For multiple projects
./git-history --all your@mail.org ~/your/folder/path
```

#### Available options

- `-e, --email` : User email address (overrides `USER_EMAIL` in .env)
- `-p, --path` : Repository path (overrides `PROJECT_PATH` in .env)
- `-x, --export` : Custom export folder (overrides `EXPORT_PATH` in .env, default: ./export)
- `-d, --day` : Generate overtime-by-day automatically after git-history (no prompt)
- `--all` : Process all repositories in folder (overrides `PROCESS_ALL` in .env)

### 📊 Aggregate overtime by day

After generating the commit history, you can aggregate overtime by day:

```bash
./overtime-by-day /path/to/git-history.csv /output/folder
```

This will generate a CSV file with overtime aggregated by day, showing:
- **before_morning**: Minutes worked before morning start
- **after_morning**: Minutes worked after morning end (lunch break)
- **before_afternoon**: Minutes worked before afternoon start (lunch break)
- **afterwork**: Minutes worked after work hours
- **night**: Minutes worked at night (22:00-04:00)
- **saturday**: Minutes worked on Saturday (calculated from first to last commit)
- **sunday**: Minutes worked on Sunday (calculated from first to last commit)
- **total**: Total overtime for the day

---

## 🧪 Tests

Run the test suite to ensure everything works correctly:

```bash
npm test
```

For watch mode during development:

```bash
npm run test:watch
```

---

## 📂 Example Output

### Commit history CSV

Generated in `./export/git-history.username.2025-10-27-14-30.csv`:

```csv
user;repository
your@mail.org;~/your/project

Before 2024-02-01 working hours;morning_start;morning_end;afternoon_start;afternoon_end
;09:00;12:00;14:00;18:00

Current working hours at office;morning_start;morning_end;afternoon_start;afternoon_end
1 2 3;08:30;12:30;13:30;16:30

Current working hours at home;morning_start;morning_end;afternoon_start;afternoon_end
4 5;08:30;12:00;14:00;17:30

project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday;overtime_in_min
my-project;abc123;main;feat: add new feature;5;120;30;2025-05-06;18:30;1;0;0;60
my-project;def456;main;fix: correct bug;2;45;10;2025-05-10;14:00;1;1;0;0
```

### Overtime by day CSV

Generated by `./overtime-by-day`:

```csv
date;before_morning;after_morning;before_afternoon;afterwork;night;saturday;sunday;total
2025-05-06;0;0;0;60;0;0;0;60
2025-05-10;0;0;0;0;0;240;0;240
2025-05-11;0;0;0;0;0;0;180;180
```

---

## 🏗️ Project Structure

```
git-history/
├── src/
│   ├── config.ts              # Configuration loader
│   ├── types.ts               # TypeScript types
│   ├── git-parser.ts          # Git commit extraction
│   ├── overtime-calc.ts       # Overtime calculation logic
│   ├── csv-writer.ts          # CSV file generation
│   ├── generate-history.ts    # Main script
│   └── overtime-by-day.ts     # Daily aggregation script
├── tests/
│   └── overtime-calc.test.ts  # Unit tests
├── export/                    # Generated CSV files (default)
├── git-history                # Executable wrapper script
├── overtime-by-day            # Executable wrapper script
├── .env.sample                # Sample configuration
├── .env                       # Your configuration (not committed)
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

🔥 **Enjoy tracking your commits!** 🚀
