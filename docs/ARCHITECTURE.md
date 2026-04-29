# 架构总览

本文档描述 autoccTest 的顶层架构。当前为 0→1 阶段，以下内容为初始设计，随着项目演进而持续更新。

## 仓库结构

```
apps/
  api/          → FastAPI API 服务（Python 3.12+）
  admin/        → React 管理台（Vite + Ant Design 5）
packages/
  message-engine/      → 报文模型、解析、校验
  protocol-adapter/    → 协议适配器（HTTP/gRPC 等）
  assertion-engine/    → 断言规则引擎
  scheduler/           → 调度引擎（用例编排、执行）
  jmeter-bridge/       → JMeter 桥接层（报文→.jmx→执行→解析）
  reporter/            → 报告中心
infra/         → 部署与基础设施定义
scripts/       → 仓库级自动化脚本
docs/          → 仓库知识库
```

## 核心模块

### 1. 报文引擎（Message Engine）— `packages/message-engine/`

测试用例的核心抽象层：

- **报文模型**：定义报文的结构（字段、类型、约束）、模板变量语法和参数化规则
- **报文解析器**：支持 JSON、XML、Protobuf 等格式的序列化/反序列化
- **报文校验器**：字段级别的格式与业务规则校验

### 2. 协议适配层（Protocol Adapter）— `packages/protocol-adapter/`

统一不同通信协议的测试交互：

- **适配器接口**：定义 `connect → send(message) → receive → disconnect` 标准流程
- **内置适配器**：HTTP/REST、gRPC
- **扩展适配器**：WebSocket、数据库、消息队列（后续扩展）

### 3. 断言引擎（Assertion Engine）— `packages/assertion-engine/`

响应结果的验证与比对：

- **断言规则模型**：JSONPath、XPath、正则、自定义脚本
- **比对器**：精确匹配、包含、范围、模式匹配
- **差异报告**：预期值与实际值的结构化 diff

### 4. 调度引擎（Scheduler）— `packages/scheduler/`

测试用例的执行编排：

- **用例编排**：顺序、并发、条件分支
- **执行器**：单机 → 分布式（渐进式演进）
- **重试策略**：可配置的重试与超时控制

### 5. JMeter 桥接层（JMeter Bridge）— `packages/jmeter-bridge/`

将性能测试能力集成到验收测试平台中。核心思路：**复用报文引擎的用例定义，通过适配器生成可被 JMeter 执行的 .jmx 文件，而非让用户在 JMeter GUI 中重新定义测试计划**。

#### 模块结构

| 子模块 | 职责 |
|--------|------|
| `types.py` | 数据结构定义：JMX 元素类型、执行配置、结果结构 |
| `jmx_generator.py` | 报文定义 → .jmx XML 文件转换器（Jinja2 模板） |
| `parameterizer.py` | 从报文模板变量提取参数化定义，生成 CSV 数据文件 |
| `executor.py` | JMeter 执行调度，支持 CLI 模式（subprocess）和 Docker 模式 |
| `result_parser.py` | 解析 JMeter 输出的 JTL/XML 结果文件 |
| `report_converter.py` | JMeter 结果格式 → 平台统一报告格式 |

#### 报文 → JMeter 元素映射规则

| 报文概念 | JMeter 元素 | 映射说明 |
|----------|-------------|----------|
| HTTP 请求 | HTTPSamplerProxy | method、URL、headers、body → HTTP Request Sampler |
| 报文模板变量 | User Defined Variables | `{{variable}}` → `${__P(variable,default)}` |
| 断言规则 | Response Assertion | 响应码断言、JSONPath 断言、正则断言 |
| 参数化数据 | CSV Data Set Config | 变量数组 → CSV 源文件 |
| 顺序用例 | Thread Group (单线程) | 按顺序排列的 Sampler 集合 |
| 并发用例 | Thread Group (多线程) | 线程数=并发数，Ramp-Up 可配置 |
| 响应提取 | JSON Extractor / Regex Extractor | 上下游用例间的数据依赖传递 |
| 响应耗时断言 | Duration Assertion | 性能基线 = 最大可接受响应时间 |

#### 执行方式

- **CLI 模式（默认）**：`subprocess.run(["jmeter", "-n", "-t", "test.jmx", "-l", "result.jtl"])`，本地开发使用，依赖本地 JMeter 安装
- **Docker 模式**：`docker run --rm -v $(pwd):/tests justb4/jmeter -n -t /tests/test.jmx`，适合 CI/CD 环境，不依赖主机 JMeter 安装
- **分布式模式**：当前不引入，未来单机施压不足时通过 JMeter 原生分布式机制（`-R` 指定 remote host）扩展

#### 结果解析与统一报告格式

JMeter 输出 JTL 文件（CSV 格式），经 `result_parser.py` 解析后由 `report_converter.py` 转为平台统一结构：

```json
{
  "test_name": "xxx",
  "start_time": "ISO8601",
  "duration_ms": 12345,
  "total_requests": 1000,
  "aggregates": {
    "avg_response_ms": 123,
    "p50_response_ms": 100,
    "p95_response_ms": 200,
    "p99_response_ms": 500,
    "error_rate": 0.01,
    "throughput_rps": 80.5
  },
  "requests": [
    {
      "label": "HTTP Request-1",
      "success": true,
      "response_ms": 98,
      "response_code": 200,
      "assertion_results": []
    }
  ]
}
```

统一报告格式与功能测试结果共享相同的顶层结构（test_name、断言结果），仅在性能相关的聚合字段（吞吐量、百分位响应时间）上扩展，确保报告中心可以无差别渲染两类测试结果。

#### 边界约束

- jmeter-bridge 不依赖具体的报文格式，只依赖报文引擎的抽象模型
- jmx_generator 不直接调用 JMeter Java API，只生成 XML 文本（Jinja2 模板渲染）
- result_parser 不感知 .jmx 内容，只解析输出文件
- executor 不感知报文含义，只负责"生成 .jmx → 执行 → 获取结果文件"的编排流程

### 6. 管理台（Admin Console）— `apps/admin/`

面向测试人员的 Web 界面：

- 报文编辑器（可视化 + 文本模式）
- 用例管理与编排
- 执行结果看板与报告

### 7. API 服务（API Server）— `apps/api/`

对外暴露的 REST API，供管理台和 CI/CD 集成调用。

## 数据流

### 功能测试数据流

```
[管理台] → 编辑报文/用例
    ↓
[API 服务] → 存储用例与报文定义
    ↓
[调度引擎] → 加载用例 → 调用协议适配层发送报文
    ↓
[协议适配层] → 与被测系统交互 → 返回响应
    ↓
[断言引擎] → 比对响应与预期 → 生成结果
    ↓
[报告中心] → 汇总、对比、可视化
```

### JMeter 压测扩展数据流

```
[管理台] → 勾选"转为压测" → 配置并发数/循环次数
    ↓
[报文引擎] → 提取报文定义 + 参数化变量
    ↓
[jmeter-bridge/jmx_generator] → 生成 .jmx 文件
    ↓
[jmeter-bridge/parameterizer] → 生成参数化 CSV 文件
    ↓
[jmeter-bridge/executor] → CLI 或 Docker 执行 JMeter
    ↓
[jmeter-bridge/result_parser] → 解析 JTL 结果
    ↓
[jmeter-bridge/report_converter] → 转为统一报告格式
    ↓
[报告中心] → 与功能测试结果统一展示
```

## 存储模型（待确定）

| 数据 | 候选存储 |
|------|----------|
| 用例/报文定义 | PostgreSQL |
| 功能测试执行结果 | PostgreSQL（JSONB 存储断言详情） |
| JMeter 执行配置 | PostgreSQL（JSONB 存储执行参数：并发数、循环次数等） |
| JMeter 压测报告 | PostgreSQL（聚合指标 + 引用结果文件路径） |
| 报告模板 | 文件系统 / 对象存储 |
| 配置/凭证 | 加密存储（环境变量 / Vault） |

## 边界约束

- 报文模型与协议适配器之间通过接口解耦，不允许直接依赖
- 断言引擎独立于协议适配层，断言规则不感知传输细节
- 调度引擎仅依赖报文模型和适配器接口，不感知具体协议实现
- 管理台仅通过 API 服务与后端交互，不直接访问数据库
