package models

import "time"

type CarEvent struct {
	CarUID    string    `json:"car_uid"`
	Brand     string    `json:"brand"`
	Model     string    `json:"model"`
	Type      string    `json:"type"`
	Price     int       `json:"price"`
	Action    string    `json:"action"` // "created", "rented", "returned"
	Timestamp time.Time `json:"timestamp"`
}