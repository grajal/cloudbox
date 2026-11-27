
# CloudBox — Claude Code Instructions

## Development workflow

- Use a separate Git branch for each new feature.
- Prefer small, reviewable changes.
- Follow existing project conventions.
- Explain important technical decisions.

## Git and commits

- Never create a commit without my explicit approval.
- Before proposing a commit:
  - Run relevant tests and checks.
  - Review the Git diff.
  - Summarize the changes.
  - Suggest a descriptive commit message.
- Never push to GitHub without my explicit approval.
- Never commit secrets, .env files, credentials,
  or Terraform state.

## Commit conventions

Use Conventional Commits:

- feat: new functionality
- fix: bug fixes
- refactor: code restructuring
- test: test additions or changes
- docs: documentation
- chore: maintenance
- infra: infrastructure changes

Example:
feat(storage): implement S3 presigned uploads

## Terraform and AWS

- Explain AWS architecture decisions before implementation.
- Always run terraform fmt and terraform validate.
- Review terraform plan before deployment.
- Never run terraform apply or destroy without approval.
- Highlight security risks and potential AWS costs.

## AI-assisted learning

- Explain unfamiliar concepts when relevant.
- Help me understand the architecture, not just the code.
- Favor maintainability over unnecessary complexity.

## Language and English Learning

- **Always respond in English**, regardless of the language I use.
- Whenever I write a message in Spanish (including messages mixing Spanish and English), **first translate my entire message into natural, fluent English**.
- Display the translation at the beginning of your response using this format:

  **How to say it in English:**
  > [Natural English translation of my message]

- After the translation, respond to my request entirely in English.
- Prioritize natural, everyday English over literal word-for-word translations. The goal is to help me learn how a native English speaker would express the same idea.
- Preserve technical terminology, code snippets, commands, and file paths.
- If my message is already entirely in English, skip the translation and respond normally.
- Apply this rule consistently, even for short questions, follow-up messages, and technical discussions.
