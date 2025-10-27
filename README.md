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

Edit the `.env` file to customize your working hours:

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

#### For a single project

```bash
npm run generate -- your@mail.org ~/your/project/path
```

#### For multiple projects

```bash
npm run generate -- --all your@mail.org ~/your/folder/path
```

### 📊 Aggregate overtime by day

After generating the commit history, you can aggregate overtime by day:

```bash
npm run overtime-by-day -- /path/to/git-history.csv /output/folder
```

This will generate a CSV file with overtime aggregated by day, showing:
- Minutes worked before morning start
- Minutes worked after morning end (lunch break)
- Minutes worked before afternoon start (lunch break)
- Minutes worked after work hours
- Minutes worked at night (22:00-04:00)
- Minutes worked on Saturday
- Minutes worked on Sunday
- Total overtime for the day

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

```
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
```

### Overtime by day CSV

```
date;before_morning;after_morning;before_afternoon;afterwork;night;saturday;sunday;total
2025-05-06;0;0;0;60;0;0;0;60
2025-05-10;0;0;0;0;0;240;0;240
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
├── .env.sample                # Sample configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

🔥 **Enjoy tracking your commits!** 🚀
