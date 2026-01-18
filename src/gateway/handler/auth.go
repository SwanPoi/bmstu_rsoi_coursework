package handler

import (
    "fmt"
    "io"
    "net/http"
    "net/url"
    "github.com/gin-gonic/gin"
)

func (h *GatewayHandler) Authorize(c *gin.Context) {
    grantType := c.PostForm("grant_type")
    scope := c.PostForm("scope")
    username := c.PostForm("username")
    password := c.PostForm("password")
    clientID := c.PostForm("client_id")
    clientSecret := c.PostForm("client_secret")

    data := url.Values{}
    data.Set("grant_type", grantType)
    data.Set("scope", scope)
    data.Set("username", username)
    data.Set("password", password)
    data.Set("client_id", clientID)
    data.Set("client_secret", clientSecret)

    tokenUrl := fmt.Sprintf("%s/protocol/openid-connect/token", h.config.IssuerURL)

    resp, err := http.PostForm(tokenUrl, data)
    if err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Auth Service (Keycloak) unavailable"})
        return
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    c.Data(resp.StatusCode, "application/json", body)
}

func (h *GatewayHandler) Callback(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"message": "Callback received. For Authorization Code Flow exchange code for token here."})
}