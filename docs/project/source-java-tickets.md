---
title: "Java 事务、审批签名与幂等"
outline: false
---

# Java 事务、审批签名与幂等

完整文件：`business/src/main/java/book/copilot/TicketService.java`。共 101 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```java [TicketService.java]
package book.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import static book.copilot.Contracts.*;

@Service
public class TicketService {
    private final JdbcTemplate db;
    private final ObjectMapper mapper;
    private final String secret;
    public TicketService(JdbcTemplate db, ObjectMapper mapper,
                         @Value("${copilot.approval-secret}") String secret) {
        this.db=db; this.mapper=mapper; this.secret=secret;
    }
    @PostConstruct
    public void seed() {
        seedOne("acme", "payment", 3, 1200, 23, "chg-104", "pool.max changed from 40 to 8");
        seedOne("acme", "inventory", 1, 900, 88, "chg-103", "No pool config change; evidence missing");
        seedOne("beta", "payment", 9, 12, 18, "chg-202", "Routine deployment; healthy");
    }
    private void seedOne(String tenant, String service, int version, int wait, int cpu, String change, String description) {
        Integer n=db.queryForObject("SELECT count(*) FROM services WHERE tenant=? AND service_id=?", Integer.class, tenant, service);
        if (n==0) db.update("INSERT INTO services VALUES(?,?,?,?,?,?,?)", tenant, service, version, wait, cpu, change, description);
    }
    public Map<String,Object> service(Identity.Actor actor, String serviceId) {
        var rows=db.queryForList("SELECT * FROM services WHERE tenant=? AND service_id=?", actor.tenant(), serviceId);
        if(rows.isEmpty()) throw error(404,"service_not_found");
        return normalize(rows.get(0));
    }
    static Map<String,Object> normalize(Map<String,Object> row) {
        Map<String,Object> out=new LinkedHashMap<>();
        row.forEach((k,v)->out.put(k.toLowerCase(Locale.ROOT),v));
        return out;
    }
    public String hash(Draft draft) {
        try {
            Map<String,Object> canonical=new TreeMap<>();
            canonical.put("body",draft.body()); canonical.put("channel",draft.channel());
            canonical.put("service_id",draft.serviceId()); canonical.put("service_version",draft.serviceVersion());
            canonical.put("title",draft.title());
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(canonical)));
        } catch(Exception e) { throw new IllegalStateException(e); }
    }
    private String signature(String text) {
        try {
            Mac mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(text.getBytes(StandardCharsets.UTF_8)));
        } catch(Exception e) { throw new IllegalStateException(e); }
    }
    private Map<String,Object> existing(Identity.Actor actor, String action, String hash) {
        var rows=db.queryForList("SELECT ticket_id,args_hash,actor FROM tickets WHERE tenant=? AND action_id=?", actor.tenant(),action);
        if(rows.isEmpty()) return null;
        var old=normalize(rows.get(0));
        if(!old.get("args_hash").equals(hash) || !old.get("actor").equals(actor.user())) throw error(409,"action_id_payload_conflict");
        return Map.of("ticket_id",old.get("ticket_id"),"replayed",true,"args_hash",hash);
    }
    @Transactional(timeout=5)
    public Map<String,Object> create(Identity.Actor actor, TicketRequest request) {
        if(!actor.role().equals("operator")) throw error(403,"operator_required");
        String hash=hash(request.draft());
        String message=actor.tenant()+"|"+actor.user()+"|"+request.actionId()+"|"+hash+"|"+request.approval().expiresAt();
        if(!MessageDigest.isEqual(signature(message).getBytes(StandardCharsets.US_ASCII),
            request.approval().signature().getBytes(StandardCharsets.US_ASCII))) throw error(403,"invalid_approval_signature");
        var prior=existing(actor,request.actionId(),hash);
        if(prior!=null) return prior; // Reconciliation may return an existing result after approval expiry.
        if(request.approval().expiresAt()<Instant.now().getEpochSecond()) throw error(409,"approval_expired");
        // Serialize commits for this resource. Re-check idempotency after acquiring the lock.
        var resources=db.queryForList("SELECT service_version FROM services WHERE tenant=? AND service_id=? FOR UPDATE",
            actor.tenant(),request.draft().serviceId());
        if(resources.isEmpty()) throw error(404,"service_not_found");
        prior=existing(actor,request.actionId(),hash);
        if(prior!=null) return prior;
        if(request.approval().expiresAt()<Instant.now().getEpochSecond()) throw error(409,"approval_expired_after_lock_wait");
        int version=((Number)normalize(resources.get(0)).get("service_version")).intValue();
        if(version!=request.draft().serviceVersion()) throw error(409,"resource_version_changed");
        String id="T-"+UUID.randomUUID();
        Draft d=request.draft();
        db.update("INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?)",id,actor.tenant(),actor.user(),request.actionId(),hash,
            d.serviceId(),d.title(),d.body(),d.channel(),Instant.now().getEpochSecond());
        return Map.of("ticket_id",id,"replayed",false,"args_hash",hash);
    }
    public List<Map<String,Object>> tickets(Identity.Actor actor) {
        return db.queryForList("SELECT ticket_id,action_id,service_id,title,channel,created_at FROM tickets WHERE tenant=? AND actor=? ORDER BY created_at",
            actor.tenant(),actor.user()).stream().map(TicketService::normalize).toList();
    }
    static ResponseStatusException error(int status,String message) { return new ResponseStatusException(HttpStatus.valueOf(status),message); }
}
```
