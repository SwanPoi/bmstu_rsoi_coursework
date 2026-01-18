FROM golang:1.25.1-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /car

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main-app ./cmd/main.go

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /car/

COPY --from=builder /car/main-app .

EXPOSE 8070

ENTRYPOINT ["./main-app"]