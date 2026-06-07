package handler

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/SwanPoi/bmstu_rsoi_lab2/src/rental/models"
)

type CustomClaims struct {
	Username string   `json:"preferred_username"`
    UserId   string   `json:"user_id"`
	Email    string   `json:"email"`
	Roles    []string `json:"roles"`
}


func (h *RentalHandler) AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
        
        idToken, err := h.verifier.Verify(c.Request.Context(), token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized in Rental Service"})
            return
        }

        var claims CustomClaims
		if err := idToken.Claims(&claims); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Failed to parse token claims"})
			return
		}

		c.Set("username", claims.Username)
        c.Set("user_id", claims.UserId)
		
		c.Next()
    }
}