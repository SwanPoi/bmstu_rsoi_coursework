package main

import (
	"log"

	handler "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/handler"
	models "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/config"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/repositories"
	server "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/server"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/services"
	event "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/event"
)

func main() {
	cfg := config.Load()

	connString := repo.GetConnectionString(&repo.DatabaseConfig{
		Host: cfg.DBHost,
		Port: cfg.DBPort,
		User: cfg.DBUser,
		Password: cfg.DBPassword,
		Database: cfg.DBName,
	})

	db, err := repo.InitDb(connString)

	if err != nil {
		log.Fatal("Fail during db connection", err)
		return
	}

	log.Print("Successfully connect to database")
	db.AutoMigrate(&models.Car{})

	var publisher event.TransactionalEventPublisher
	if cfg.KafkaBrokers != "" {
		outboxPub, err := event.NewOutboxPublisher(db, cfg.KafkaBrokers)
		if err != nil {
			log.Printf("Warning: Failed to initialize Outbox publisher: %v", err)
			publisher = &event.NoopPublisher{}
		} else {
			publisher = outboxPub
			defer outboxPub.Close()
		}
	} else {
		publisher = &event.NoopPublisher{}
	}

	repos := repo.NewRepository(db)
	service := services.NewCarService(repos, publisher, db)
	handler := handler.NewHandler(service, &cfg)

	srv := new(server.CommonServer)

	if err := srv.Run(cfg.Addr(), handler.SetupRoutes()); err != nil {
		log.Fatal("Fail during car server start", err)
		return
	}
}