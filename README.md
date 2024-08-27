Run bare metal

```bash
go run *.go --dir=data serve &
cd frontend && npm run watch
```

Run inside docker in prod mode

```bash
docker build -t pantrify . && docker run -p 80:80 -v "$(pwd)"/data:/data pantrify
```

In case you want to force fetch latest changes (e.g recent update to db utils has been cached)

```bash
    GOPROXY=direct go get -u
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

## Account setup requirements

username
email
password
avatar

Company name
Company location
Company phone number
Company logo

Financial accounts
Account name
Account number
Account type

Each company MUST have at least:
one financial account
one user account
one product

Each company can have multiple accounts
