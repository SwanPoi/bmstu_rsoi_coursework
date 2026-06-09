package services

import (
	"gorm.io/gorm"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/event"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/repositories"
)

type ICarService interface {
	GetCars(page int, size int, showAll bool, excludeIds []string) (*models.PaginationResponse, error)
	// GetCars(page int, size int, showAll bool) (*models.PaginationResponse, error)
	GetCarByUid(uuid string) (*models.ShortCar, error)
	GetFullCarByUid(uuid string) (*models.Car, error)
	GetCarsByUids([]string) ([]models.ShortCar, error)
	UpdateCar(car models.CarUpsert, uid string) (*models.ShortCar, error)
	CreateCar(car models.Car) (*models.ShortCar, error)
}

type Services struct {
	ICarService
}

func NewServices(repo repo.ICarRepo, publisher event.TransactionalEventPublisher, db *gorm.DB) *Services {
	return &Services{
		ICarService: NewCarService(repo, publisher, db),
	}
}