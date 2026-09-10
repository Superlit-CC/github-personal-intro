---
title: "从零构建 Agent（2）：选择并调用不同模型服务"
date: 2026-09-06
excerpt: "通过统一的 models.complete() 入口选择 Provider，让模型服务的路由和认证留在调用入口内部。"
tags:
  - Agent
  - pi
  - TypeScript
series:
  name: "从零构建 Agent"
  order: 2
---

上一章固定了 `models.complete(model, context)` 的调用方式。本章增加第二个能力：切换模型时，上层代码不需要出现 Anthropic、OpenAI 等服务分支。

pi 把一个模型服务的模型目录、认证规则和调用能力封装成 Provider。本文第一次出现 Provider 时，只需要把它理解为“某个模型服务的接入对象”。

## 总览：一次调用如何找到模型服务

```mermaid
flowchart LR
    App["调用方"] -->|"models.complete()"| Models["Models<br/>查找 Provider 并应用认证"]
    Models --> Provider["Provider<br/>执行调用"]
    Provider --> Vendor["模型服务"]
    Vendor --> Reply["AssistantMessage"]
```

调用方仍然只提交 `Model` 和 `Context`。Provider 的查找和认证处理都发生在统一入口内部。

## 1. 为什么不能在调用方判断服务方

最直接的实现是写条件分支：

```ts
if (model.provider === "anthropic") {
	return callAnthropic(model, context);
}
return callOpenAI(model, context);
```

如果每个调用方都自己判断服务方，新增一个服务时就要修改所有调用位置。

pi 把选择逻辑集中到 `Models`：它根据 `model.provider` 查找并调用对应的 Provider。新增服务时只需要注册新的 Provider，调用方仍然使用 `models.complete(model, context)`，不需要增加服务方分支。

## 2. model.provider 指定模型服务

上一章只使用了 `Model.id`。为了选择模型服务，本章再使用真实 `Model` 类型中的 `provider` 字段：

```ts
interface Model {
	id: string;
	provider: ProviderId;
}

interface Provider {
	readonly id: string;
}
```

这是从两个真实类型中裁剪出的本章视图。`model.provider` 是服务标识，例如 `anthropic` 或 `openai`；它必须与注册表中的 `provider.id` 相同。

## 3. Models 如何完成路由

`Models.complete()` 最终使用下面这条内部调用路径：

```text
complete() → stream() → requireProvider() → applyAuth() → provider.stream() → result()
```

`Models.stream()` 是实际启动模型调用的统一入口。它返回一条可以持续接收模型输出的事件流；`complete()` 复用这个入口，并通过 `result()` 等待完整回复。

`requireProvider()` 负责按 `model.provider` 查找服务，找不到时立即报错：

```ts
private requireProvider(model: Model<Api>): Provider {
	const provider = this.providers.get(model.provider);
	if (!provider) {
		throw new ModelsError("provider", `Unknown provider: ${model.provider}`);
	}
	return provider;
}
```

找到 Provider 后，`Models.stream()` 应用该 Provider 的认证信息，再把调用交给它：

```ts
stream(
	model: Model<Api>,
	context: Context,
	options?: ModelsApiStreamOptions<Api>,
): AssistantMessageEventStream {
	return lazyStream(model, async () => {
		const provider = this.requireProvider(model);
		const { requestModel, requestOptions } = await this.applyAuth(model, options);
		return provider.stream(requestModel, context, requestOptions);
	});
}
```

执行流程仍然是三步：

1. `requireProvider()` 根据 `model.provider` 查找 Provider；
2. `applyAuth()` 应用该 Provider 的认证信息；
3. `provider.stream()` 使用处理后的参数执行调用。

本节新出现的变量含义如下：

- `options`：调用方传入的可选请求配置，没有传入时为 `undefined`；
- `requestModel`：应用认证配置后，本次请求实际使用的模型；
- `requestOptions`：合并调用方配置和认证信息后，本次请求实际使用的参数。

### 等待认证时，先把事件流交给调用方

上面的 `Models.stream()` 需要立即返回事件流，但 `applyAuth()` 是异步操作。认证完成之前，还不能调用 `provider.stream()`，也就拿不到 Provider 的事件流。`lazyStream()` 负责连接这两个阶段：先返回一个外层事件流，准备完成后，再把 Provider 内层事件流的内容转发过来。

这里的“外层”和“内层”只是相对于这次包装的称呼：外层是 `Models.stream()` 返回的对象，内层是准备完成后 `provider.stream()` 返回的对象。调用方始终持有同一个外层对象，无需在认证完成后更换它。

下面是 [`api/lazy.ts` 中的实现](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/ai/src/api/lazy.ts#L46-L61)，只省略了导出声明和类型标注：

```ts
function lazyStream(model, setup) {
	const outer = new AssistantMessageEventStream();

	setup()
		.then((inner) => forwardStream(outer, inner))
		.catch((error) => {
			const message = createSetupErrorMessage(model, error);
			outer.push({ type: "error", reason: "error", error: message });
			outer.end(message);
		});

	return outer;
}
```

`AssistantMessageEventStream` 就是前面方法声明返回的消息事件流类型。`setup` 是传入的准备函数，在 `Models.stream()` 中对应上面的 `async () => { ... }`：查找 Provider、等待认证，再返回 Provider 的事件流。

执行到 `setup()` 时，准备工作已经启动；`lazyStream()` 没有等待它完成，而是继续执行 `return outer`。认证完成后，`setup()` 返回的 Promise 得到内层流 `inner`，随后调用 `forwardStream(outer, inner)`。因此，函数名中的 `lazy` 不表示“等调用方开始读取才启动请求”。

[`forwardStream()`](https://github.com/earendil-works/pi/blob/3fc3ef532b966b28b764af070d62302c0acab0d5/packages/ai/src/api/lazy.ts#L31-L39) 的转发循环如下：

```ts
for await (const event of source) {
	target.push(event);
}
```

`source` 对应内层流，`target` 对应外层流。`for await` 按顺序等待并取出事件，每取出一条，`push()` 就将它交给外层流。循环结束后，源码还会结束外层流，并在内层提供 `result()` 时传递完整结果。这里不重新发起模型请求，也不改变事件内容。

如果准备或转发失败，`catch` 分支用 `createSetupErrorMessage()` 将异常和模型信息整理成错误消息，向外层发送 `error` 事件并结束流，避免调用方一直等待。

这层包装解决的是“同步返回事件流、异步准备请求”的衔接问题。Provider 的选择、认证和实际调用仍然保持上面的顺序。

### 沿同一条路径等待完整回复

等待完整回复的源码只做了一层调用。省略泛型和类型标注后，方法主体如下：

```ts
async complete(model, context, options) {
	return this.stream(model, context, options).result();
}
```

因此，`complete()` 和内部的 `stream()` 不会各自维护一套路由逻辑。`complete()` 沿同一条路径调用 Provider，并等待完整消息。

## 4. 同一份 Context 如何切换服务

```ts
const context = {
	messages: [{ role: "user", content: "hello", timestamp: Date.now() }],
};

const anthropicReply = await models.complete(anthropicModel, context);
const openaiReply = await models.complete(openaiModel, context);
```

两次调用只更换 `Model`。`Models` 分别找到对应 Provider；调用方不需要知道各服务的认证和调用细节。

## 5. 运行本章示例

完整程序在 `labs/02-provider-routing.ts`。它注册两个教学用 Provider，并通过同一个 `models.complete()` 入口调用它们：

```bash
node labs/02-provider-routing.ts
```

预期输出：

```text
anthropic: hello
openai: hello
chapter 2 example passed
```

示例只验证 `model.provider` 如何选择 Provider。Provider 返回固定消息，因此运行时不需要密钥或网络连接。

## 6. 本章小结

- 调用方只使用统一的 `models.complete(model, context)`；
- `Models` 根据 `model.provider` 找到模型服务；
- Provider 提供认证规则，`Models` 把认证结果应用到本次请求；
- 服务选择和认证差异不会进入上层调用代码。

对应源码：[`models.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/models.ts)、[`types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts)。
