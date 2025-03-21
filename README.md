Run bare metal

```bash
make dev
```

Run inside docker in prod mode. Omit if you don't need raw ssh access

```bash
docker build -t dukahub . && docker run -p 80:80 -p 2222:2222  -v "$(pwd)"/pb_data:/pb_data dukahub
```

NOTE: You need to disable secure cookie off in main.go

```go
	Secure: false,
```

In case you need raw ssh access

```bash
ssh -p 2222 root@localhost
```

In case you want to force fetch latest changes

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

# HOW TO GENERATE TYPES

We use <https://github.com/snonky/pocketbase-gogen/tree/v0.5.2> to generate types for our database.

```bash
pocketbase-gogen template ./pb_data ./models/pbschema/template.go
&&
pocketbase-gogen generate ./models/pbschema/template.go ./models/generated.go
&&
pocketbase-gogen generate ./models/pbschema/template.go ./models/generated.go --utils
```

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
