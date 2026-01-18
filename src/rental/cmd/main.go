package main

import (
	"log"

	handler "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/handler"
	models "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/config"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/repositories"
	server "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/server"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/services"
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
	db.AutoMigrate(&models.Rental{})

	repos := repo.NewRepository(db)
	service := services.NewServices(repos)
	handler := handler.NewHandler(service)

	srv := new(server.CommonServer)

	if err := srv.Run(cfg.Addr(), handler.SetupRoutes()); err != nil {
		log.Fatal("Fail during rental server start", err)
		return
	}
}