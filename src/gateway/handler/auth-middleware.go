package handler

import (
	"net/http"
	"strings"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/models"
	"github.com/gin-gonic/gin"
)

func (h *GatewayHandler) AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if !strings.HasPrefix(authHeader, "Bearer ") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Token required"})
            return
        }
        token := strings.TrimPrefix(authHeader, "Bearer ")

        idToken, err := h.verifier.Verify(c.Request.Context(), token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid or expired token: " + err.Error()})
            return
        }

        var claims struct {
            Username string `json:"preferred_username"`
        }
        idToken.Claims(&claims)

        c.Set("username", claims.Username)
        c.Set("raw_token", token)
        c.Next()
    }
}