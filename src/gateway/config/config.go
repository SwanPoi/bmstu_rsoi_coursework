package config

import (
	"fmt"
	"os"
)

type HandlerConfig struct {
	Host			string
	Port			string
	CarUrl			string
	RentalUrl		string
	PaymentUrl		string
	RedisHost		string
	RedisPort		string
	RedisPassword	string
}

func Load() HandlerConfig {
	return HandlerConfig{
		Host: 			getenv("HOST", "0.0.0.0"),
		Port: 			getenv("PORT", "8080"),
		CarUrl: 		getenv("CAR_URL", "http://cars:8070/api/v1"),
		RentalUrl: 		getenv("RENTAL_URL", "http://rental:8060/api/v1"),
		PaymentUrl: 	getenv("PAYMENT_URL", "http://payment:8050/api/v1"),
		RedisHost: 		getenv("REDIS_HOST", "redis"),
		RedisPort: 		getenv("REDIS_PORT", "6379"),
		RedisPassword:	getenv("REDIS_PASSWORD", ""),
	}
}

func (c HandlerConfig) Addr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

func (c HandlerConfig) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}