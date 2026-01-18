package config

import (
	"fmt"
	"os"
)

type Config struct {
	Host			string
	Port			string
	DBHost			string
	DBPort			string
	DBUser			string
	DBPassword		string
	DBName			string
}

func Load() Config {
	return Config{
		Host: 			getenv("HOST", "0.0.0.0"),
		Port: 			getenv("PORT", "8060"),
		DBHost: 		getenv("DB_HOST", "postgres"),
		DBPort: 		getenv("DB_PORT", "5432"),
		DBPassword:		getenv("DB_PASSWORD", "postgres"),
		DBUser: 		getenv("DB_USER", "postgres"),
		DBName: 		getenv("DB_NAME", "rentals"),
	}
}

func (c Config) Addr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}