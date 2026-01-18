package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	cb "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/circuitBreaker"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/services"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/config"
)

type GatewayRoutesConfig struct {
	CarUrl			string
	RentalUrl		string
	PaymentUrl		string
}

type GatewayHandler struct {
	services 	*services.Services
	config   	*GatewayRoutesConfig
	carCB       *cb.CircuitBreaker
	rentalCB    *cb.CircuitBreaker
	paymentCB   *cb.CircuitBreaker
}

func NewHandler(services *services.Services, config *config.HandlerConfig) *GatewayHandler {
	return &GatewayHandler{
		services: services,
		config: &GatewayRoutesConfig{
			CarUrl: config.CarUrl,
			PaymentUrl: config.PaymentUrl,
			RentalUrl: config.RentalUrl,
		},
		carCB:     cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		rentalCB:  cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		paymentCB: cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
	}
}

func (h *GatewayHandler) SetupRoutes() *gin.Engine {
	router := gin.New()

	router.GET("/manage/health", func (c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := router.Group("/api/v1") 
	{
		cars := api.Group("/cars") 
		{
			cars.GET("", h.GetCars)
		}

		rental := api.Group("/rental")
		{
			rental.GET("", h.GetUserRentals)
			rental.GET(":rentalUid", h.GetRentalById)

			rental.POST("", h.RentCar)
			rental.POST(":rentalUid/finish", h.FinishCarRent)

			rental.DELETE(":rentalUid", h.RevokeRent)
		}
	}

	return router
}