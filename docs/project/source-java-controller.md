---
title: "Java HTTP 业务接口"
outline: false
---

# Java HTTP 业务接口

完整文件：`business/src/main/java/book/copilot/BusinessController.java`。共 35 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```java [BusinessController.java]
package book.copilot;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;
import static book.copilot.Contracts.*;

@RestController
public class BusinessController {
    private final Identity identity;
    private final TicketService service;
    public BusinessController(Identity identity,TicketService service) { this.identity=identity;this.service=service; }
    @GetMapping("/health")
    public Map<String,String> health() { return Map.of("status","ok","data","synthetic-fixtures"); }
    @GetMapping("/services/{id}/metrics")
    public Map<String,Object> metrics(@RequestHeader(value="Authorization",defaultValue="") String auth,@PathVariable String id) {
        var actor=identity.authenticate(auth);var data=service.service(actor,id);
        return Map.of("service_id",id,"service_version",data.get("service_version"),"pool_wait_ms",data.get("pool_wait_ms"),
            "db_cpu_pct",data.get("db_cpu_pct"),"evidence_id","metric:"+actor.tenant()+":"+id+":"+data.get("service_version"));
    }
    @GetMapping("/services/{id}/changes")
    public Map<String,Object> changes(@RequestHeader(value="Authorization",defaultValue="") String auth,@PathVariable String id) {
        var data=service.service(identity.authenticate(auth),id);
        return Map.of("evidence_id",data.get("change_id"),"description",data.get("change_description"));
    }
    @PostMapping("/tickets")
    public Map<String,Object> create(@RequestHeader(value="Authorization",defaultValue="") String auth,@Valid @RequestBody TicketRequest body) {
        return service.create(identity.authenticate(auth),body);
    }
    @GetMapping("/tickets")
    public List<Map<String,Object>> tickets(@RequestHeader(value="Authorization",defaultValue="") String auth) {
        return service.tickets(identity.authenticate(auth));
    }
}
```
