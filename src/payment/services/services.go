package services

import (
	"gorm.io/gorm"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/event"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/models"
	repo "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/repositories"
)

type IPaymentService interface {
	GetPaymentByUid(string) (*models.PaymentResponse, error)
	GetPaymentsByUids(uids []string) ([]models.PaymentResponse, error)
	UpdatePayment(models.PaymentUpsert, string) (*models.PaymentResponse, error)
	CreatePayment(payment models.PaymentCreate) (*models.PaymentResponse, error)
}

type Services struct {
	IPaymentService
}

func NewServices(repo repo.IPaymentRepo, publisher event.TransactionalEventPublisher, db *gorm.DB) *Services {
	return &Services{
		IPaymentService: NewPaymentService(repo, publisher, db),
	}
}