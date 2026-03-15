***
last_updated: 2026-03-15 00:00:00
***

# Project Overview

## Project Name
AI Context

## Mission
Enable seamless multi-agent development by providing a unified context system for Cursor, Claude Code, Codex, GitHub Copilot, and Google Antigravity.

## Current Status
✅ **Ready for Public Release** - Complete multi-agent context system

## Key Objectives
1. Provide zero-configuration multi-agent support (Cursor, Claude Code, Codex, Antigravity)
2. Maintain single source of truth for project context across all agents
3. Enable perfect session continuity through mandatory logging
4. Enforce consistent coding standards and workflow practices
5. Track architectural decisions with ADRs (Architecture Decision Records)

## Tech Stack
- **Configuration Formats**: Markdown (`.md`), MDC (`.mdc`)
- **Version Control**: Git
- **Target Languages**: Language-agnostic (Python standards included as example)
- **Supported Platforms**: macOS, Linux, Windows

## Supported AI Agents
- **Cursor** - IDE with advanced AI features
- **Claude Code** - Anthropic's CLI coding assistant
- **Codex** - OpenAI's code generation model interface
- **GitHub Copilot** - GitHub's repository-aware coding assistant
- **Google Antigravity** - Google's agentic development platform

## Project Structure
See `project.structure.md` for detailed directory layout.

## Key Features
- ✅ Centralized `.ai-context/` directory (single source of truth)
- ✅ Agent-specific configuration files routing to shared context
- ✅ Mandatory session logging for continuity
- ✅ Architecture Decision Records (ADRs)
- ✅ Comprehensive coding standards (workflow, testing, language-specific)
- ✅ Task management integrated into context system
- ✅ Changelog with semantic versioning
- ✅ Claude Code Stop hook enforcing session log creation
- ✅ MIT licensed for maximum openness

## Current Phase
**Public Open-Source Release** - Ready for community use and contribution

## For Adopters
When using AI Context in your own project:
1. Copy `project.overview.template` to replace this file
2. Fill in your project details (name, mission, objectives, tech stack)
3. Customize standards in `.ai-context/standards/` as needed
4. Start coding with any supported AI agent

The template file provides a blank slate with guidance for what to include.
