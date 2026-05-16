# AI Review Workflow

This repository includes a provider-agnostic AI pull request review workflow at `.github/workflows/ai-review.yml`.

## Supported Providers

Set `AI_REVIEW_PROVIDER` to one of:

- `openai`
- `anthropic`

## Required GitHub Configuration

### Secrets

- `AI_REVIEW_API_KEY`: the API key for the selected provider

### Variables

- `AI_REVIEW_PROVIDER`: `openai` or `anthropic`
- `AI_REVIEW_MODEL`: the model name to call
- `AI_REVIEW_BASE_URL`: optional override for the provider API base URL
- `AI_REVIEW_MIN_CONFIDENCE`: optional minimum confidence threshold, defaults to `80`
- `AI_REVIEW_MAX_FINDINGS`: optional maximum number of findings, defaults to `5`

## Provider Defaults

If `AI_REVIEW_BASE_URL` is not set, the workflow uses these defaults:

- `openai`: `https://api.openai.com/v1`
- `anthropic`: `https://api.anthropic.com/v1`

`AI_REVIEW_BASE_URL` is passed through to the official SDK as the provider base URL. Use the exact base URL documented by your provider or compatibility gateway.

## Behavior

- Runs on non-draft pull requests when they are opened, updated, reopened, or marked ready for review
- Reads pull request metadata and changed file patches
- Sends a review prompt to the configured provider
- Creates or updates a single PR comment with the AI review summary and findings
- Fails the `AI Review` workflow when blocking findings are returned

## Merge Protection

To require AI approval before merge, add the `AI Review` job as a required status check on `main`.

With that setup:

- `AI Review Passed` comments mean the workflow succeeded
- `AI Review Blocked` comments mean the workflow failed
- failed AI review runs will block merge the same way a failing CI check would

## Safety Notes

- The workflow does not execute pull request code
- The workflow does not push commits or modify files
- The workflow only reads PR metadata and patch content before calling the model API
