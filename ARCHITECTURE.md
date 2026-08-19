# 🚀 LifeOS Architecture

Version: 1.0

---

# Vision

LifeOS is not a task manager.

LifeOS is a **Life Operating System**.

Its purpose is to help people:

- Plan
- Execute
- Learn
- Improve
- Make better decisions

Every feature should make someone's life meaningfully better.

---

# Core Principles

## 1. One Responsibility

Every file should have exactly one responsibility.

Examples

Engine
→ Business Logic

Context
→ State Management

Component
→ UI

Shared
→ Models & Types

Constants
→ Fixed Values

Utilities
→ Helper Functions

---

## 2. Engine First

Never place business logic inside React components.

Instead:

User
↓

Component
↓

Context
↓

Engine
↓

Data

---

## 3. Components Stay Dumb

Components should only display data.

A component should never calculate XP.

A component should never unlock achievements.

A component should never modify progress.

Those responsibilities belong inside engines.

---

# Folder Structure

```text
src/

components/
Reusable UI

context/
React State

engines/
Business Logic

shared/
Types
Interfaces
Models

constants/
Application Constants

hooks/
Custom Hooks

utils/
Utility Functions

pages/
Application Screens

assets/
Images
Icons

styles/
CSS
```