# Stroop Lab

A high-fidelity Stroop Effect experiment web application with millisecond-precision timing and comprehensive data visualization.

![Next.js](https://img.shields.io/badge/Next.js-16.1.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)
![Playwright](https://img.shields.io/badge/Playwright-E2E%20Tests-green)

## Live Demo

**Production:** [https://stroop-lab-production.up.railway.app](https://stroop-lab-production.up.railway.app)

## Overview

The Stroop Effect demonstrates cognitive interference when the brain processes conflicting information. In this experiment, participants identify the **font color** of color words (e.g., the word "RED" displayed in green ink). Response times are measured with millisecond precision.

### Features

- 20-trial experiment with balanced congruent/incongruent conditions
- Keyboard shortcuts (Y/G/R) and button input
- Real-time progress tracking
- 5 visualization types for results analysis
- Multi-user session isolation
- Database persistence with Supabase
- Comprehensive E2E test suite

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 16.1.3 | React framework with App Router |
| [React](https://react.dev/) | 19.2.3 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | 12.x | Animations |
| [Recharts](https://recharts.org/) | 3.6.x | Data visualization |
| [Lucide React](https://lucide.dev/) | 0.562.x | Icons |

### Backend & Data
| Technology | Purpose |
|------------|---------|
| [Supabase](https://supabase.com/) | PostgreSQL database + Auth |
| [UUID](https://github.com/uuidjs/uuid) | Session ID generation |

### Testing & CI
| Technology | Purpose |
|------------|---------|
| [Playwright](https://playwright.dev/) | E2E testing (34 tests) |
| [GitHub Actions](https://github.com/features/actions) | CI/CD pipeline |
| [ESLint](https://eslint.org/) | Code linting |

### Deployment
| Platform | Purpose |
|----------|---------|
| [Railway](https://railway.app/) | Hosting & deployment |
| [GitHub](https://github.com/) | Source control |

## Project Structure

```
stroop-lab/
├── app/
│   ├── layout.tsx              # Root layout with dark theme
│   ├── page.tsx                # Landing page with instructions
│   ├── globals.css             # Tailwind + custom theme
│   ├── experiment/
│   │   └── page.tsx            # Trial interface with timing
│   └── results/
│       └── page.tsx            # Results dashboard
├── components/
│   ├── trial-display.tsx       # Stimulus word component
│   ├── response-buttons.tsx    # Y/G/R input buttons
│   ├── progress-bar.tsx        # Trial progress indicator
│   ├── results-chart.tsx       # Grouped bar chart
│   ├── visualization-tabs.tsx  # Tab selector
│   └── charts/
│       ├── distribution-chart.tsx   # Raincloud-style plot
│       ├── spaghetti-chart.tsx      # Word comparison lines
│       ├── difference-chart.tsx     # Effect size bars
│       └── speed-accuracy-chart.tsx # Trade-off scatter
├── lib/
│   ├── supabase.ts             # Database client
│   ├── experiment.ts           # Trial generation logic
│   └── timing.ts               # performance.now() utilities
├── types/
│   └── index.ts                # TypeScript interfaces
├── tests/
│   ├── experiment-flow.spec.ts      # Flow tests
│   ├── graph-calculations.spec.ts   # Chart validation
│   ├── multi-user.spec.ts           # Session isolation
│   ├── database-operations.spec.ts  # DB operations
│   └── utils/
│       └── test-helpers.ts          # Mock data generators
├── .github/
│   └── workflows/
│       └── test.yml            # CI pipeline
├── playwright.config.ts        # Test configuration
├── supabase-schema.sql         # Database schema
└── .env.local.example          # Environment template
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- [Supabase](https://supabase.com/) account (free tier works)
- [Claude Code](https://claude.ai/claude-code) (for AI-assisted development)

### 1. Clone the Repository

```bash
git clone https://github.com/benhaimmatan/stroop-lab.git
cd stroop-lab
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`:

```sql
-- Create the stroop_results table
CREATE TABLE stroop_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  word_text text NOT NULL,
  font_color text NOT NULL,
  is_congruent boolean NOT NULL,
  reaction_time_ms float8 NOT NULL,
  user_response text NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster session queries
CREATE INDEX idx_stroop_results_session_id ON stroop_results(session_id);

-- Enable Row Level Security
ALTER TABLE stroop_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow anonymous inserts" ON stroop_results
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous selects" ON stroop_results
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous deletes" ON stroop_results
  FOR DELETE TO anon USING (true);
```

3. Go to **Settings → API** and copy your credentials

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all Playwright tests |
| `npm run test:ui` | Run tests with interactive UI |
| `npm run test:headed` | Run tests in visible browser |
| `npm run test:report` | View HTML test report |

## Testing

The project includes 34 E2E tests covering:

- **Experiment Flow** (9 tests): Landing page, trials, navigation, input methods
- **Graph Calculations** (10 tests): All 5 chart types, statistical accuracy
- **Multi-User Sessions** (5 tests): Isolation, concurrent access
- **Database Operations** (10 tests): CRUD, persistence

### Run Tests

```bash
# Run all tests
npm test

# Run with visual browser
npm run test:headed

# Run specific test file
npx playwright test tests/experiment-flow.spec.ts

# Generate and view report
npm test
npm run test:report
```

## Deployment

### Railway (Recommended)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Set environment variables:
   ```bash
   railway variables --set "NEXT_PUBLIC_SUPABASE_URL=your-url"
   railway variables --set "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key"
   ```
5. Deploy: `railway up`
6. Generate domain: `railway domain`

### GitHub Actions CI

The CI pipeline runs automatically on push/PR to `main`:

1. **Test Job**: Runs Playwright E2E tests
2. **Lint Job**: Runs ESLint
3. **Typecheck Job**: Runs TypeScript compiler

To enable CI tests, add these [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Development with Claude Code

This project is optimized for development with [Claude Code](https://claude.ai/claude-code). Here's how to continue development:

### Getting Started with Claude Code

1. Clone the repo and set up as described above
2. Open the project in your terminal
3. Start Claude Code: `claude`
4. Claude has full context of the codebase structure

### Example Prompts

```
# Add new features
"Add a practice mode with 5 trials before the real experiment"

# Fix issues
"The chart tooltips are cut off on mobile - fix the positioning"

# Extend visualizations
"Add a histogram showing reaction time distribution"

# Add tests
"Add tests for the new practice mode feature"

# Database changes
"Add a participant_id field to track returning users"
```

### Key Files for Context

When working with Claude Code, these files provide important context:

- `types/index.ts` - Data structures
- `lib/experiment.ts` - Trial generation logic
- `lib/timing.ts` - Timing utilities
- `app/results/page.tsx` - Dashboard implementation
- `tests/utils/test-helpers.ts` - Test utilities

## Data Visualizations

The dashboard includes 5 visualization types:

| Chart | Purpose |
|-------|---------|
| **Grouped Bar** | Compare RT by word and condition |
| **Distribution** | Raincloud-style raw data view |
| **Word Comparison** | Spaghetti plot showing effect by word |
| **Effect Size** | Stroop effect magnitude per word |
| **Speed vs Accuracy** | Trade-off scatter plot |

## API / Data Schema

### Trial Result

```typescript
interface TrialResult {
  id: string;              // UUID
  session_id: string;      // UUID - groups trials
  word_text: string;       // "red" | "green" | "yellow"
  font_color: string;      // Hex color code
  is_congruent: boolean;   // Word matches color?
  reaction_time_ms: number; // Millisecond precision
  user_response: string;   // User's answer
  is_correct: boolean;     // Response matches font color?
  created_at: string;      // ISO timestamp
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Commit: `git commit -m "Add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## License

MIT

## Acknowledgments

- Built with [Claude Code](https://claude.ai/claude-code) by Anthropic
- Stroop Effect research by John Ridley Stroop (1935)
