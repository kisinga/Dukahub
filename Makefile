dev: 
	npx nodemon --signal SIGTERM -e "templ go" -x "templ generate && go run main.go serve" -i "**/*_templ.go"

generate: 
	templ generate

build: generate
	CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o backend

run: generate
	go run main.go serve