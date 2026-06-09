package models

import "time"

type PaymentEvent struct {
	PaymentUID string    `json:"payment_uid"`
	Status     string    `json:"status"` // "PAID" или "CANCELED"
	Price      int       `json:"price"`
	Timestamp  time.Time `json:"timestamp"`
}