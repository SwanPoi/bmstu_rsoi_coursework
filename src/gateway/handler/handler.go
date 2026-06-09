package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"

	cb "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/circuitBreaker"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/config"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/services"
)

type GatewayRoutesConfig struct {
	CarUrl			string
	RentalUrl		string
	PaymentUrl		string
	StatsUrl     	string
	IssuerURL		string
	ClientID		string
	ClientSecret	string
	FrontendURL		string
	IdpPublicURL	string
}

type GatewayHandler struct {
	services 	*services.Services
	config   	*GatewayRoutesConfig
	carCB       *cb.CircuitBreaker
	rentalCB    *cb.CircuitBreaker
	paymentCB   *cb.CircuitBreaker
	statsCB   *cb.CircuitBreaker
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
		log.Printf("Waiting for Identity Provider... (attempt %d)", i+1)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Identity Provider is unavailable: %v", err)
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: config.ClientID})

	return &GatewayHandler{
		services: services,
		config: &GatewayRoutesConfig{
			CarUrl: 		config.CarUrl,
			PaymentUrl: 	config.PaymentUrl,
			RentalUrl: 		config.RentalUrl,
			IssuerURL: 		config.IssuerURL,
			ClientID: 		config.ClientID,
			ClientSecret: 	config.ClientSecret,
			FrontendURL: 	config.FrontendURL,
			IdpPublicURL: 	config.IdpPublicURL,
			StatsUrl:		config.StatsUrl,
		},
		carCB:     cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		rentalCB:  cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		paymentCB: cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		statsCB:   cb.NewCircuitBreaker(5, 0.4, 30*time.Second),
		verifier: verifier,
	}
}

func (h *GatewayHandler) SetupRoutes() *gin.Engine {
	router := gin.New()

	corsConfig := cors.Config{
		AllowOrigins:     []string{"http://localhost:4200"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	router.GET("/manage/health", func (c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := router.Group("/api/v1")
    {
        api.GET("/authorize", h.Authorize)
		api.GET("/callback", h.Callback)
		api.GET("/logout", h.Logout)
		api.POST("/register", h.RegisterUser)
		api.GET("/register-page", h.RegisterPageRedirect)
    }

	secure := router.Group("/api/v1") 
	secure.Use(h.AuthMiddleware())
	{
		secure.GET("/me", h.GetCurrentUser)

		cars := secure.Group("/cars") 
		{
			cars.GET("", h.GetCars)
			cars.GET(":uid", h.GetCarById)

			adminCars := cars.Group("")
			adminCars.Use(h.RolesMiddleware([]string{"Admin"}))
			{
				adminCars.POST("", h.CreateCar)
			}
		}

		rental := secure.Group("/rental")
		{
			rental.GET("", h.GetUserRentals)
			rental.GET(":rentalUid", h.GetRentalById)

			rental.POST("", h.RentCar)
			rental.POST(":rentalUid/finish", h.FinishCarRent)

			rental.DELETE(":rentalUid", h.RevokeRent)
		}

		admin := secure.Group("")
        admin.Use(h.RolesMiddleware([]string{"Admin"}))
        {
            admin.POST("/users", h.CreateUser)
			admin.GET("/users/create-page", h.CreateUserPageRedirect)

			stats := admin.Group("/stats")
			{
				stats.GET("/rentals", h.StatsRentals)
				stats.GET("/payments", h.StatsPayments)
				stats.GET("/cars", h.StatsCars)
				stats.GET("/users", h.StatsUsers)
			}
        }
	}

	return router
}