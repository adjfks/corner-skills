# 插桩参考（前后端）

默认日志 API：`http://127.0.0.1:3847`（可用 `DEBUG_SERVER_PORT` 改端口）

统一日志文件：`{project_root}/.claude/debug.log`（NDJSON，一行一条）

**禁止** `console.log` / `print` / `stdout` 作为调试输出；一律走文件追加或 HTTP POST。

---

## 浏览器（React / Vue / 原生 JS）

在 `#region DEBUG` 内使用（`DEBUG_PORT` 与启动脚本一致）：

```javascript
// #region DEBUG
const __DBG = (h, msg, data) =>
  fetch(`http://127.0.0.1:3847/debug`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hypothesis: h,
      message: msg,
      data,
      location: "ComponentName.tsx:42",
    }),
  }).catch(() => {});
// #endregion DEBUG
```

调用示例：`__DBG("H1", "after fetch", { items: list.length });`

---

## Node / Bun / Deno（服务端）

**方式 A — HTTP（与浏览器相同，需 debug-server 已启动）**

```javascript
// #region DEBUG
fetch("http://127.0.0.1:3847/debug", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    hypothesis: "H2",
    message: "handler entry",
    data: { userId },
    location: "routes/user.ts:18",
  }),
}).catch(() => {});
// #endregion DEBUG
```

**方式 B — 直接写日志文件（无需 HTTP，适合 CLI / 无浏览器环境）**

`LOG_PATH` 必须是**写死的绝对路径**（从对话中的项目路径推断，禁止 `process.cwd()` / `__dirname` 动态解析）：

```javascript
// #region DEBUG
import fs from "fs";
const LOG_PATH = "/ABS/PATH/TO/project/.claude/debug.log";
fs.appendFileSync(
  LOG_PATH,
  JSON.stringify({
    ts: new Date().toISOString(),
    hypothesis: "H2",
    message: "[DEBUG H2] handler entry",
    data: { userId },
    location: "routes/user.ts:18",
  }) + "\n"
);
// #endregion DEBUG
```

---

## Python

```python
# #region DEBUG
import json, urllib.request
def _dbg(h, msg, data=None, loc=""):
    urllib.request.urlopen(
        urllib.request.Request(
            "http://127.0.0.1:3847/debug",
            data=json.dumps({"hypothesis": h, "message": msg, "data": data, "location": loc}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        ),
        timeout=0.5,
    )
# #endregion DEBUG
```

或文件追加（绝对路径写死）：

```python
# #region DEBUG
LOG_PATH = "/ABS/PATH/TO/project/.claude/debug.log"
with open(LOG_PATH, "a") as f:
    f.write(json.dumps({"hypothesis": "H1", "message": "[DEBUG H1] step", "data": x}) + "\n")
# #endregion DEBUG
```

---

## Go

```go
// #region DEBUG
func dbgLog(h, msg string, data any) {
    b, _ := json.Marshal(map[string]any{"hypothesis": h, "message": msg, "data": data})
    http.Post("http://127.0.0.1:3847/debug", "application/json", bytes.NewReader(b))
}
// #endregion DEBUG
```

---

## Region 标记对照

| 语言 | 开始 | 结束 |
|------|------|------|
| JS/TS/Go/Rust/C | `// #region DEBUG` | `// #endregion DEBUG` |
| Python/Ruby/Shell | `# #region DEBUG` | `# #endregion DEBUG` |
| HTML/Vue/Svelte | `<!-- #region DEBUG -->` | `<!-- #endregion DEBUG -->` |

日志消息格式：`[DEBUG H1]`、`[DEBUG H2]` … 与假设编号对应。
