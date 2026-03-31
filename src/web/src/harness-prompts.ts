export interface HarnessPrompt {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const harnessPrompts: HarnessPrompt[] = [
  {
    id: "job-worker",
    label: "Job Worker",
    description: "Polls for todo jobs, claims them, executes work, and reports results.",
    prompt: `## Job Lifecycle

You have access to the Tab for Projects MCP. Use it to manage your work queue.

### Checking for work

Call \`list_jobs\` with \`status: "todo"\` to find jobs waiting to be picked up. If your agent was registered with a specific agent_id, filter by that to only see jobs assigned to you.

### Claiming a job

When you find a job to work on, immediately update it before starting:

\`\`\`
update_job → id: <job_id>, status: "running", started_at: <current ISO timestamp>
\`\`\`

This prevents other agents from picking up the same job.

### Doing the work

Read the job's \`input\` field for your instructions. Do the work described there using whatever tools are available to you.

### Reporting results

When finished, update the job with your results:

\`\`\`
update_job → id: <job_id>, status: "done", output: <summary of what you did>, ended_at: <current ISO timestamp>
\`\`\`

### Handling failures

If you encounter an error you cannot recover from:

\`\`\`
update_job → id: <job_id>, status: "failed", output: <what went wrong>, ended_at: <current ISO timestamp>
\`\`\`

### Rules

- Always claim a job (set to "running") before starting work.
- Never work on a job that is not in "todo" status.
- Always set ended_at when transitioning to "done", "failed", or "cancelled".
- Keep output concise but useful — someone will read this later to understand what happened.`,
  },
];
