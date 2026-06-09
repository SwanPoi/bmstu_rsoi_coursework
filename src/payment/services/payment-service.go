package services

import (
	"math"
	"time"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/event"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PaymentService struct {
	repo repo.IPaymentRepo
	eventPublisher event.TransactionalEventPublisher
	db             *gorm.DB
}

func NewPaymentService(repo repo.IPaymentRepo, publisher event.TransactionalEventPublisher, db *gorm.DB) *PaymentService {
	return &PaymentService{
		repo:           repo,
		eventPublisher: publisher,
		db:             db,
	}
}

func (s *PaymentService) GetPaymentByUid(uid string) (*models.PaymentResponse, error) {
	return s.repo.GetPaymentByUid(uid)
}

func (s *PaymentService) GetPaymentsByUids(uids []string) ([]models.PaymentResponse, error) {
	return s.repo.GetPaymentsByUids(uids)
}

func (s *PaymentService) UpdatePayment(payment models.PaymentUpsert, uid string) (*models.PaymentResponse, error) {
	validStatuses := map[string]bool{
		"PAID":     true,
		"CANCELED": true,
	}
	if !validStatuses[payment.Status] {
		return nil, models.InvalidStatus
	}

	var updatedPayment *models.PaymentResponse
	
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		updatedPayment, err = s.repo.UpdatePayment(tx, payment, uid)
		if err != nil {
			return err
		}

		if s.eventPublisher != nil {
			paymentEvent := models.PaymentEvent{
				PaymentUID: updatedPayment.PaymentUID,
				Status:     payment.Status,
				Price:      updatedPayment.Price,
				Timestamp:  time.Now(),
			}
			if err := s.eventPublisher.PublishInTransaction(tx, "payment-events", paymentEvent); err != nil {
				return err
			}
		}
		return nil
	})

	return updatedPayment, err
}

func (s *PaymentService) CreatePayment(paymentInsert models.PaymentCreate) (*models.PaymentResponse, error) {
	duration := paymentInsert.DateTo.Sub(paymentInsert.DateFrom)
	days := int(math.Round(duration.Round(time.Hour).Hours() / 24))
	price := paymentInsert.PricePerDay * days
	
	payment := models.Payment{
		PaymentUID: uuid.New().String(),
		Status:     "PAID",
		Price:      price,
	}

	var response *models.PaymentResponse

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreatePayment(tx, payment); err != nil {
			return err
		}

		if s.eventPublisher != nil {
			paymentEvent := models.PaymentEvent{
				PaymentUID: payment.PaymentUID,
				Status:     payment.Status,
				Price:      payment.Price,
				Timestamp:  time.Now(),
			}
			if err := s.eventPublisher.PublishInTransaction(tx, "payment-events", paymentEvent); err != nil {
				return err
			}
		}

		response = &models.PaymentResponse{
			PaymentUID: payment.PaymentUID,
			Status:     payment.Status,
			Price:      payment.Price,
		}
		return nil
	})

	return response, err
}
