package services

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/utils"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type MockRentalRepository struct {
	mock.Mock
}

func (m *MockRentalRepository) GetRentalByUid(uid string) (*models.Rental, error) {
	args := m.Called(uid)
	if rental := args.Get(0); rental != nil {
		return rental.(*models.Rental), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockRentalRepository) GetRentalByUidInTransaction(tx *gorm.DB, uid string) (*models.Rental, error) {
	args := m.Called(tx, uid)
	if rental := args.Get(0); rental != nil {
		return rental.(*models.Rental), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockRentalRepository) GetUserRentals(username string) ([]models.RentalResponse, error) {
	args := m.Called(username)
	return args.Get(0).([]models.RentalResponse), args.Error(1)
}

func (m *MockRentalRepository) CreateRental(tx *gorm.DB, rental models.Rental) error {
	args := m.Called(tx, rental)
	return args.Error(0)
}

func (m *MockRentalRepository) UpdateRental(tx *gorm.DB, rental models.RentalUpsert, uid string, username string) (*models.RentalResponse, error) {
	args := m.Called(tx, rental, uid, username)
	if response := args.Get(0); response != nil {
		return response.(*models.RentalResponse), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockRentalRepository) GetBookedCarsInPeriod(dateFrom, dateTo time.Time) ([]string, error) {
	args := m.Called(dateFrom, dateTo)
	return args.Get(0).([]string), args.Error(1)
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
	dbName := fmt.Sprintf("file:test_rental_%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS rentals (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		rental_uid TEXT NOT NULL,
		username TEXT NOT NULL,
		car_uid TEXT NOT NULL,
		payment_uid TEXT NOT NULL,
		status TEXT NOT NULL,
		date_from DATETIME NOT NULL,
		date_to DATETIME NOT NULL
	);
	`
	if err := db.Exec(createTableSQL).Error; err != nil {
		t.Fatalf("Failed to create rentals table: %v", err)
	}

	return db
}

func TestRentalService_GetUserRentalByUid_NotFound(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	uid := "test-uid"
	username := "test-user"
	expectedError := errors.New("record not found")

	mockRepo.On("GetRentalByUid", uid).Return((*models.Rental)(nil), expectedError)

	_, err := service.GetUserRentalByUid(uid, username)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
}

func TestRentalService_GetUserRentalByUid_Forbidden(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	uid := "test-uid"
	username := "john_doe"
	rental := &models.Rental{
		RentalUID: uid,
		Username:  "jane_smith",
	}

	mockRepo.On("GetRentalByUid", uid).Return(rental, nil)

	_, err := service.GetUserRentalByUid(uid, username)

	assert.True(t, errors.Is(err, models.Forbidden))
	mockRepo.AssertExpectations(t)
}

func TestRentalService_GetUserRentalByUid_Success(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	uid := "test-uid"
	username := "john_doe"
	rental := &models.Rental{
		RentalUID: uid,
		Username:  username,
		Status:    "IN_PROGRESS",
	}

	expectedResponse := utils.ConvertToRentalResponse(*rental)

	mockRepo.On("GetRentalByUid", uid).Return(rental, nil)

	response, err := service.GetUserRentalByUid(uid, username)

	assert.Nil(t, err)
	assert.Equal(t, expectedResponse, *response)
	mockRepo.AssertExpectations(t)
}

func TestRentalService_GetUserRentals_Success(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	username := "john_doe"
	expectedRentals := []models.RentalResponse{
		{RentalUID: "uid1", Status: "IN_PROGRESS"},
		{RentalUID: "uid2", Status: "FINISHED"},
	}

	mockRepo.On("GetUserRentals", username).Return(expectedRentals, nil)

	rentals, err := service.GetUserRentals(username)

	assert.Nil(t, err)
	assert.Equal(t, expectedRentals, rentals)
	mockRepo.AssertExpectations(t)
}

func TestRentalService_GetUserRentals_Error(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	username := "john_doe"
	expectedError := errors.New("database error")

	mockRepo.On("GetUserRentals", username).Return([]models.RentalResponse{}, expectedError)

	_, err := service.GetUserRentals(username)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
}

func TestRentalService_CreateRental_Success(t *testing.T) {
	db := setupTestDB(t)
	mockRepo := new(MockRentalRepository)
	mockPub := new(MockEventPublisher)
	service := NewRentalService(mockRepo, mockPub, db)

	rentalReq := models.RentCreation{
		Username:   "john_doe",
		CarUID:     "car-uid",
		PaymentUID: "payment-uid",
		DateFrom:   "2026-12-01",
		DateTo:     "2026-12-05",
	}

	mockRepo.On("CreateRental", mock.Anything, mock.MatchedBy(func(rental models.Rental) bool {
		return rental.Username == rentalReq.Username &&
			rental.CarUID == rentalReq.CarUID &&
			rental.PaymentUID == rentalReq.PaymentUID &&
			rental.Status == "IN_PROGRESS" &&
			rental.RentalUID != ""
	})).Return(nil)

	mockPub.On("PublishInTransaction", mock.Anything, "rental-events", mock.MatchedBy(func(evt interface{}) bool {
		rentalEvt, ok := evt.(models.RentalEvent)
		return ok && rentalEvt.Status == "IN_PROGRESS" && rentalEvt.Username == "john_doe"
	})).Return(nil)

	response, err := service.CreateRental(rentalReq)

	assert.Nil(t, err)
	assert.NotNil(t, response)
	assert.NotEmpty(t, response.RentalUID)
	assert.Equal(t, "IN_PROGRESS", response.Status)
	mockRepo.AssertExpectations(t)
	mockPub.AssertExpectations(t)
}

func TestRentalService_CreateRental_InvalidDate(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	rentalReq := models.RentCreation{
		Username: "john_doe",
		CarUID:   "car-uid",
		DateFrom: "invalid-date",
		DateTo:   "2026-12-05",
	}

	_, err := service.CreateRental(rentalReq)

	assert.NotNil(t, err)
}

func TestRentalService_UpdateRental_InvalidStatus(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	rental := models.RentalUpsert{Status: "INVALID_STATUS"}

	_, err := service.UpdateRental(rental, "uid", "john_doe")

	assert.True(t, errors.Is(err, models.InvalidStatus))
}

func TestRentalService_UpdateRental_Success(t *testing.T) {
	db := setupTestDB(t)
	mockRepo := new(MockRentalRepository)
	mockPub := new(MockEventPublisher)
	service := NewRentalService(mockRepo, mockPub, db)

	uid := "test-uid"
	username := "john_doe"
	rentalUpsert := models.RentalUpsert{Status: "FINISHED"}

	existingRental := &models.Rental{
		RentalUID:  uid,
		Username:   username,
		CarUID:     "car-uid",
		PaymentUID: "payment-uid",
		Status:     "IN_PROGRESS",
		DateFrom:   time.Now(),
		DateTo:     time.Now().Add(24 * time.Hour),
	}

	expectedResponse := &models.RentalResponse{
		RentalUID: uid,
		Status:    "FINISHED",
	}

	mockRepo.On("GetRentalByUidInTransaction", mock.Anything, uid).Return(existingRental, nil)
	mockRepo.On("UpdateRental", mock.Anything, rentalUpsert, uid, username).Return(expectedResponse, nil)
	mockPub.On("PublishInTransaction", mock.Anything, "rental-events", mock.MatchedBy(func(evt interface{}) bool {
		rentalEvt, ok := evt.(models.RentalEvent)
		return ok && rentalEvt.Status == "FINISHED" && rentalEvt.Username == username
	})).Return(nil)

	response, err := service.UpdateRental(rentalUpsert, uid, username)

	assert.Nil(t, err)
	assert.Equal(t, expectedResponse, response)
	mockRepo.AssertExpectations(t)
	mockPub.AssertExpectations(t)
}

func TestRentalService_GetBookedCarsInPeriod_Success(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	dateFrom := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	dateTo := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	expectedBookedCars := []string{"car-uid-1", "car-uid-2"}

	mockRepo.On("GetBookedCarsInPeriod", dateFrom, dateTo).Return(expectedBookedCars, nil)

	result, err := service.GetBookedCarsInPeriod(dateFrom, dateTo)

	assert.Nil(t, err)
	assert.Equal(t, expectedBookedCars, result)
	mockRepo.AssertExpectations(t)
}

func TestRentalService_GetBookedCarsInPeriod_RepoError(t *testing.T) {
	mockRepo := new(MockRentalRepository)
	service := NewRentalService(mockRepo, nil, nil)
	dateFrom := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	dateTo := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	expectedError := errors.New("database error")

	mockRepo.On("GetBookedCarsInPeriod", dateFrom, dateTo).Return([]string{}, expectedError)

	_, err := service.GetBookedCarsInPeriod(dateFrom, dateTo)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
}