# Contributing to AeroLens

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Set up** the development environment (see README.md)
4. **Create a branch** for your changes

## Development Setup

### Backend (ASP.NET Core)
```bash
cd src/AeroLens.Api
dotnet restore
dotnet run
```

### Frontend (React)
```bash
cd src/aerolens-web
npm install
npm run dev
```

## Code Style

### TypeScript/React
- Use functional components with hooks
- Prefer TypeScript strict mode
- Use meaningful variable and function names
- Keep components small and focused

### C#/.NET
- Follow Microsoft's C# coding conventions
- Use async/await for I/O operations
- Keep controllers thin, logic in services

## Commit Messages

Use clear, descriptive commit messages:

```
Add flight delay prediction feature

- Implement AI prediction service
- Add prediction display in flight details
- Update API endpoints
```

## Pull Requests

1. **Keep PRs focused** — One feature or fix per PR
2. **Write descriptive titles** — Summarize the change
3. **Fill out the PR template** — Help reviewers understand your changes
4. **Test your changes** — Ensure nothing is broken
5. **Update documentation** — If your change affects usage

## Reporting Bugs

Use the [bug report template](https://github.com/eladser/AeroLens/issues/new?template=bug_report.md) and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment info
- Screenshots if applicable

## Suggesting Features

Use the [feature request template](https://github.com/eladser/AeroLens/issues/new?template=feature_request.md) and describe:
- The problem you're solving
- Your proposed solution
- Any alternatives considered

## Questions?

Open a [discussion](https://github.com/eladser/AeroLens/discussions) for questions or ideas.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
