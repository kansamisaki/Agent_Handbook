---
title: "Java 演示身份边界"
outline: false
---

# Java 演示身份边界

完整文件：`business/src/main/java/book/copilot/Identity.java`。共 23 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```java [Identity.java]
package book.copilot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class Identity {
    public record Actor(String tenant, String user, String role) {}
    private final String alice, bob, viewer;
    public Identity(@Value("${copilot.alice-token}") String alice,
                    @Value("${copilot.bob-token}") String bob,
                    @Value("${copilot.viewer-token}") String viewer) {
        this.alice=alice; this.bob=bob; this.viewer=viewer;
    }
    public Actor authenticate(String header) {
        if (header.equals("Bearer " + alice)) return new Actor("acme", "alice", "operator");
        if (header.equals("Bearer " + bob)) return new Actor("beta", "bob", "operator");
        if (header.equals("Bearer " + viewer)) return new Actor("acme", "viewer", "viewer");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_token");
    }
}
```
