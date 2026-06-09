package services

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/models"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type MockPaymentRepository struct {
	mock.Mock
}

func (m *MockPaymentRepository) GetPaymentByUid(uid string) (*models.PaymentResponse, error) {
	args := m.Called(uid)
	if payment := args.Get(0); payment != nil {
		return payment.(*models.PaymentResponse), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockPaymentRepository) GetPaymentsByUids(uids []string) ([]models.PaymentResponse, error) {
	args := m.Called(uids)
	return args.Get(0).([]models.PaymentResponse), args.Error(1)
}

func (m *MockPaymentRepository) UpdatePayment(tx *gorm.DB, payment models.PaymentUpsert, uid string) (*models.PaymentResponse, error) {
	args := m.Called(tx, payment, uid)
	if response := args.Get(0); response != nil {
		return response.(*models.PaymentResponse), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockPaymentRepository) CreatePayment(tx *gorm.DB, payment models.Payment) error {
	args := m.Called(tx, payment)
	return args.Error(0)
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
	dbName := fmt.Sprintf("file:test_payment_%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS payments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		payment_uid TEXT NOT NULL,
		status TEXT NOT NULL CHECK (status IN ('PAID', 'CANCELED')),
		price INTEGER NOT NULL
	);
	`
	if err := db.Exec(createTableSQL).Error; err != nil {
		t.Fatalf("Failed to create payments table: %v", err)
	}

	return db
}

func TestPaymentService_GetPaymentByUid_Success(t *testing.T) {
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, nil)

	uid := "test-uid"
	expectedPayment := &models.PaymentResponse{
		PaymentUID: uid,
		Status:     "PAID",
		Price:      1000,
	}

	mockRepo.On("GetPaymentByUid", uid).Return(expectedPayment, nil)

	payment, err := service.GetPaymentByUid(uid)

	assert.Nil(t, err)
	assert.Equal(t, expectedPayment, payment)
	mockRepo.AssertExpectations(t)
}

func TestPaymentService_GetPaymentByUid_Error(t *testing.T) {
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, nil)

	uid := "test-uid"
	expectedError := errors.New("database error")

	mockRepo.On("GetPaymentByUid", uid).Return((*models.PaymentResponse)(nil), expectedError)

	_, err := service.GetPaymentByUid(uid)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
}

func TestPaymentService_GetPaymentsByUids_Success(t *testing.T) {
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, nil)

	uids := []string{"uid1", "uid2"}
	expectedPayments := []models.PaymentResponse{
		{PaymentUID: "uid1", Status: "PAID", Price: 1000},
		{PaymentUID: "uid2", Status: "CANCELED", Price: 0},
	}

	mockRepo.On("GetPaymentsByUids", uids).Return(expectedPayments, nil)

	payments, err := service.GetPaymentsByUids(uids)

	assert.Nil(t, err)
	assert.Equal(t, expectedPayments, payments)
	mockRepo.AssertExpectations(t)
}

func TestPaymentService_GetPaymentsByUids_Error(t *testing.T) {
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, nil)

	uids := []string{"uid1", "uid2"}
	expectedError := errors.New("database error")

	mockRepo.On("GetPaymentsByUids", uids).Return([]models.PaymentResponse{}, expectedError)

	_, err := service.GetPaymentsByUids(uids)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
}

func TestPaymentService_UpdatePayment_InvalidStatus(t *testing.T) {
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, nil)

	paymentUpsert := models.PaymentUpsert{
		Status: "INVALID_STATUS",
	}
	uid := "test-uid"

	_, err := service.UpdatePayment(paymentUpsert, uid)

	assert.True(t, errors.Is(err, models.InvalidStatus))
	mockRepo.AssertExpectations(t)
}

func TestPaymentService_UpdatePayment_Success(t *testing.T) {
	db := setupTestDB(t)
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, db)

	paymentUpsert := models.PaymentUpsert{
		Status: "CANCELED",
	}
	uid := "test-uid"
	expectedResponse := &models.PaymentResponse{
		PaymentUID: uid,
		Status:     "CANCELED",
		Price:      0,
	}

	mockRepo.On("UpdatePayment", mock.Anything, paymentUpsert, uid).Return(expectedResponse, nil)
	
	mockPub.On("PublishInTransaction", mock.Anything, "payment-events", mock.MatchedBy(func(evt interface{}) bool {
		payEvt, ok := evt.(models.PaymentEvent)
		return ok && payEvt.Status == "CANCELED" && payEvt.PaymentUID == uid
	})).Return(nil)

	response, err := service.UpdatePayment(paymentUpsert, uid)

	assert.Nil(t, err)
	assert.Equal(t, expectedResponse, response)
	mockRepo.AssertExpectations(t)
	mockPub.AssertExpectations(t)
}

func TestPaymentService_CreatePayment_RepoError(t *testing.T) {
	db := setupTestDB(t)
	mockRepo := new(MockPaymentRepository)
	mockPub := new(MockEventPublisher)
	service := NewPaymentService(mockRepo, mockPub, db)

	originalDayCost := models.DayCost
	models.DayCost = 1000
	defer func() { models.DayCost = originalDayCost }()

	dateFrom := time.Now().Truncate(24 * time.Hour)
	dateTo := dateFrom.Add(24 * time.Hour)

	paymentCreate := models.PaymentCreate{
		DateFrom: dateFrom,
		DateTo:   dateTo,
	}

	expectedError := errors.New("database error")
	mockRepo.On("CreatePayment", mock.Anything, mock.Anything).Return(expectedError)

	_, err := service.CreatePayment(paymentCreate)

	assert.True(t, errors.Is(err, expectedError))
	mockRepo.AssertExpectations(t)
	mockPub.AssertNotCalled(t, "PublishInTransaction")
}
