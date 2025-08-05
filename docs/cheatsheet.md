bind ngrok to our instance

```bash
ngrok http http://localhost:8090
```

reset pocketbase admin password. This happens more often than I'd like to admit

```bash
go build && ./dukahub superuser update stevekisinga@gmail.com 12345678
```
