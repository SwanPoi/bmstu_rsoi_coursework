package repositories

import (
	"errors"
	"log"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
	"gorm.io/gorm"
)

type CarPostgres struct {
	DB *gorm.DB
}

func NewCarPostgres(db *gorm.DB) *CarPostgres {
	return &CarPostgres{DB: db}
}

func (r *CarPostgres) GetCars(offset int, limit int, showAll bool, excludeIds []string) ([]models.Car, int, error) {
	var total int64
	var cars []models.Car
	query := r.DB.Model(&models.Car{})

	if !showAll {
		query = query.Where("availability = ?", true)
	}

	log.Printf("Exclude ids  length %d", len(excludeIds))
	if len(excludeIds) > 0 {
		log.Printf("Exclude ids %s", excludeIds[0])
		query = query.Where("car_uid NOT IN ?", excludeIds)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Offset(offset).Limit(limit).Find(&cars).Error; err != nil {
		return nil, 0, err
	}

	return cars, int(total), nil
}

// func (r *CarPostgres) GetCars(offset int, limit int, showAll bool) ([]models.Car, int, error) {
// 	var total int64
// 	var cars []models.Car

// 	query := r.DB.Model(&models.Car{})

// 	if !showAll {
// 		query = query.Where("availability = ?", true)
// 	}

// 	if err := query.Count(&total).Error; err != nil {
// 		return nil, 0, err
// 	}

// 	if err := query.Offset(offset).Limit(limit).Find(&cars).Error; err != nil {
// 		return nil, 0, err
// 	}

// 	return cars, int(total), nil
// }

func (r *CarPostgres) GetCarByUid(uid string) (*models.Car, error) {
	var car models.Car

	if err := r.DB.Where("car_uid = ?", uid).First(&car).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrorNotFound
		}

		return nil, err
	}

	return &car, nil
}

func (r *CarPostgres) GetCarsByUids(uids []string) ([]models.Car, error) {
	var cars []models.Car

	if err := r.DB.Where("car_uid IN ?", uids).Find(&cars).Error; err != nil {
		return nil, err
	}

	return cars, nil
}

// func (r *CarPostgres) UpdateCar(car models.CarUpsert, uid string) (*models.Car, error) {
// 	result := r.DB.Model(&models.Car{}).
// 				Where("car_uid = ?", uid).
// 				Update("availability", car.Availability)
	
// 	if result.Error != nil {
// 		return nil, result.Error
// 	}

// 	if result.RowsAffected == 0 {
// 		return nil, models.ErrorNotFound
// 	}

// 	var updatedCar models.Car

// 	if err := r.DB.Where("car_uid = ?", uid).First(&updatedCar).Error; err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			return nil, models.ErrorNotFound
// 		}

// 		return nil, err
// 	}

// 	return &updatedCar, nil
// }

func (r *CarPostgres) CreateCar(tx *gorm.DB, car models.Car) (*models.Car, error) {
	if err := tx.Create(&car).Error; err != nil {
		return nil, err
	}
	return &car, nil
}

func (r *CarPostgres) GetCarByUidInTransaction(tx *gorm.DB, uid string) (*models.Car, error) {
	var car models.Car
	if err := tx.Where("car_uid = ?", uid).First(&car).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrorNotFound
		}
		return nil, err
	}
	return &car, nil
}

func (r *CarPostgres) UpdateCar(tx *gorm.DB, car models.CarUpsert, uid string) (*models.Car, error) {
	result := tx.Model(&models.Car{}).
		Where("car_uid = ?", uid).
		Update("availability", car.Availability)
	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, models.ErrorNotFound
	}

	var updatedCar models.Car
	if err := tx.Where("car_uid = ?", uid).First(&updatedCar).Error; err != nil {
		return nil, err
	}

	return &updatedCar, nil
}