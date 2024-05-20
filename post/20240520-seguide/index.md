💻 **Software Engineering Secret Guideline**

# 产品设计阶段

> 角色: Product manager

分析产品需求, 用户故事 (user stories), 确定交付用户人群:

- 交付给内部用户: 内部团队 (比如 infrastructure 产品) 或领导 (比如 BI/business intelligence, HRIS 系统等)
- 交付给外部用户: toB, toC 等

编写产品需求文档 (PRD, product requirement document), 如果涉及 UI/UX 则需要画线框图 (wireframe) 交代清楚界面和交互的细节.

## 流程

### 需求沟通会 (1天~1周)

和用户/老板沟通初步的需求, 确定了差不多, 就要开始写 PRD.

### PRD 编写 (1~3天)

编写 PRD, 制定项目名 (新项目) 和版本号 (新或旧项目).

### PRD review 会 (外部) (1 次, 1 小时)

PRD 写完以后, 要和用户/老板 review. 注意为什么这里的 review 只有 **1 次** 而且只开 **1 小时**, 这是因为 PRD
编写的过程中出现的任何分歧都要在编写阶段异步的和用户/老板沟通来解决掉, 到了 review 就不能大改了, 只能修改细节, 所以 1
小时足够确定完所有的 PRD 细节.

### PRD review 会 (内部) (1 次, 1 小时)

和 UI/UX 设计师, 开发人员, QA 举行内部的 PRD review 会, 讲清楚这个版本要做的事情.

## 输出

1. PRD
    1. 文档会有来自 用户/老板 的 comments, 需要全 resolved
    2. 来自 UI/UX, 开发, QA 的 comments, 全 resolved
2. Wireframe (optional)
    1. 同上, 会有 comments, 全 resolved

# UI/UX 设计阶段

> 角色: UI/UX Designer

## 流程

### UI/UX 设计 (1天~1周)

设计界面和交互, 使用 Figma 等.

### UI/UX review 会 (1 次, 1 小时)

同上, review 会都是 1 小时, 并且只开一次, 这是因为在设计阶段就要把大方向都 resolved 掉, 这个 review 主要处理细节问题.
UI/UX 设计稿不能大改.

## 输出

UI/UX 设计稿 (e.g. Figma).

# 技术方案设计阶段

> 角色: Developer

## 流程

### 技术设计 (1天~1周)

完成技术方案.

### Tech design review 会 (1 次, 1~2 小时)

QA, SRE, 开发人员, 都要参与.

TD review 时间可能会稍微长一些, 如果技术细节很多的话.

## 输出

Tech design, 内容如:

- 架构图
- 序列图 (sequence diagram)
- 接口文档
- 新增配置
- 可观测手段

# 测试用例设计阶段

> 角色: QA

## 流程

### 测试用例设计

完成测试用例列表 (checklist), 并分辨出 P0, P1, P2 等级测试用例.

- P0: 最重要的 test case, 即如果此用例失败, 可能整个 feature 流程都会中断的用例, 开发人员开发完毕后要 **自测** 保证 P0
  用例不会失败
- P1: 核心 test case, 但是不会中断主流程
- P2: 可选的测试用例, 一般不会搞 P2, 太自由了

### 测试用例 review 会 (1 次, 1 小时)

SRE (可选), 开发 参与.

## 输出

测试用例 checklist.

# 开发阶段

> 角色: Developer

## 流程

不需要等测试用例 review 会结束再开工, 当 TD review 结束以后, 就可以开工了.

开发时长灵活, 1~2 周.

## 输出

1. 完成 feature 所有功能
2. 自测 P0 测试用例全通过

# 测试阶段

> 角色: QA

## 流程

### QA 测试

进行测试, 或进行 benchmark.

测试时长灵活, 1~2 周.

### 验收 (1 天)

由 UI/UX 和 PM 验收, 并指出错误, 要求开发修改.

## 输出

单独的测试报告, 报告内容:

1. 所有测试用例的链接
2. 所有 bug 单
3. 遗留问题
4. 是否验收通过

# 部署阶段

> 角色: SRE/DevOps

部署花费 1天 ~ 1 周, 看集群的规模或者其他安排 (比如有重要活动不能动 live 环境, code freeze 等等).

# 运维/运营阶段

> 角色: SRE/DevOps/Developer/Ops/BD

进行正常运维和运营活动.

# 全阶段: 项目管理

> 角色: Project manager (PMO)

整个阶段需要 PMO 对 story point (工作量) 进行评估, 创建和指派任务 ticket, 和项目的健康检查.
