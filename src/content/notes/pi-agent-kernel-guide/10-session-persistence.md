---
title: "从零构建 Agent（10）：保存并恢复会话"
date: 2026-10-06
excerpt: "将完整消息保存为 JSONL 会话文件，加载到新 Agent，让程序重启后继续原来的对话。"
tags:
  - Agent
  - pi
  - TypeScript
  - 会话持久化
series:
  name: "从零构建 Agent"
  order: 10
---

> 上一章：[工具如何完成实际操作](../09-tool-implementation/) · 系列导读：[从一次模型调用到 Agent 内核](../00-overview/)

上一章的 Agent 已经能读取文件并回答，但关闭程序后再问“刚才读出的代号是什么”，新启动的 Agent 没有之前的对话，无法据此回答。本章为这段对话增加磁盘保存与加载，让程序重启后仍能基于原来的会话继续提问。

```mermaid
flowchart LR
    History["已有会话消息"] --> Save["保存到磁盘文件"]
    Save --> Load["程序重启后读取文件"]
    Load --> Restore["恢复会话消息"]
    Restore --> Ask["带上历史继续提问"]
```

## 1. 为什么连续对话还需要持久化？

[第七章](../07-conversation-history/)已经让 Agent 能够连续对话：第一轮问答留在 `agent.state.messages` 中，第二次请求把这些消息和新问题一起发给模型，模型才能根据前文回答。

但这组消息保存在当前进程的内存里。只要程序一直运行，就可以继续使用；程序退出后，内存中的消息也就消失了。重新创建一个 Agent，只会得到一个没有历史的新会话。

如果希望今天关闭程序，明天打开后还能接着提问，就需要把消息保存到进程之外。**会话持久化**在这里指的就是：将会话内容写入磁盘文件，使它在程序退出后仍然保留。下一次启动时读回这些内容，新 Agent 就能继续使用原来的历史。

因此，需要连接起来的是两个动作：退出前保存会话，启动后恢复会话。模型仍然通过请求中的历史消息理解前文，变化的是这些历史能够跨越两次程序运行。

## 2. 要继续原来的会话，应该保存哪些内容？

沿用第九章的例子：用户要求读取 `note.txt` 的第 2 行，模型调用 `read`，取得文件里的验证代号，再回复用户。这次对话通常包含四条消息：

| 顺序 | 消息角色 | 应保留的内容 | 继续对话时有什么用 |
|---|---|---|---|
| 1 | `user` | 用户的读取要求 | 知道用户原本要求做什么 |
| 2 | `assistant` | `read` 调用的标识、名称和参数 | 知道模型提出了什么操作 |
| 3 | `toolResult` | 对应的调用标识和文件读取结果 | 知道操作实际得到了什么 |
| 4 | `assistant` | 根据读取结果给出的回答 | 知道已经向用户回复了什么 |

所以，保存对象应当是**完整的消息对象及其顺序**。只保存最后显示在终端里的代号，无法保留这次对话的来龙去脉；工具调用与工具结果之间的对应关系，也需要通过原来的调用标识保留下来。

这一组消息已经在 `agent.state.messages` 中。持久化要做的是把它们保存下来，恢复时再放回新 Agent 的历史。消息中的角色、文本、工具参数和结果沿用原有结构，不需要另外设计一份“聊天文字记录”。

为了重新找到这段历史，文件还需要记录“这是哪个会话”，例如会话标识和创建时间。于是，本例要保存的数据可以分成两部分：

- **会话基本信息**：识别这份会话文件。
- **有序的完整消息**：还原用户、模型和工具之间已经发生的对话。

本例的模型配置、系统提示词和工具实现仍由应用在启动时提供；会话文件负责保留对话内容。

## 3. 这些内容在文件中怎样组织？

### 为什么使用一行一条记录的文件？

会话会不断产生新消息。如果文件采用 **JSONL** 格式，每一行保存一个独立的 JSON 对象，就可以在文件末尾追加新记录，而不用每次重写此前的全部消息。

本章使用 pi 的原生 JSONL 会话存储。第一行是文件头，保存会话基本信息；后续行记录会话内容。本例只保存消息，因此一轮读取完成后，文件可以这样理解：

```text
第 1 行：文件头，标识这是哪个会话
第 2 行：用户提出读取要求
第 3 行：模型请求调用 read
第 4 行：read 返回读取结果
第 5 行：模型给出回答
```

下面按照 pi 的实际字段给出结构示意。为突出文件组织，省略了时间、模型用量等字段，并缩短了标识；每行仍是一个 JSON 对象，这段裁剪后的内容不能直接作为完整会话文件加载：

```jsonl
{"kind":"header","version":4,"id":"chapter-10","cwd":"/tmp/example"}
{"kind":"entry","lane":"main","type":"message","id":"m1","parentId":null,"seq":1,"message":{"role":"user","content":"读取 note.txt 第 2 行的验证代号。"}}
{"kind":"entry","lane":"main","type":"message","id":"m2","parentId":"m1","seq":2,"message":{"role":"assistant","content":[{"type":"toolCall","id":"call-1","name":"read","arguments":{"path":"note.txt","offset":2,"limit":1}}]}}
{"kind":"entry","lane":"main","type":"message","id":"m3","parentId":"m2","seq":3,"message":{"role":"toolResult","toolCallId":"call-1","toolName":"read","content":[{"type":"text","text":"本次验证代号：read-841273"}],"isError":false}}
{"kind":"entry","lane":"main","type":"message","id":"m4","parentId":"m3","seq":4,"message":{"role":"assistant","content":[{"type":"text","text":"read-841273"}]}}
```

文件头的 `kind: "header"` 表明这一行是会话基本信息，`version` 表明文件格式版本，`id` 是会话标识。后续行的 `kind: "entry"` 表明这一行是会话记录，`type: "message"` 表明记录中装的是一条消息。对应定义可见[文件头构造](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/repo.ts)和[记录编码](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/codec.ts#L229-L232)。

### 消息外面为什么还包着一层记录？

`message` 保存对话本身，外层字段负责组织这份会话文件：

| 字段 | 在本例中的作用 |
|---|---|
| `id` | 标识这一条会话记录，例如 `m2` |
| `parentId` | 指向它接续的记录；本例中 `m2` 接在 `m1` 后面 |
| `seq` | 记录的写入顺序编号 |
| `lane` | 记录所属的会话路径，本例统一使用默认的 `main` |
| `message` | 完整消息，保留原来的角色、内容及调用关联信息 |

要分清两种标识：外层 `m2`、`m3` 用于组织会话记录；消息内部的 `call-1` 用于关联一次工具调用和它的结果。恢复会话时，这两层关系都会保留。

现在，保存与恢复的目标就具体了：保存时，把完整消息包装成记录，逐行追加；恢复时，读取记录，取回按对话顺序排列的消息。

## 4. pi 怎样完成这次保存与恢复？

整条路径只有三个步骤：准备会话文件、写入消息、加载消息并交给新 Agent。

### 怎样创建一份会话文件？

pi 提供 `JsonlSessionRepo` 来创建和打开磁盘会话。应用指定保存目录，并沿用第九章的本地文件访问环境：

```ts
const env = new NodeExecutionEnv({ cwd });
const repo = new JsonlSessionRepo({
	fs: env,
	sessionsRoot: join(cwd, "sessions"),
});
const session = await repo.create({ id: "chapter-10", cwd });
```

`sessionsRoot` 是保存目录，`id` 是稍后用于查找的会话标识。`create()` 准备目录和文件头，再创建绑定到该文件的 `Session` 对象。其[实际返回位置](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/repo.ts#L122-L128)是：

```ts
return new Session(await JsonlSessionStorage.create(this.fs, path, header));
```

其中 `JsonlSessionStorage.create()` 将文件头写入新文件。得到的 `session` 就代表这个会话，后续消息通过它追加到同一文件中。

### 完整消息怎样变成文件中的一行？

保存一条完整消息的入口是：

```ts
await session.appendMessage(message);
```

以之前的工具结果为例，`message` 已经包含调用标识 `call-1` 和读出的代号。pi 要做的是为它增加会话记录信息，再将整条记录写入文件。下面沿实际调用顺序展示这条主路径；这是教学示意，只保留各步骤的数据变化：

```text
session.appendMessage(message)
  │
  ├─ Session：把消息包装成记录
  │    { type: "message", id: "m3", message }
  │
  └─ JsonlSessionStorage.appendEntry()：补齐记录字段
       { ...原记录, parentId: "m2", seq: 3, timestamp: 保存时间 }
       │
       └─ appendMutation()：将这条记录写入文件
            ├─ encodeMutation()：将记录转为 JSON 文本，末尾加换行
            └─ fs.appendFile()：将这行文本追加到会话文件
```

其中 `m3`、`m2` 和 `3` 沿用上一节的示意值。记录内的 `message` 始终保留原来的工具结果；变化的是外层增加了记录标识、前后关系和顺序编号。最后写出的内容，就是上一节 JSONL 示例中 `id: "m3"` 的那一行。

真正把编码结果交给文件系统的是下面这条[源码语句](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/storage.ts)。`mutation` 装着这次新增的记录，`this.metadata.path` 是会话文件路径：

```ts
await this.fs.appendFile(this.metadata.path, encodeMutation(mutation))
```

先把记录编码成一行，再追加到文件末尾，这就是消息落盘的核心动作。消息包装、字段补齐和文本编码分别可在 [`Session`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/session.ts#L271-L288)、[`JsonlSessionStorage.appendEntry()`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/storage.ts#L154-L169)和 [`encodeMutation()`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/codec.ts#L229-L232)中核对。

### 重启后，文件怎样重新成为 Agent 的历史？

新进程需要把文件中的记录读回来，再还原为按对话顺序排列的消息。已知会话信息 `metadata`（其中包含会话标识和文件路径）后，恢复的核心步骤是：

```ts
const session = await repo.open(metadata);
const entries = await session.findEntriesOnBranch({ order: "oldestFirst" });
const { messages } = buildSessionContext(entries);
```

这三行依次完成从文件到消息的转换：

1. **打开文件，恢复记录。** `open()` 调用 [`JsonlSessionStorage.load()`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/storage.ts#L69-L108)，读取文件头和后续各行，将 JSON 文本解析为会话记录。
2. **按对话顺序取出记录。** `findEntriesOnBranch()` 取得当前会话路径上的记录，`oldestFirst` 让最早的消息排在前面。
3. **从记录中取回消息。** `buildSessionContext()` 对本例的普通消息记录取出 `entry.message`，依次组成 `messages`。对应实现见[消息转换函数](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/context.ts#L65-L100)。

得到的数组仍然包含原来的用户输入、工具调用、工具结果和回答。将它传给新 Agent 的 `initialState.messages`，[Agent 初始化时就会接收这份历史](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/agent.ts#L68-L72)。下一次提问时，历史与新问题一起发给模型，便能接着原来的对话回答。

因此，恢复的过程就是：**文件中的 JSON 文本 → 有序的会话记录 → 新 Agent 的历史消息**。其中的工具结果直接作为历史内容使用，加载文件不会重新执行工具调用。

## 5. 运行 Lab，观察重启后能否继续回答

完整程序在 `labs/10-session-persistence.ts`。它沿用第九章的读取流程，并先后启动两个独立进程：第一个进程读取随机代号并保存会话，退出后，第二个进程加载会话并追问这个代号。

为了便于观察，第一个进程保存成功后会删除原始 `note.txt`。第二个进程收到的新问题不包含代号，需要从恢复的历史消息中取得它。

沿用前文依赖和项目根目录的 `.env`，运行：

```bash
node labs/10-session-persistence.ts
```

Lab 使用真实百炼服务，需要有效的 `DASHSCOPE_API_KEY` 和本地网络，按前文约定在沙箱外运行。预期输出节选如下，PID 和代号每次不同：

```text
phase: save, pid: 41001
restored roles: (empty)
file content: "用途：验证会话恢复\n本次验证代号：read-841273"
final answer: read-841273
saved roles: user -> assistant -> toolResult -> assistant
source file removed; save process will exit

phase: resume, pid: 41002
restored roles: user -> assistant -> toolResult -> assistant
source file exists: false
final answer: read-841273
saved roles: user -> assistant -> toolResult -> assistant -> user -> assistant
```

两个 PID 表明问答发生在不同进程中；`restored roles` 表明第二个进程已经取得原来的四条消息。对照最初文件内容与第二次回答，代号应当一致。追问结束后，保存的消息从四条增加到六条，说明新的一问一答也进入了同一会话。

这些输出供读者观察结果，不会自动断言模型回答正确。请求或保存失败时程序会报错；运行结束后，父进程清理实验创建的临时目录和会话文件。

## 6. 本章小结

会话持久化让原本只存在于内存中的对话，在程序退出后仍能保留。本例保存会话基本信息和有序的完整消息，以 JSONL 文件头和逐行消息记录组织；pi 负责创建文件、追加记录和重新加载，应用再把恢复的消息交给新 Agent。

这样，重启后的 Agent 就能根据之前的用户输入、工具结果和回答继续对话，并将新产生的消息接着保存。

源码核对入口：[`repo.ts` 中的会话创建与打开](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/repo.ts)、[`session.ts` 中的消息包装与查询](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/session.ts)、[`codec.ts` 中的文件记录编码](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/codec.ts)、[`storage.ts` 中的文件写入与加载](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/jsonl/storage.ts)、[`context.ts` 中的记录到消息转换](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/agent/src/harness/session/context.ts)。
