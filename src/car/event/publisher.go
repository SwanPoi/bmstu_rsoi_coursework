package event

type EventPublisher interface {
	Publish(topic string, event interface{}) error
}

type TransactionalEventPublisher interface {
	EventPublisher
	PublishInTransaction(tx interface{}, topic string, event interface{}) error
	Close()
}

type NoopPublisher struct{}

func (n *NoopPublisher) Publish(topic string, event interface{}) error {
	return nil
}

func (n *NoopPublisher) PublishInTransaction(tx interface{}, topic string, event interface{}) error {
	return nil
}

func (n *NoopPublisher) Close() {}