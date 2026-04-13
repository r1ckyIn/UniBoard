# Requirements: UniBoard v3.0

**Defined:** 2026-04-06
**Core Value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place

## v3.0 Requirements

### Observability (OBS)

- [ ] **OBS-01**: Sentry Python (FastAPI) 项目创建，DSN 配置到 Railway 环境变量
- [ ] **OBS-02**: Sentry Next.js 项目创建，DSN 配置到 Vercel 环境变量
- [ ] **OBS-03**: 前端 CSP connect-src 添加 Railway 后端域名和 Sentry ingest 域名

### Data Pipeline — BFF Proxy (BFF)

- [x] **BFF-01**: 将 17 个 mock Route Handler 转换为代理到 Railway Python 后端
- [x] **BFF-02**: 前端 API 请求自动附带 Supabase JWT Authorization header
- [x] **BFF-03**: 代理层统一错误处理（后端 4xx/5xx → 前端友好提示）
- [x] **BFF-04**: 端到端用户旅程验证（注册 → Token 配置 → 首次同步 → 看到真实数据）

### AI Configuration (AICONF)

- [ ] **AICONF-01**: ANTHROPIC_API_KEY 配置到 Railway 环境变量
- [ ] **AICONF-02**: AI 功能端到端验证（Deadline Chat、Course QA、Unit Review 返回真实结果）

### Email & Auth (EMAIL)

- [ ] **EMAIL-01**: 自定义 SMTP（Resend）替换 Supabase 内置邮件服务
- [ ] **EMAIL-02**: 品牌化邮件模板（注册确认、密码重置）
- [ ] **EMAIL-03**: Token 过期自动提醒 + 重新授权引导流程

### Onboarding (ONBD)

- [ ] **ONBD-01**: 用户引导流程优化（首次登录体验打磨）
- [ ] **ONBD-02**: Setup 页面异常状态处理（Token 无效、API 不可达、同步失败）

### UX Polish (UXPOL)

- [ ] **UXPOL-01**: AI Chat 输入验证失败时显示友好提示（不是裸露的 "SSE error: 422"）
- [ ] **UXPOL-02**: AI 请求失败时显示具体原因（不是通用的 "AI request failed"）
- [ ] **UXPOL-03**: Setup TokenStep 重试时跳过已验证成功的 Token（不重复验证）
- [ ] **UXPOL-04**: Setup SuccessStep 显示逐域同步进度（不只是 spinner）

### AI Features (AIFEAT)

- [ ] **AIFEAT-01**: AI 学习建议（基于评估权重的优先级排序，"把精力放在 Final Exam，权重 50%"）
- [ ] **AIFEAT-02**: 课程材料 QA（RAG on Ed Lessons，带引用来源）— 用真实数据验证
- [ ] **AIFEAT-03**: GPA 路径规划（"剩余科目需要平均 78+ 才能达到 Distinction"）
- [ ] **AIFEAT-04**: 推送通知（截止日期提醒，浏览器 Push API 或邮件通知）

## Future Requirements

### Scale (v4.0+)

- **SCALE-01**: 多大学支持（Canvas adapter 通用化，Unit Outline parser 可插拔）
- **SCALE-02**: 移动端 PWA
- **SCALE-03**: OAuth Canvas 集成替代手动 Token 输入

## Out of Scope

| Feature | Reason |
|---------|--------|
| 多大学支持 | v4.0+，当前仅 USYD |
| 移动端 / PWA | v4.0+，桌面优先 |
| OAuth Canvas 登录 | 手动 Token 对 MVP 足够 |
| Ed Discussion 发帖 | 只读策略，避免污染 Ed 生态 |
| Canvas 提交作业 | 学术诚信风险 |
| AI 代写 / 直接答案 | 学术诚信违规 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OBS-01 | Phase 29 | Pending |
| OBS-02 | Phase 29 | Pending |
| OBS-03 | Phase 29 | Pending |
| BFF-01 | Phase 30 | Complete |
| BFF-02 | Phase 30 | Complete |
| BFF-03 | Phase 30 | Complete |
| BFF-04 | Phase 31 | Complete |
| AICONF-01 | Phase 31 | Pending |
| AICONF-02 | Phase 31 | Pending |
| EMAIL-01 | Phase 32 | Pending |
| EMAIL-02 | Phase 32 | Pending |
| EMAIL-03 | Phase 33 | Pending |
| ONBD-01 | Phase 33 | Pending |
| ONBD-02 | Phase 33 | Pending |
| AIFEAT-01 | Phase 34 | Pending |
| AIFEAT-02 | Phase 34 | Pending |
| AIFEAT-03 | Phase 34 | Pending |
| AIFEAT-04 | Phase 35 | Pending |
| UXPOL-01 | Phase 36 | Pending |
| UXPOL-02 | Phase 36 | Pending |
| UXPOL-03 | Phase 36 | Pending |
| UXPOL-04 | Phase 36 | Pending |

**Coverage:**
- v3.0 requirements: 22 total
- Mapped to phases: 22/22
- Unmapped: 0

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 — Traceability populated by roadmapper*
