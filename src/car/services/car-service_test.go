package services

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type MockCarRepository struct {
	mock.Mock
}

func (m *MockCarRepository) GetCars(offset int, size int, showAll bool, excludeIds []string) ([]models.Car, int, error) {
	args := m.Called(offset, size, showAll, excludeIds)
	if cars := args.Get(0); cars != nil {
		return cars.([]models.Car), args.Get(1).(int), args.Error(2)
	}
	return nil, args.Get(1).(int), args.Error(2)
}

func (m *MockCarRepository) GetCarByUid(uid string) (*models.Car, error) {
	args := m.Called(uid)
	if car := args.Get(0); car != nil {
		return car.(*models.Car), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCarRepository) GetCarsByUids(uids []string) ([]models.Car, error) {
	args := m.Called(uids)
	return args.Get(0).([]models.Car), args.Error(1)
}

func (m *MockCarRepository) UpdateCar(car models.CarUpsert, uid string) (*models.Car, error) {
	args := m.Called(car, uid)
	if updatedCar := args.Get(0); updatedCar != nil {
		return updatedCar.(*models.Car), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockCarRepository) CreateCar(car models.Car) (*models.Car, error) {
	args := m.Called(car)
	if createdCar := args.Get(0); createdCar != nil {
		return createdCar.(*models.Car), args.Error(1)
	}
	return nil, args.Error(1)
}


type MockEventPublisher struct {
	mock.Mock
}

func (m *MockEventPublisher) Publish(topic string, evt interface{}) error {
	args := m.Called(topic, evt)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishInTransaction(tx interface{}, topic string, evt interface{}) error {
	args := m.Called(tx, topic, evt)
	return args.Error(0)
}

func (m *MockEventPublisher) Close() {}

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbName := fmt.Sprintf("file:test_%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	if err := db.AutoMigrate(&models.Car{}); err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	return db
}

func seedCars(t *testing.T, db *gorm.DB) []models.Car {
	t.Helper()

	cars := []models.Car{
		{CarUID: "uid1", Brand: "Toyota", Model: "Camry", RegistrationNumber: "А123БВ777", Power: 249, Price: 3500, Type: "SEDAN", Availability: true},
		{CarUID: "uid2", Brand: "BMW", Model: "X5", RegistrationNumber: "В456ГД197", Power: 340, Price: 5500, Type: "SUV", Availability: true},
		{CarUID: "uid3", Brand: "Honda", Model: "Civic", RegistrationNumber: "Е789ЖЗ50", Power: 180, Price: 2800, Type: "SEDAN", Availability: false},
		{CarUID: "uid4", Brand: "Ford", Model: "Focus", RegistrationNumber: "И012КЛ77", Power: 150, Price: 2500, Type: "SEDAN", Availability: true},
	}

	for i := range cars {
		if err := db.Create(&cars[i]).Error; err != nil {
			t.Fatalf("Failed to seed car %s: %v", cars[i].CarUID, err)
		}
	}

	return cars
}

func TestCarService_GetCars_Success_ShowAllFalse(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCars(1, 10, false, []string{})

	assert.Nil(t, err)
	assert.Equal(t, 1, result.Page)
	assert.Equal(t, 10, result.PageSize)
	assert.Equal(t, 3, result.TotalElements)
	assert.Equal(t, 3, len(result.Items))

	for _, item := range result.Items {
		assert.NotEqual(t, "uid3", item.CarUID)
	}
}

func TestCarService_GetCars_Success_ShowAllTrue(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCars(1, 10, true, []string{})

	assert.Nil(t, err)
	assert.Equal(t, 4, result.TotalElements)
	assert.Equal(t, 4, len(result.Items))
}

func TestCarService_GetCars_WithExcludeIds(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCars(1, 10, false, []string{"uid2", "uid3"})

	assert.Nil(t, err)
	// Должны остаться uid1 и uid4 (uid2 исключён, uid3 недоступен)
	assert.Equal(t, 2, result.TotalElements)
	assert.Equal(t, 2, len(result.Items))

	carUIDs := make([]string, len(result.Items))
	for i, item := range result.Items {
		carUIDs[i] = item.CarUID
	}
	assert.Contains(t, carUIDs, "uid1")
	assert.Contains(t, carUIDs, "uid4")
	assert.NotContains(t, carUIDs, "uid2")
	assert.NotContains(t, carUIDs, "uid3")
}

func TestCarService_GetCars_WithEmptyExcludeIds(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCars(1, 10, false, []string{})

	assert.Nil(t, err)
	assert.Equal(t, 3, result.TotalElements)
	assert.Equal(t, 3, len(result.Items))
}

func TestCarService_GetCars_Pagination(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result1, err := service.GetCars(1, 2, false, []string{})
	assert.Nil(t, err)
	assert.Equal(t, 1, result1.Page)
	assert.Equal(t, 2, result1.PageSize)
	assert.Equal(t, 3, result1.TotalElements)
	assert.Equal(t, 2, len(result1.Items))

	result2, err := service.GetCars(2, 2, false, []string{})
	assert.Nil(t, err)
	assert.Equal(t, 2, result2.Page)
	assert.Equal(t, 1, len(result2.Items))
}

// ============ Тесты GetCarByUid ============

func TestCarService_GetCarByUid_Success(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCarByUid("uid1")

	assert.Nil(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "uid1", result.CarUID)
	assert.Equal(t, "Toyota", result.Brand)
	assert.Equal(t, "Camry", result.Model)
}

func TestCarService_GetCarByUid_NotFound(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCarByUid("non-existent-uid")

	assert.NotNil(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, models.ErrorNotFound))
}

// ============ Тесты GetCarsByUids ============

func TestCarService_GetCarsByUids_Success(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCarsByUids([]string{"uid1", "uid2", "uid4"})

	assert.Nil(t, err)
	assert.Equal(t, 3, len(result))

	carUIDs := make([]string, len(result))
	for i, car := range result {
		carUIDs[i] = car.CarUID
	}
	assert.Contains(t, carUIDs, "uid1")
	assert.Contains(t, carUIDs, "uid2")
	assert.Contains(t, carUIDs, "uid4")
}

func TestCarService_GetCarsByUids_EmptyResult(t *testing.T) {
	db := setupTestDB(t)
	seedCars(t, db)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	result, err := service.GetCarsByUids([]string{"non-existent-1", "non-existent-2"})

	assert.Nil(t, err)
	assert.Equal(t, 0, len(result))
}

// ============ Тесты CreateCar ============

func TestCarService_CreateCar_Success(t *testing.T) {
	db := setupTestDB(t)

	mockPub := new(MockEventPublisher)
	carRepo := repo.NewCarPostgres(db)
	service := NewCarService(carRepo, mockPub, db)

	mockPub.On("PublishInTransaction", mock.Anything, "car-events", mock.MatchedBy(func(evt interface{}) bool {
		carEvt, ok := evt.(models.CarEvent)
		return ok && carEvt.Action == "created" && carEvt.Brand == "Tesla"
	})).Return(nil)

	car := models.Car{
		Brand:              "Tesla",
		Model:              "Model S",
		RegistrationNumber: "Х777ХХ777",
		Power:              670,
		Price:              15000,
		Type:               "SEDAN",
	}

	result, err := service.CreateCar(car)

	assert.Nil(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.CarUID)
	assert.Equal(t, "Tesla", result.Brand)
	assert.Equal(t, "Model S", result.Model)
	assert.Equal(t, true, result.Availability)

	// Проверяем, что автомобиль действительно создан в БД
	var carFromDB models.Car
	db.Where("car_uid = ?", result.CarUID).First(&carFromDB)
	assert.Equal(t, result.CarUID, carFromDB.CarUID)
	assert.Equal(t, "Tesla", carFromDB.Brand)
	assert.Equal(t, true, carFromDB.Availability)

	mockPub.AssertExpectations(t)
}