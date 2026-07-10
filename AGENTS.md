# AGENTS.md

This file documents the skills needed to work with this codebase.

## Description
This is a music player that provides services from both Kugou and NetEase Cloud sources

## Requirements
- The code should be concise, with good annotations to ensure the robustness of the program, and the fluency should be ensured as much as possible
- Adapted to the theme, the color scheme is not abrupt

## Tech Stack

- **Frontend**: Vue3 + TypeScript + Vue Router + Pinia
- **Build**: Vite
- **Desktop**: Tauri 2 (Rust backend)
- **Styling**: Element Plus
- **Editor**: Zed
- **Package Manager**: pnpm

## Commands

### Development

- `pnpm dev` - Start the Vite dev server on port 61570
- `pnpm tauri dev` - Start the Tauri desktop app with Vite
