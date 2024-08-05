Run bare metal

```bash
go run **/**.go --dir=data serve --http=0.0.0.0:8090
```

Run inside docker in prod mode

```bash
docker-compose build && docker-compose up
```

Run inside docker in dev mode

```bash
docker-compose build;
docker-compose -f docker-compose.dev.yml up;
```

Structure
App entry: main.go
The main.go file expects build artefacts to be inside the frontend/static folder,
which it uses to embed the static files into the binary.
frontend: web portal

Frontend conatins all the publicly available files that are served to the user
It's built on templ for interfacing html with go, and tailwind for styling

Prerequisites for building the frontend
install templ, nodejs and npm
The packagae.json file contains the build:css script that builds the css file usind npm
