Run bare metal
``` bash
go run **/**.go --dir=data serve --http=0.0.0.0:8090
```

Run inside docker in prod mode
``` bash
docker-compose build && docker-compose up
```

Run inside docker in dev mode
```bash
docker-compose build;
docker-compose -f docker-compose.dev.yml up;
```
