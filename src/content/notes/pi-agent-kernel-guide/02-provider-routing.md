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

`lazyStream()` 让认证准备和 Provider 调用在返回事件流后继续执行，不改变上述路由顺序。

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
