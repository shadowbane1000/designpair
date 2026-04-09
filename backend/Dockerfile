FROM golang:1.24-alpine AS builder

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/designpair ./cmd/designpair

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/designpair /designpair
EXPOSE 8081
ENTRYPOINT ["/designpair"]
