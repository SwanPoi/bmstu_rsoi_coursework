package services

import (
	"time"
	"github.com/google/uuid"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/event"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/converters"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/repositories"
	"gorm.io/gorm"
)

type CarService struct {
	repo repo.ICarRepo
	eventPublisher event.TransactionalEventPublisher
	db             *gorm.DB
}

func NewCarService(repo repo.ICarRepo, publisher event.TransactionalEventPublisher, db *gorm.DB) *CarService {
	return &CarService{
		repo:           repo,
		eventPublisher: publisher,
		db:             db,
	}
}

func (s *CarService) GetCars(page int, size int, showAll bool, excludeIds []string) (*models.PaginationResponse, error) {
	offset := (page - 1) * size
	cars, total, err := s.repo.GetCars(offset, size, showAll, excludeIds)

	if err != nil {
		return nil, err
	}

	carsResponse := converters.CarResponsesFromCars(cars)

	paginationResponse := &models.PaginationResponse{
		Page:          page,
		PageSize:      size,
		TotalElements: total,
		Items:         carsResponse,
	}

	return paginationResponse, nil
}

// func (s *CarService) GetCars(page int, size int, showAll bool) (*models.PaginationResponse, error) {
// 	offset := (page - 1) * size

// 	cars, total, err := s.repo.GetCars(offset, size, showAll)

// 	if err != nil {
// 		return nil, err
// 	}

// 	carsResponse := converters.CarResponsesFromCars(cars)

// 	paginationResponse := &models.PaginationResponse{
// 		Page: page,
// 		PageSize: size,
// 		TotalElements: total,
// 		Items: carsResponse,
// 	}

// 	return paginationResponse, nil
// }

func (s *CarService) GetCarByUid(uid string) (*models.ShortCar, error) {
	car, err := s.repo.GetCarByUid(uid)

	if err != nil {
		return nil, err
	}

	shortCar := converters.CarToShortCar(*car)

	return &shortCar, nil
}

func (s *CarService) GetFullCarByUid(uid string) (*models.Car, error) {
	car, err := s.repo.GetCarByUid(uid)
	if err != nil {
		return nil, err
	}
	
	return car, nil
}

func (s *CarService) GetCarsByUids(uids []string) ([]models.ShortCar, error) {
	cars, err := s.repo.GetCarsByUids(uids)

	if err != nil {
		return nil, err
	}

	var shortCars = make([]models.ShortCar, len(cars))

	for i, car := range cars {
		shortCars[i] = converters.CarToShortCar(car)
	}

	return shortCars, nil
}


func (s *CarService) UpdateCar(car models.CarUpsert, uid string) (*models.ShortCar, error) {
	var updatedCar *models.Car

	err := s.db.Transaction(func(tx *gorm.DB) error {
		existingCar, err := s.repo.GetCarByUidInTransaction(tx, uid)
		if err != nil {
			return err
		}

		updatedCar, err = s.repo.UpdateCar(tx, car, uid)
		if err != nil {
			return err
		}

		var action string
		if !existingCar.Availability && car.Availability {
			action = "returned"
		} else if existingCar.Availability && !car.Availability {
			action = "rented"
		}

		if action != "" {
			carEvent := models.CarEvent{
				CarUID:    uid,
				Brand:     updatedCar.Brand,
				Model:     updatedCar.Model,
				Type:      updatedCar.Type,
				Price:     updatedCar.Price,
				Action:    action,
				Timestamp: time.Now(),
			}

			if err := s.eventPublisher.PublishInTransaction(tx, "car-events", carEvent); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	shortCar := converters.CarToShortCar(*updatedCar)
	return &shortCar, nil
}

func (s *CarService) CreateCar(car models.Car) (*models.ShortCar, error) {
	var createdCar *models.Car

	err := s.db.Transaction(func(tx *gorm.DB) error {
		car.CarUID = uuid.New().String()
		car.Availability = true

		var err error
		createdCar, err = s.repo.CreateCar(tx, car)
		if err != nil {
			return err
		}

		carEvent := models.CarEvent{
			CarUID:    createdCar.CarUID,
			Brand:     createdCar.Brand,
			Model:     createdCar.Model,
			Type:      createdCar.Type,
			Price:     createdCar.Price,
			Action:    "created",
			Timestamp: time.Now(),
		}

		if err := s.eventPublisher.PublishInTransaction(tx, "car-events", carEvent); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	shortCar := converters.CarToShortCar(*createdCar)
	return &shortCar, nil
}