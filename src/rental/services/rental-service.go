package services

import (
	"time"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/event"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/repositories"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RentalService struct {
	repo           repo.IRentalRepo
	eventPublisher event.TransactionalEventPublisher
	db             *gorm.DB
}

func NewRentalService(repo repo.IRentalRepo, publisher event.TransactionalEventPublisher, db *gorm.DB) *RentalService {
	return &RentalService{
		repo:           repo,
		eventPublisher: publisher,
		db:             db,
	}
}

func (s *RentalService) GetUserRentalByUid(uid string, username string) (*models.RentalResponse, error) {
	rental, err := s.repo.GetRentalByUid(uid)

	if err != nil {
		return nil, err
	}

	if rental.Username != username {
		return nil, models.Forbidden
	}

	rentalResponse := utils.ConvertToRentalResponse(*rental)

	return &rentalResponse, nil
}

func (s *RentalService) GetUserRentals(username string) ([]models.RentalResponse, error) {
	return s.repo.GetUserRentals(username)
}

func (s *RentalService) CreateRental(rentalReq models.RentCreation) (*models.RentalResponse, error) {
	dateFrom, err := time.Parse("2006-01-02", rentalReq.DateFrom)
	if err != nil {
		return nil, err
	}
	dateTo, err := time.Parse("2006-01-02", rentalReq.DateTo)
	if err != nil {
		return nil, err
	}

	rental := models.Rental{
		RentalUID:  uuid.New().String(),
		Username:   rentalReq.Username,
		CarUID:     rentalReq.CarUID,
		PaymentUID: rentalReq.PaymentUID,
		Status:     "IN_PROGRESS",
		DateFrom:   dateFrom,
		DateTo:     dateTo,
	}

	var response models.RentalResponse

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateRental(tx, rental); err != nil {
			return err
		}

		if s.eventPublisher != nil {
			rentalEvent := models.RentalEvent{
				RentalUID:  rental.RentalUID,
				Username:   rental.Username,
				CarUID:     rental.CarUID,
				PaymentUID: rental.PaymentUID,
				DateFrom:   rental.DateFrom,
				DateTo:     rental.DateTo,
				Status:     rental.Status,
				Timestamp:  time.Now(),
			}
			if err := s.eventPublisher.PublishInTransaction(tx, "rental-events", rentalEvent); err != nil {
				return err
			}
		}

		response = utils.ConvertToRentalResponse(rental)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &response, nil
}

func (s *RentalService) UpdateRental(rental models.RentalUpsert, uid string, username string) (*models.RentalResponse, error) {
	validStatuses := map[string]bool{
		"IN_PROGRESS": true,
		"FINISHED":    true,
		"CANCELED":    true,
	}
	if !validStatuses[rental.Status] {
		return nil, models.InvalidStatus
	}

	var updatedResponse *models.RentalResponse
	var existingRental *models.Rental

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		existingRental, err = s.repo.GetRentalByUidInTransaction(tx, uid)
		if err != nil {
			return err
		}

		if existingRental.Username != username {
			return models.Forbidden
		}

		updatedResponse, err = s.repo.UpdateRental(tx, rental, uid, username)
		if err != nil {
			return err
		}

		if s.eventPublisher != nil {
			rentalEvent := models.RentalEvent{
				RentalUID:  uid,
				Username:   existingRental.Username,
				CarUID:     existingRental.CarUID,
				PaymentUID: existingRental.PaymentUID,
				DateFrom:   existingRental.DateFrom,
				DateTo:     existingRental.DateTo,
				Status:     rental.Status,
				Timestamp:  time.Now(),
			}
			if err := s.eventPublisher.PublishInTransaction(tx, "rental-events", rentalEvent); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return updatedResponse, nil
}


func (s *RentalService) GetBookedCarsInPeriod(dateFrom, dateTo time.Time) ([]string, error) {
	return s.repo.GetBookedCarsInPeriod(dateFrom, dateTo)
}

// func (s *RentalService) CreateRental(rentalReq models.RentCreation) (*models.RentalResponse, error) {
// 	dateFrom, err := time.Parse("2006-01-02", rentalReq.DateFrom)
//     if err != nil {
//         return nil, err
//     }

//     dateTo, err := time.Parse("2006-01-02", rentalReq.DateTo)
//     if err != nil {
//         return nil, err
//     }

// 	rental := models.Rental{
// 		RentalUID: uuid.New().String(),
// 		Username: rentalReq.Username,
// 		CarUID: rentalReq.CarUID,
// 		PaymentUID: rentalReq.PaymentUID,
// 		Status: "IN_PROGRESS",
// 		DateFrom: dateFrom,
// 		DateTo: dateTo,
// 	}

// 	if err := s.repo.CreateRental(rental); err == nil {
// 		response := utils.ConvertToRentalResponse(rental)
// 		return &response, nil
// 	} else {
// 		return nil, err
// 	}
// }

// func (s *RentalService) UpdateRental(rental models.RentalUpsert, uid string, username string) (*models.RentalResponse, error) {
// 	validStatuses := map[string]bool{
//         "IN_PROGRESS": true,
//         "FINISHED":    true,
//         "CANCELED":    true,
//     }

// 	if !validStatuses[rental.Status] {
//         return nil, models.InvalidStatus
//     }

// 	return s.repo.UpdateRental(rental, uid, username)
// }