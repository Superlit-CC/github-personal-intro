---
title: "从零构建 Agent（9）：工具如何完成实际操作"
date: 2026-09-24
excerpt: "从 read 的参数声明、执行环境、文件读取到结果整理，理解工具怎样完成一次真实操作。"
tags:
  - Agent
  - pi
  - TypeScript
  - 工具调用
series:
  name: "从零构建 Agent"
  order: 9
---

> 上一章：[让 Agent 调用工具](../08-tool-calling/) · 下一章：[保存并恢复会话](../10-session-persistence/) · 系列导读：[从一次模型调用到 Agent 内核](../00-overview/)

上一章已经能够调用现成的 `read`，但如果要自己实现一个工具，只写好名称、描述和参数说明就够了吗？这些说明能让模型提出请求，真正的操作还需要程序完成。本章用读取文件这个熟悉的例子，逐步回答工具实现中的三个问题：本次操作需要什么输入、程序从哪里获得执行能力、执行后应当返回什么。完成本章后，你可以按这条路径组织自己的工具实现。

```mermaid
flowchart LR
    Input["Agent 传入本次调用参数"] --> Tool["工具的 execute 函数"]
    App["应用提供执行环境"] --> Tool
    Tool --> Operation["调用环境完成操作"]
    Operation --> Result["整理操作结果，交回 Agent"]
```

## 1. 模型要完成一个任务，需要工具提供什么？

假设我们要求 Agent“修复金额计算错误，并用测试证明结果”。模型可以提出修改方案，但要把方案落实，还需要读到当前代码、修改文件、运行测试并取得输出。每一种操作，都需要对应的程序能力。

本系列使用的 `@earendil-works/pi-agent-core` 提供了四个原生执行工具，可从[工具导出入口](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/index.ts)核对：

| 工具 | 完成什么操作 | 使用时要分清的边界 |
|---|---|---|
| [`read`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L45-L55) | 读取文本或支持的图片；文本可指定起始行和行数 | 不修改文件；返回内容有大小限制 |
| [`write`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/write.ts#L15-L37) | 将给定内容写入文件，必要时创建父目录 | 文件不存在时创建，已存在时覆盖；局部修改应避免误用整文件覆盖 |
| [`edit`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/edit.ts#L17-L37) | 在同一个文件中按旧文本和新文本进行局部替换 | 旧文本应对应原文件中唯一且互不重叠的区域；它不负责理解修改是否正确 |
| [`bash`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/bash.ts#L51-L67) | 在执行环境的工作目录运行命令，返回命令输出 | 可以运行测试，也可以改变环境；权限取决于执行环境，输出有大小限制 |

这些工具怎样配合？模型可以先请求 `read` 查看代码，再请求 `edit` 修改计算语句；需要新建测试文件时使用 `write`，然后请求 `bash` 运行测试。Agent 将每次操作的结果交回模型，模型才能根据新信息决定下一步。

因此，选择工具要从任务需要的操作出发。代码任务需要文件和命令能力，订单查询可能需要的是业务查询接口。工具提供可执行的操作，模型选择下一步，Agent 循环负责把调用与结果连接起来；提供一组工具，本身并不保证任务能完成。

下面从最熟悉的读取文件开始，看看怎样把一种操作实现成工具。

## 2. 读取一个文件之前，程序必须知道哪些东西？

用户说“读一下 `note.txt` 的第 2 行”。如果由我们写普通程序完成，首先需要知道三个具体信息：读哪个文件，从哪一行开始，读多少行。它们可以写成这次操作的参数：

```ts
{ path: "note.txt", offset: 2, limit: 1 }
```

拿到这些参数，就一定能找到文件吗？假设 `project-a` 和 `project-b` 目录里各有一个 `note.txt`，仅凭文件名，程序还不知道应该读取哪一个。它需要一个工作目录，才能确定相对路径指向哪里。

确定位置以后，还要有人真正打开文件。模型返回的参数不会访问磁盘，程序需要调用文件系统提供的读取能力。于是，一次操作所需的信息自然分成两部分：

| 需要知道什么 | 本例中的内容 | 由谁提供 |
|---|---|---|
| 本次要做什么 | 读取 `note.txt`，从第 2 行开始，最多 1 行 | 模型通过工具调用参数提出 |
| 在哪里、用什么能力完成 | 工作目录，以及实际访问文件系统的方法 | 应用配置 |

pi 将第二部分组织为**执行环境**，在工具中记作 `env`。本例使用 `NodeExecutionEnv`：应用指定工作目录，它提供访问本地文件和运行命令的方法。工具根据本次参数调用环境，完成操作。同一份环境还可以供多个工具使用，让读取、写入和命令执行采用一致的工作目录。

这也解释了为什么不把工作目录和文件访问方法都放进模型参数：路径和行范围会随每次请求变化，而访问哪个运行环境、使用什么实现，是应用已经作出的配置。实现工具时，先分清这两类输入，后面的代码就有了明确的落点。

## 3. 怎样把这些信息组合成一个可执行的工具？

### 模型怎么知道需要提供哪些参数？

我们已经知道读取操作需要 `path`、`offset` 和 `limit`，接下来要把这个要求写进工具声明。原生 `read` 用下面的代码描述参数，再把它赋给工具的 `parameters`：

```ts
const readSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});
```

`Type.Object()` 描述一个对象，`path` 是必填字符串，另外两个字段是可选数字；Agent 在执行前按这份声明校验参数。定义和赋值可见 [`read.ts`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L16-L55)。

对工具实现者来说，这一步是在规定“调用方要告诉我什么”。例如写文件还需要待写入的内容，运行命令需要命令文本，参数应当围绕具体操作设计。声明好参数之后，还需要一个函数使用它们，这就是第八章已经见过的 `execute()`。

### 应用配置的环境，怎样交给执行函数？

参数由 Agent 传来，工作目录由应用选定，两者要在执行时汇合。第八章使用的绑定代码正是在做这件事。下面及后续带 `...` 的参数列表均为教学示意：只保留本章需要的参数，其余统一在末尾省略，排列不代表真实参数位置，不能直接运行；完整调用见本章 Lab。

```ts
const nativeRead = createReadTool();
const env = new NodeExecutionEnv({ cwd });
const read: AgentTool<typeof nativeRead.parameters> = {
	...nativeRead,
	execute: (params, ...) => nativeRead.execute(params, { env }, ...),
};
```

这里的 `cwd` 是应用准备的临时目录。`new NodeExecutionEnv({ cwd })` 配置读取位置；包装函数收到 Agent 传来的 `params` 后，再补上应用准备的 `{ env }`，交给原生工具。

为什么需要这一层包装？Agent 提供本次调用参数，原生工具还需要应用准备的环境。这个包装把两者接在一起，让执行函数既知道要做什么，也拿得到完成操作的能力。对应契约见[原生工具执行签名](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/types.ts#L81-L94)和[执行上下文定义](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/tool-context.ts)。

将得到的 `read` 注册到 `initialState.tools` 后，这次调用的参数和应用配置就能在 `execute()` 中同时取得。写同类工具时，需要保留的也是这种分工：调用参数描述本次操作，应用提供操作所依赖的环境。

### 真正的操作，发生在哪一行？

拿到参数和环境后，执行函数就可以开始工作。下面按原生 `read.execute()` 的读取过程展示教学示意，后续的内容整理在下一小节说明：

```ts
async execute({ path, offset, limit }, { env }, ...) {
	const absolutePath = await resolveReadToolPath(env, path, ...);
	const bytes = getOrThrow(await env.readBinaryFile(absolutePath, ...));
}
```

第一行处理路径，本例将 `note.txt` 定位到配置的工作目录中；第二行调用环境读取文件。这里的职责可以直接从数据变化看出来：`execute()` 使用本次参数决定读取目标，再把文件访问交给 `env.readBinaryFile()`。源码见 [`read.ts`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L53-L56)及[路径处理入口](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/path-utils.ts#L12-L29)。

环境又怎样完成读取？本例使用的本地实现最终调用 Node.js 的 `readFile()`。下面依据[真实方法](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/env/nodejs.ts#L550-L559)整理为教学示意，只保留路径处理、文件读取和结果返回：

```ts
async readBinaryFile(path: string, ...): Promise<Result<Uint8Array, FileError>> {
	const resolved = resolvePath(this.cwd, path);
	try {
		return ok(await readFile(resolved, ...));
	} catch (error) {
		return err(toFileError(error, resolved));
	}
}
```

`readFile` 来自 `node:fs/promises`，未指定编码时返回文件字节。环境通过 `Result` 表示操作结果：成功时携带 `value`，失败时携带 `error`。前面的 `getOrThrow()` 就是从中取出成功值，失败则抛出错误：

```ts
export function getOrThrow<TValue, TError>(result: Result<TValue, TError>): TValue {
	if (!result.ok) throw result.error;
	return result.value;
}
```

这样，工具拿到了真实操作产生的数据，读取失败也不会继续被包装成成功结果。此处的[结果处理函数](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/types.ts#L19-L22)是工具与执行环境之间的衔接。

实现工具时，`execute()` 要负责组织这次操作，环境负责具体访问能力。对 `read` 来说是读取文件；换成其他操作，执行函数仍需要取得真实结果，再决定怎样返回。

### 底层操作完成了，能直接把返回值交给模型吗？

本例底层返回的是文件字节，但用户要的是第 2 行文本。两者还不相同。工具需要把操作结果整理成调用方可以使用的内容。

原生 `read` 对文本文件先解码、再分行：

```ts
const textContent = new TextDecoder().decode(bytes);
const allLines = textContent.split("\n");
```

接着按 `offset` 和 `limit` 选择行范围，并控制返回文本的大小。这个处理位于 [`read.ts` 的文本分支](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L97-L139)。对于两行文件，本例选出的内容只有第 2 行；工具随后执行统一的[返回语句](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L141-L144)：

```ts
return { content: [{ type: "text", text: outputText }], details };
```

为什么分成 `content` 和 `details`？因为使用结果的对象不只有模型。模型需要读取操作所得的事实，应用也可能需要额外信息来展示结果：

- `content` 放入模型可读的内容。本例是选中的文件文本。
- `details` 放入供程序使用的附加信息。例如原生 `read` 在输出过长时提供截短信息；本次短文本没有这些信息，因此为 `undefined`。

假设第 2 行保存了验证代号，这次工具返回值就是：

```ts
{
	content: [{ type: "text", text: "本次验证代号：read-841273" }],
	details: undefined,
}
```

至此，一次工具操作才完成：它既取得了真实数据，也把数据整理成第八章约定的返回格式。Agent 接过这个返回值，补上调用关联信息并交给模型，模型再根据结果回答或继续请求工具。

实现自己的工具时，也要从使用结果的需要出发：模型需要哪些事实才能继续处理，应用需要哪些附加信息？答案决定了 `content` 和 `details` 应该放什么，而不必把底层接口的原始返回值全部交出去。

## 4. 运行 Lab，查看文件读取结果

阅读代码后，还需要看到这三部分在一次真实调用中配合工作。继续使用第八章的 Agent 和百炼配置，本章 Lab 在临时目录写入两行文本：

```text
用途：验证原生 read 的文本读取
本次验证代号：read-841273
```

代号随机生成，只写入文件。用户输入只要求“用 `read` 读取 `note.txt`，从第 2 行开始，最多 1 行，只回复验证代号”。应用负责配置临时目录，模型负责提出调用，原生工具负责读取和组织结果。

沿用前文的依赖和 `.env`，在项目根目录运行：

```bash
npm install
node labs/09-tool-implementation.ts
```

这是真实百炼请求，需要本地网络；执行时遵循前文在沙箱外运行的约定。Lab 只展示主流程：准备文件，把执行环境绑定到 `read`，让 Agent 接收用户请求，最后打印模型回答。预期输出如下，代号每次不同：

```text
file content: "用途：验证原生 read 的文本读取\n本次验证代号：read-841273"
input: 请用 read 读取 note.txt，从第 2 行开始，最多读取 1 行，只回复其中的验证代号。
final answer: read-841273
```

对照文件内容与 `final answer`：模型回答应当是文件第 2 行中的代号。这个随机代号没有写入用户请求，模型需要通过 `read` 取得文件内容才能回答。读者直接观察这两处输出，就能确认本次读取的最终结果。

请求出错时，Lab 会显示错误；运行结束后自动清理临时目录。

## 5. 本章小结

实现一个工具，可以从三个实际问题开始：这次操作需要调用方告诉我什么，完成操作依赖应用提供什么，操作之后需要把什么交回去。

在 `read` 示例中，这三个答案分别是路径与行范围、本地文件访问环境、整理后的文件内容。参数声明让模型知道怎样提出请求，执行函数将请求落实为操作，再把结果交给已有的 Agent 循环。理解这条路径后，就可以围绕新的操作设计输入、接入执行能力并组织返回值。

源码核对入口：[`read.ts` 中的参数声明、执行与返回](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/read.ts#L16-L144)、[`types.ts` 中的原生工具执行契约](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/types.ts#L81-L94)、[`tool-context.ts` 中的执行环境传入方式](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/tools/tool-context.ts)、[`nodejs.ts` 中的本地文件读取](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/env/nodejs.ts#L550-L559)、[`types.ts` 中的结果处理](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/types.ts#L19-L22)。
