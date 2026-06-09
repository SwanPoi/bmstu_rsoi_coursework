package models

type FullCarResponse struct {
    ID                uint      `json:"id"`
    CarUID            string    `json:"car_uid"`
    Brand             string    `json:"brand"`
    Model             string    `json:"model"`
    RegistrationNumber string   `json:"registration_number"`
    Power             int       `json:"power"`
    Price             int       `json:"price"`
    Type              string    `json:"type"`
    Availability      bool      `json:"availability"`
}