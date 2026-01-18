package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"

	cb "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/circuitBreaker"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/config"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/services"
)

type GatewayRoutesConfig struct {
	CarUrl			string
	RentalUrl		string
	PaymentUrl		string
	IssuerURL		string
}

type GatewayHandler struct {
	services 	*services.Services
	config   	*GatewayRoutesConfig
	carCB       *cb.CircuitBreaker
	rentalCB    *cb.CircuitBreaker
	paymentCB   *cb.CircuitBreaker
	verifier 	*oidc.IDTokenVerifier
}

func NewHandler(services *services.Services, config *config.HandlerConfig) *GatewayHandler {
	var provider *oidc.Provider
	var err error
	for i := 0; i < 20; i++ {
		provider, err = oidc.NewProvider(context.Background(), config.IssuerURL)
		if err == nil {
			break
		}
		log.Printf("Waiting for Keycloak... (attempt %d)", i+1)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Keycloak is unavailable: %v", err)
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: config.ClientID})

	return &GatewayHandler{
		services: services,
		config: &GatewayRoutesConfig{
			CarUrl: 		config.CarUrl,
			PaymentUrl: 	config.PaymentUrl,
			RentalUrl: 		config.RentalUrl,
			IssuerURL: 		config.IssuerURL,
		},
		carCB:     cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		rentalCB:  cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		paymentCB: cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		verifier: verifier,
	}
}

func (h *GatewayHandler) SetupRoutes() *gin.Engine {
	router := gin.New()

	router.GET("/manage/health", func (c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := router.Group("/api/v1")
    {
        api.POST("/authorize", h.Authorize)
		api.POST("/oauth/token", h.Authorize)
        api.GET("/callback", h.Callback)
    }

	secure := router.Group("/api/v1") 
	secure.Use(h.AuthMiddleware())
	{
		cars := secure.Group("/cars") 
		{
			cars.GET("", h.GetCars)
		}

		rental := secure.Group("/rental")
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