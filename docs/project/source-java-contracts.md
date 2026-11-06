---
title: "Java 字段合同"
outline: false
---

# Java 字段合同

完整文件：`business/src/main/java/book/copilot/Contracts.java`。共 18 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```java [Contracts.java]
package book.copilot;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class Contracts {
    private Contracts() {}
    public record Draft(
        @NotBlank @Pattern(regexp="[a-z][a-z0-9-]{0,39}") String serviceId,
        @Min(1) int serviceVersion,
        @NotBlank @Size(max=300) String title,
        @NotBlank @Size(max=4000) String body,
        @Pattern(regexp="in_app|email") @NotNull String channel) {}
    public record Approval(@Min(1) long expiresAt, @Pattern(regexp="[a-f0-9]{64}") @NotNull String signature) {}
    public record TicketRequest(
        @Pattern(regexp="ticket:[a-f0-9-]{36}") @NotNull String actionId,
        @Valid @NotNull Draft draft, @Valid @NotNull Approval approval) {}
}
```
