package services

import (
	"time"
	"gorm.io/gorm"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/event"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/repositories"
)

type IRentalService interface {
	GetUserRentalByUid(uid string, username string) (*models.RentalResponse, error)
	GetUserRentals(username string) ([]models.RentalResponse, error)
	CreateRental(models.RentCreation) (*models.RentalResponse, error)
	UpdateRental(rental models.RentalUpsert, uid string, username string) (*models.RentalResponse, error)
	GetBookedCarsInPeriod(dateFrom, dateTo time.Time) ([]string, error)
}

type Services struct {
	IRentalService
}

func NewServices(repo *repo.Repository, publisher event.TransactionalEventPublisher, db *gorm.DB) *Services {
	return &Services{
		IRentalService: NewRentalService(repo, publisher, db),
	}
}