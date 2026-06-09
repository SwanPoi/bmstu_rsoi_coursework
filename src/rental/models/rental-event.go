package models

import "time"

type RentalEvent struct {
	RentalUID  string    `json:"rental_uid"`
	Username   string    `json:"username"`
	CarUID     string    `json:"car_uid"`
	PaymentUID string    `json:"payment_uid"`
	DateFrom   time.Time `json:"date_from"`
	DateTo     time.Time `json:"date_to"`
	Status     string    `json:"status"`
	Timestamp  time.Time `json:"created_at"`
}