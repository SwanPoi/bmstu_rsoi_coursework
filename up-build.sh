#!/bin/bash
NAMESPACE="test"
echo "=== Создание namespace $NAMESPACE ==="
kubectl create namespace $NAMESPACE || echo "Namespace уже существует"

echo "=== Установка Helm чартов ==="

install_chart() {
    local name=$1
    local path=$2
    local label=$3
    echo "- Установка/обновление $name -"
    helm upgrade --install -n $NAMESPACE $name $path
    echo "- Ожидание готовности подов $name -"
    kubectl wait --for=condition=ready pod -n $NAMESPACE -l app=$label --timeout=300s
}

install_chart postgres ./k8s/postgres postgres
install_chart redis ./k8s/redis redis

echo "- Установка Kafka -"
helm upgrade --install -n $NAMESPACE kafka ./k8s/kafka
echo "- Ожидание готовности Kafka -"
kubectl wait --for=condition=ready pod -n $NAMESPACE -l app=kafka --timeout=300s

install_chart idp ./k8s/idp idp

echo "- Развертывание основных сервисов -"
helm upgrade --install -n $NAMESPACE services ./k8s/services

echo "- Ожидание готовности сервисов -"
for app in gateway cars rental payment stats; do
    kubectl wait -n $NAMESPACE -l app=$app pod --for=condition=ready --timeout=3m
done

echo "- Развертывание фронтенда -"
install_chart frontend ./k8s/frontend frontend

echo "=== Развертывание Ingress ==="
kubectl apply -f ./k8s/ingress.yaml -n $NAMESPACE

echo "Готово! Сервисы развернуты в namespace $NAMESPACE."
echo "Для проверки состояния выполните: kubectl get pods -n $NAMESPACE"

# Полезные команды для отладки:
# kubectl port-forward service/ingress-nginx-controller -n ingress-nginx 8080:80
# kubectl port-forward svc/idp-svc 8090:8090 -n test
# kubectl port-forward svc/gateway-svc 8081:8080 -n test
# kubectl port-forward svc/frontend-svc 4200:80 -n test
# kubectl exec -it $(kubectl get pods -n test -l app=postgres -o jsonpath='{.items[0].metadata.name}') -n test -- psql -U program -d idp -c "SELECT * FROM users;"
# kubectl logs -f -l app=kafka -n test
# kubectl logs -f -l app=stats -n test