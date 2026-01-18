package main

import (
	"log"

	handler "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/handler"
	models "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/models"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/config"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/repositories"
	server "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/server"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/services"
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
	db.AutoMigrate(&models.Payment{})

	repos := repo.NewRepository(db)
	service := services.NewServices(repos)
	handler := handler.NewHandler(service)

	srv := new(server.CommonServer)

	if err := srv.Run(cfg.Addr(), handler.SetupRoutes()); err != nil {
		log.Fatal("Fail during payment server start", err)
		return
	}
}