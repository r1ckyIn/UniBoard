# UniBoard

<div align="center">

[![Language](https://img.shields.io/badge/Backend-Python-3776AB?style=flat-square&logo=python)](https://python.org)
[![Language](https://img.shields.io/badge/Frontend-TypeScript-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Framework](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Framework](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**A GPA maximization dashboard for university students — aggregating Canvas LMS + Ed Discussion into one place.**

[English](#english) | [中文](#中文)

</div>

---

## English

### Overview

UniBoard is a GPA maximization dashboard that aggregates data from Canvas LMS, Ed Discussion, Ed Lessons, and Unit Outline pages into a single interface. It shows students exactly what matters for their grades — real-time GPA/WAM tracking, unified deadlines, high-value discussion highlights, and AI-powered course material navigation.

### Features

- **GPA/WAM Tracking** — Real-time grade calculation with What-if simulator and target GPA path planner
- **Unified Deadlines** — Three-source aggregation (Canvas + Ed Lessons + Ed Discussion) with deduplication
- **Intelligence** — AI-powered extraction of high-value Ed Discussion posts (exam hints, rubric info, deadline changes)
- **File Navigation** — AI-generated folder descriptions for quick course material discovery
- **Daily Digest** — Curated academic summary with urgency scoring
- **MCP Server** — Access UniBoard data through Claude Desktop

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 async |
| Frontend | Next.js 16, TanStack Query v5, Tailwind CSS v4 |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT (PyJWT + bcrypt) |
| MCP | Python asyncio MCP server |

### Quick Start

```bash
# Clone
git clone git@github.com:r1ckyIn/UniBoard.git
cd UniBoard

# Start local environment
docker compose up -d

# Backend
cd backend && uv sync && uvicorn src.web.main:app --reload --port 8000

# Frontend
cd frontend && pnpm install && pnpm dev
```

### Design

UniBoard follows an Anthropic/Claude-inspired design aesthetic — warm colors, paper texture, hand-drawn borders (Rough.js), and restrained typography. The goal is to feel like "a quiet, trustworthy notebook on your desk" rather than a flashy EdTech product.

---

## 中文

### 项目概述

UniBoard 是一个 GPA 最大化仪表盘，聚合 Canvas LMS、Ed Discussion、Ed Lessons 和 Unit Outline 数据到统一界面。只展示对成绩有影响的信息 — 实时 GPA/WAM 追踪、统一截止日期、高价值讨论帖高亮、AI 驱动的课程材料导航。

### 功能特点

- **GPA/WAM 追踪** — 实时成绩计算，What-if 模拟器，目标 GPA 路径规划
- **统一截止日期** — 三源聚合（Canvas + Ed Lessons + Ed Discussion）去重
- **信息情报** — AI 提取 Ed Discussion 高价值帖子（考试范围、评分标准、截止日期变更）
- **文件导航** — AI 生成文件夹描述，快速定位课程材料
- **每日摘要** — 精选学业摘要，含紧急程度评分
- **MCP 服务器** — 通过 Claude Desktop 访问 UniBoard 数据

### 快速开始

```bash
# 克隆
git clone git@github.com:r1ckyIn/UniBoard.git
cd UniBoard

# 启动本地环境
docker compose up -d

# 后端
cd backend && uv sync && uvicorn src.web.main:app --reload --port 8000

# 前端
cd frontend && pnpm install && pnpm dev
```

---

## License

MIT License

## Author

**Ricky** - CS Student @ University of Sydney

[![GitHub](https://img.shields.io/badge/GitHub-r1ckyIn-181717?style=flat-square&logo=github)](https://github.com/r1ckyIn)
