package repositories

import (
	"time"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
	"gorm.io/gorm"
)

type IRentalRepo interface {
	GetRentalByUid(uid string) (*models.Rental, error)
	GetUserRentals(username string) ([]models.RentalResponse, error)
	CreateRental(models.Rental) (error)
	UpdateRental(rental models.RentalUpsert, uid string, username string) (*models.RentalResponse, error)
	GetBookedCarsInPeriod(dateFrom, dateTo time.Time) ([]string, error)
}

type Repository struct {
	IRentalRepo
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		IRentalRepo: NewRentalPostgres(db),
	}
}