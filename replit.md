# ÉLÉGANCE - Fashion E-commerce Website

## Overview
A premium fashion e-commerce website built with React, Vite, and Tailwind CSS. Features a modern design showcasing clothing collections with a focus on elegance and sophistication.

## Project Structure
```
src/
├── App.tsx              # Main application component with routing
├── components/
│   ├── layout/          # Header, Footer, Layout components
│   ├── products/        # ProductCard, ProductFilters
│   ├── ui/              # Shadcn UI components
│   └── NavLink.tsx      # Navigation link component
├── pages/               # Page components
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions
```

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI components
- **Routing**: React Router DOM v6
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation

## Running the Project
The development server runs on port 5000:
```bash
npm run dev
```

## Recent Changes
- Migrated from Lovable environment to Replit (Jan 16, 2026)
- Updated Vite config to use port 5000 and allow all hosts
- Removed lovable-tagger plugin for Replit compatibility

## User Preferences
- None recorded yet

## Architecture Decisions
- Uses Shadcn UI component library for consistent design
- Client-side routing with React Router
- Component-based architecture with reusable UI components
