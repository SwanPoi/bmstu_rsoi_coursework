package handler

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
)


func (h *CarHandler) AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
        
        idToken, err := h.verifier.Verify(c.Request.Context(), token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized in Rental Service"})
            return
        }

        var claims struct {
            Username string `json:"preferred_username"`
        }
        idToken.Claims(&claims)

        c.Set("username", claims.Username)
        c.Next()
    }
}