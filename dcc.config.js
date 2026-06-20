export default {
  name: 'Viny',
  menuRows: 10,

  commands: [
    {
      id: 'dev',
      label: 'Dev server',
      description: 'Start Next.js development server.',
      toggle: { start: 'npm run dev' },
      group: 'Development',
    },
    {
      id: 'build',
      label: 'Build',
      description: 'Build the Next.js app for production.',
      command: 'npm run build',
      group: 'Development',
    },
    {
      id: 'lint',
      label: 'Lint',
      description: 'Run ESLint across the project.',
      command: 'npm run lint',
      group: 'Development',
    },
    {
      id: 'typecheck',
      label: 'TypeScript check',
      description: 'Run TypeScript type checking.',
      command: 'npx tsc --noEmit',
      group: 'Development',
    },
    {
      id: 'studio',
      label: 'Prisma Studio',
      description: 'Open Prisma Studio to browse the database.',
      toggle: { start: 'npx prisma studio' },
      group: 'Database',
    },
    {
      id: 'migrate-dev',
      label: 'Migrate dev',
      description: 'Create and apply a new Prisma migration.',
      command: 'npx prisma migrate dev',
      input: { message: 'Migration name:', placeholder: 'describe the change' },
      group: 'Database',
    },
    {
      id: 'generate',
      label: 'Generate Prisma client',
      description: 'Regenerate Prisma client after schema changes.',
      command: 'npx prisma generate',
      group: 'Database',
    },
    {
      id: 'reset-db',
      label: 'Reset database',
      description: 'Drop and recreate the database from migrations.',
      command: 'npx prisma migrate reset --force',
      confirm: true,
      group: 'Database',
    },
    {
      id: 'status-git',
      label: 'Git status',
      description: 'Show concise git working-tree status.',
      command: 'git status',
      group: 'Git',
    },
    {
      id: 'git-diff',
      label: 'Git diff',
      description: 'Show unstaged changes.',
      command: 'git diff',
      group: 'Git',
    },
    {
      id: 'status-outdated',
      label: 'Check outdated deps',
      description: 'List outdated npm dependencies.',
      command: 'npm outdated',
      group: 'Management',
      onNonZeroExit: {
        label: 'Update all',
        command: 'npm update',
      },
    },
    {
      id: 'kill',
      label: 'Kill dev server',
      description: 'Stop the Next.js dev server on port 3000.',
      command: 'kill $(lsof -ti:3000) 2>/dev/null; echo "done"',
      group: 'Development',
    },
  ],

  profiles: {
    ci: {
      commands: [
        { id: 'build', label: 'Build (CI)', command: 'npm run build', group: 'Build' },
        { id: 'lint', label: 'Lint (CI)', command: 'npm run lint', group: 'Lint' },
        { id: 'typecheck', label: 'TypeScript check (CI)', command: 'npx tsc --noEmit', group: 'TypeScript' },
      ],
    },
  },

  pipelines: [
    {
      id: 'pipeline-full-check',
      label: 'Full check',
      steps: ['lint', 'typecheck', 'build'],
    },
    {
      id: 'pipeline-db-update',
      label: 'Update database',
      steps: ['generate', 'migrate-dev'],
    },
  ],
}
