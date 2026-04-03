# UniBoard

<div align="center">

[![Language](https://img.shields.io/badge/Backend-Python_3.12-3776AB?style=flat-square&logo=python)](https://python.org)
[![Language](https://img.shields.io/badge/Frontend-TypeScript-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Framework](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Framework](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**A GPA maximization dashboard for university students — aggregating Canvas LMS + Ed Discussion into one place.**

[English](#english) | [中文](#中文)

</div>

---

## English

### Overview

UniBoard is a GPA maximization dashboard that aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface. It shows students exactly what matters for their grades — real-time GPA/WAM tracking, unified deadlines, high-value discussion highlights, and AI-powered course material research.

### Features

- **GPA/WAM Tracking** — Real-time grade calculation with What-if simulator and target GPA path planner
- **Unified Deadlines** — Three-source aggregation (Canvas + Ed Lessons + Ed Discussion) with SHA-256 deduplication
- **Intelligence** — AI-powered extraction of high-value Ed Discussion posts (exam hints, rubric info, deadline changes)
- **Course Materials** — Unified view with AI-generated folder descriptions and keyword search
- **Daily Digest** — Curated academic summary with AI urgency scoring and quality gate fallback
- **Predict** — Slider-based What-if GPA simulator with per-assessment predictions
- **Timetable** — Weekly schedule view with teaching week navigation
- **MCP Server** — Access UniBoard data through Claude Desktop with assignment ROI analysis
- **Skill System** — Auto-generated prompt templates for efficient repeated AI operations (~50 skills)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg |
| Frontend | Next.js 15, TanStack Query v5, Tailwind CSS v4 |
| Database | Supabase PostgreSQL (15-table schema, 60 RLS policies) |
| Auth | Supabase Auth (frontend supabase-js + Python JWT validation) |
| AI | Claude API (Opus for MCP Agent, Sonnet for digest/scoring) |
| MCP | Python asyncio MCP server + canvas-ed-mcp tools |
| Deployment | Supabase + Railway (Python) + Vercel (Next.js) |

### Quick Start

```bash
# Clone
git clone git@github.com:r1ckyIn/UniBoard.git
cd UniBoard

# Copy environment template
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Start Supabase local dev
supabase start
supabase db push

# Backend
uv sync && uvicorn src.web.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend && pnpm install && pnpm dev
```

### Architecture

```
Browser / Claude Desktop
    |
    +-- Next.js (Vercel) -- supabase-js Auth + TanStack Query -> Python API
    |
    +-- Python FastAPI (Railway)
    |       Services: GPA, Deadlines, Intelligence, Sync, AI Engine
    |       Adapters: Canvas, Ed Discussion, Ed Lessons, Unit Outline
    |       MCP Server: Tool-based access for Claude Desktop
    |
    +-- Supabase (Managed)
            PostgreSQL + Auth + RLS
```

### Design

UniBoard follows an Anthropic/Claude-inspired design aesthetic — warm colors, paper texture, hand-drawn borders (Rough.js), and restrained typography. The goal is to feel like "a quiet, trustworthy notebook on your desk" rather than a flashy EdTech product.

---

## 中文

### 项目概述

UniBoard 是一个 GPA 最大化仪表盘，聚合 Canvas LMS、Ed Discussion、Ed Lessons 和 Unit Outline 数据到统一界面。只展示对成绩有影响的信息 — 实时 GPA/WAM 追踪、统一截止日期、高价值讨论帖高亮、AI 驱动的课程材料研究。

### 功能特点

- **GPA/WAM 追踪** — 实时成绩计算，What-if 模拟器，目标 GPA 路径规划
- **统一截止日期** — 三源聚合（Canvas + Ed Lessons + Ed Discussion），SHA-256 去重
- **信息情报** — AI 提取 Ed Discussion 高价值帖子（考试范围、评分标准、截止日期变更）
- **课程材料** — 统一视图，AI 生成文件夹描述，关键词搜索
- **每日摘要** — 精选学业摘要，AI 紧急程度评分，质量门控自动回退
- **成绩预测** — 滑块式 What-if GPA 模拟器，逐评估项预测
- **课程表** — 周视图，教学周导航
- **MCP 服务器** — 通过 Claude Desktop 访问 UniBoard 数据，含作业 ROI 分析
- **技能系统** — 自动生成 prompt 模板，~50 个技能覆盖数据采集/处理/AI 分析

### 快速开始

```bash
# 克隆
git clone git@github.com:r1ckyIn/UniBoard.git
cd UniBoard

# 复制环境配置
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# 启动 Supabase 本地开发
supabase start
supabase db push

# 后端
uv sync && uvicorn src.web.main:app --reload --port 8000

# 前端（新终端）
cd frontend && pnpm install && pnpm dev
```

---

## License

MIT License

## Author

**Ricky** - CS Student @ University of Sydney

[![GitHub](https://img.shields.io/badge/GitHub-r1ckyIn-181717?style=flat-square&logo=github)](https://github.com/r1ckyIn)
