package event

import (
    "encoding/json"
    "log"
    "strings"
    "time"

    "github.com/IBM/sarama"
    "gorm.io/gorm"
)

type OutboxEvent struct {
    ID         uint   `gorm:"primaryKey;autoIncrement"`
    Topic      string `gorm:"size:100;not null;index"`
    Payload    string `gorm:"type:jsonb;not null"`
    CreatedAt  time.Time `gorm:"autoCreateTime;index"`
    Processed  bool   `gorm:"default:false;index"`
    RetryCount int    `gorm:"default:0"`
    LastError  string `gorm:"type:text"`
}

type OutboxPublisher struct {
    db       *gorm.DB
    producer sarama.SyncProducer
    stopCh   chan struct{}
}

func NewOutboxPublisher(db *gorm.DB, brokers string) (*OutboxPublisher, error) {
    config := sarama.NewConfig()
    config.Producer.RequiredAcks = sarama.WaitForAll
    config.Producer.Retry.Max = 20
    config.Producer.Return.Successes = true

    producer, err := sarama.NewSyncProducer(strings.Split(brokers, ","), config)
    if err != nil {
        return nil, err
    }

    pub := &OutboxPublisher{
        db:       db,
        producer: producer,
        stopCh:   make(chan struct{}),
    }

    if err := db.AutoMigrate(&OutboxEvent{}); err != nil {
        producer.Close()
        return nil, err
    }

    go pub.startPoller()
    log.Printf("Outbox publisher started with brokers: %s", brokers)
    return pub, nil
}

func (p *OutboxPublisher) Publish(topic string, event interface{}) error {
    payload, err := json.Marshal(event)
    if err != nil {
        return err
    }
    return p.db.Create(&OutboxEvent{
        Topic:   topic,
        Payload: string(payload),
    }).Error
}

func (p *OutboxPublisher) PublishInTransaction(tx interface{}, topic string, event interface{}) error {
    gormTx, ok := tx.(*gorm.DB)
    if !ok {
        return ErrInvalidTransaction
    }

    payload, err := json.Marshal(event)
    if err != nil {
        return err
    }

    return gormTx.Create(&OutboxEvent{
        Topic:   topic,
        Payload: string(payload),
    }).Error
}

func (p *OutboxPublisher) Close() {
    close(p.stopCh)
    if p.producer != nil {
        p.producer.Close()
    }
}

func (p *OutboxPublisher) startPoller() {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            p.processOutbox()
        case <-p.stopCh:
            return
        }
    }
}

func (p *OutboxPublisher) processOutbox() {
    var events []OutboxEvent
    if err := p.db.Where("processed = ? AND retry_count < ?", false, 10).
        Order("created_at ASC").
        Limit(100).
        Find(&events).Error; err != nil {
        log.Printf("Error fetching outbox: %v", err)
        return
    }

    for i := range events {
        p.sendEvent(&events[i])
    }
}

func (p *OutboxPublisher) sendEvent(event *OutboxEvent) {
    msg := &sarama.ProducerMessage{
        Topic: event.Topic,
        Value: sarama.StringEncoder(event.Payload),
    }

    if _, _, err := p.producer.SendMessage(msg); err != nil {
        log.Printf("Kafka send failed (id=%d): %v", event.ID, err)
        p.db.Model(event).Updates(map[string]interface{}{
            "retry_count": event.RetryCount + 1,
            "last_error":  err.Error(),
        })
        return
    }

    p.db.Model(event).Update("processed", true)
    log.Printf("Event sent: topic=%s, id=%d", event.Topic, event.ID)
}